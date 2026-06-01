import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { devLog, devWarn } from '../config/dev-logs';

/** Ref opcional injetada pelo provider para evitar dependência circular */
let refreshUnreadMessagesRef: (() => void) | null = null;

export function registerUnreadMessagesRefresh(fn: () => void) {
  refreshUnreadMessagesRef = fn;
}

// Em foreground o utilizador já está na app — não mostrar popup/banner/som (push só “fora” da app).
Notifications.setNotificationHandler({
  handleNotification: async () => {
    const isForeground = AppState.currentState === 'active';
    const silent = isForeground;
    return {
      shouldShowAlert: !silent,
      shouldPlaySound: !silent,
      shouldSetBadge: true,
      shouldShowBanner: !silent,
      shouldShowList: !silent,
    };
  },
});

// Configurar canais de notificação para Android (deve ser feito antes de usar)
// Executado uma vez quando o módulo é carregado
if (Platform.OS === 'android') {
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

export function usePushNotifications() {
  const { user } = useAuth();
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

    // Listener para quando o usuário toca na notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      
      // Navegar para a tela apropriada baseado no tipo
      if (data?.type === 'MESSAGE' && data?.userId) {
        // TODO: Navegar para a conversa
        // navigation.navigate('Chat', { userId: data.userId, username: data.username });
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user]);

  async function registerForPushNotificationsAsync() {
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
        await api.post('/api/users/push-token', {
          pushToken: token.data,
          platform: Platform.OS,
        });
        devLog('[PushNotifications] Token registrado no backend');
      } catch (error: any) {
        console.error('[PushNotifications] Erro ao enviar token:', error?.response?.data || error?.message);
      }
    } catch (error) {
      console.error('[PushNotifications] Erro ao registrar:', error);
    }
  }
}

