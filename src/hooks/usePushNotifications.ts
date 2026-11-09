import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { APP_RELEASE_PUSH_TYPE } from '../config/app/api-paths';
import { USERS_API } from '../config/users/api-paths';
import { api } from '../services/api';
import { devLog, devWarn } from '../config/dev-logs';
import {
  isNotificationSoundCategoryEnabled,
  resolveNotificationSoundCategory,
} from '../lib/notification-sounds';

/** Ref opcional injetada pelo provider para evitar dependência circular */
let refreshUnreadMessagesRef: (() => void) | null = null;

export function registerUnreadMessagesRefresh(fn: () => void) {
  refreshUnreadMessagesRef = fn;
}

// Em foreground o utilizador já está na app — não mostrar popup/banner/som (push só “fora” da app).
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isForeground = AppState.currentState === 'active';
    const silent = isForeground;
    const type = String(notification.request.content.data?.type ?? '');
    const category = resolveNotificationSoundCategory(type);
    const soundAllowed = isNotificationSoundCategoryEnabled(category);
    return {
      shouldShowAlert: !silent,
      shouldPlaySound: !silent && soundAllowed,
      shouldSetBadge: true,
      shouldShowBanner: !silent,
      shouldShowList: !silent,
    };
  },
});

// Configurar canais de notificação para Android (deve ser feito antes de usar)
// Executado uma vez quando o módulo é carregado
// Expo Go no Android não tem push desde o SDK 55: criar canal lança NullPointerException nativo.
const isAndroidExpoGo = Platform.OS === 'android' && isRunningInExpoGo();

if (Platform.OS === 'android' && !isAndroidExpoGo) {
  // Canal de mensagens com alta importância para garantir som e visibilidade
  Notifications.setNotificationChannelAsync('messages', {
    name: 'Mensagens',
    description: 'Notificações de mensagens - toca som e vibra',
    importance: Notifications.AndroidImportance.HIGH, // HIGH = som, vibração e banner visível
    sound: 'default', // Som padrão do sistema
    vibrationPattern: [0, 250, 250, 250], // Vibração perceptível
    showBadge: true,
    enableLights: true, // LED opcional
    enableVibrate: true,
  })
  .then(() => {
    devLog('[PushNotifications] Canal "messages" criado (HIGH importance)');
  })
  .catch(err => {
    console.error('[PushNotifications] ❌ Erro ao criar canal messages:', err);
  });
  
  // Canal padrão também configurado
  Notifications.setNotificationChannelAsync('default', {
    name: 'Padrão',
    description: 'Notificações gerais',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    showBadge: true,
  }).catch(err => console.error('[PushNotifications] Erro ao criar canal default:', err));
}

/** Evita navegar duas vezes pelo mesmo toque (listener + cold start, ou remount após login). */
const handledResponseIds = new Set<string>();

let registeredPushToken: string | null = null;
let pushPreviewHidden = false;

async function postPushToken(pushToken: string) {
  await api.post(USERS_API.me.pushToken, {
    pushToken,
    platform: Platform.OS,
    hidePreview: pushPreviewHidden,
  });
}

/** Bloqueio biométrico ativo → servidor envia push sem remetente/conteúdo. */
export function setPushPreviewHidden(hidden: boolean) {
  if (pushPreviewHidden === hidden) return;
  pushPreviewHidden = hidden;
  if (registeredPushToken) {
    postPushToken(registeredPushToken).catch((error) => {
      console.error('[PushNotifications] Erro ao atualizar privacidade do push:', error?.message);
    });
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!user) return;

    // Registrar token de push quando usuário faz login
    registerForPushNotificationsAsync();

    // Listener para notificações recebidas quando o app está em foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      // Access channelId safely - Android properties are in request.trigger or content.data
      const channelId = (notification.request.content.data as any)?.channelId || 'não definido';
      
      devLog('[PushNotifications] Notificação em foreground:', {
        type: notification.request.content.data?.type,
        title: notification.request.content.title,
        channelId,
      });
      
      // Se for notificação de mensagem, podemos atualizar o estado aqui
      if (notification.request.content.data?.type === 'MESSAGE') {
        refreshUnreadMessagesRef?.();
      }
    });
    
    devLog('[PushNotifications] Listener configurado');

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const requestId = response.notification.request.identifier;
      if (handledResponseIds.has(requestId)) return;
      handledResponseIds.add(requestId);
      const data = response.notification.request.content.data;

      if (data?.type === APP_RELEASE_PUSH_TYPE) {
        navigation.navigate('Main', {
          screen: 'ProfileStack',
          params: { screen: 'AppReleaseNotes', params: { noteId: data.noteId } },
        });
        return;
      }

      // Navegar para a tela apropriada baseado no tipo
      if (data?.type === 'MESSAGE' && data?.userId) {
        // TODO: Navegar para a conversa
        // navigation.navigate('Chat', { userId: data.userId, username: data.username });
      }
    };

    // Listener para quando o usuário toca na notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleResponse);

    // App aberto pelo toque no push (cold start): o listener acima ainda não existia.
    if (!isAndroidExpoGo) {
      void Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response) handleResponse(response);
        })
        .catch(() => {});
    }

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user, navigation]);

  async function registerForPushNotificationsAsync() {
    // Expo Go (Android) lança erro ao pedir token de push desde o SDK 55; push só em build próprio.
    if (isAndroidExpoGo) {
      devLog('[PushNotifications] Expo Go no Android: registro de push ignorado');
      return;
    }
    try {
      // Verificar permissões
      const permissions = await Notifications.getPermissionsAsync();
      devLog('[PushNotifications] Permissões:', permissions.status);
      
      let finalStatus = permissions.status;

      if (permissions.status !== 'granted') {
        devLog('[PushNotifications] Solicitando permissões...');
        const requestResult = await Notifications.requestPermissionsAsync();
        finalStatus = requestResult.status;
        devLog('[PushNotifications] Resultado:', requestResult.status);
      }

      if (finalStatus !== 'granted') {
        devWarn('[PushNotifications] Permissão negada:', finalStatus);
        return;
      }
      
      devLog('[PushNotifications] Permissão concedida');

      const projectId = Constants.expoConfig?.extra?.eas?.projectId || undefined;
      devLog(`[PushNotifications] Obtendo token (projectId: ${projectId ?? 'n/a'})`);

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      devLog(`[PushNotifications] Token obtido: ${token.data.substring(0, 24)}...`);

      try {
        registeredPushToken = token.data;
        await postPushToken(token.data);
        devLog('[PushNotifications] Token registrado no backend');
      } catch (error: any) {
        console.error('[PushNotifications] Erro ao enviar token:', error?.response?.data || error?.message);
      }
    } catch (error) {
      console.error('[PushNotifications] Erro ao registrar:', error);
    }
  }
}

