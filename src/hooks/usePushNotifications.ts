import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

// Configurar como as notificações devem ser tratadas quando recebidas
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Configurar canal de notificação para Android (som baixinho estilo messenger)
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('messages', {
    name: 'Mensagens',
    description: 'Notificações de mensagens',
    importance: Notifications.AndroidImportance.LOW, // Som baixinho (LOW = mais discreto)
    sound: 'default', // Som padrão do sistema
    vibrationPattern: [0, 200], // Vibração curta e suave
    showBadge: true,
    enableLights: false, // Não acender LED
    enableVibrate: true,
  });
  
  // Canal padrão também com som baixo
  Notifications.setNotificationChannelAsync('default', {
    name: 'Padrão',
    description: 'Notificações gerais',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    showBadge: true,
  });
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
      console.log('[PushNotifications] Notificação recebida:', notification);
      
      // Se for notificação de mensagem, podemos atualizar o estado aqui
      if (notification.request.content.data?.type === 'MESSAGE') {
        // O NotificationContext já vai buscar as notificações
        // Mas podemos adicionar lógica específica aqui se necessário
      }
    });

    // Listener para quando o usuário toca na notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[PushNotifications] Notificação tocada:', response);
      
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
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[PushNotifications] Permissão de notificação negada');
        return;
      }

      // Obter token do Expo Push
      // O projectId é obtido automaticamente do app.json ou Constants
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || undefined,
      });

      console.log('[PushNotifications] Token registrado:', token.data);

      // Enviar token para o backend
      try {
        await api.post('/api/users/push-token', {
          pushToken: token.data,
          platform: Platform.OS,
        });
        console.log('[PushNotifications] Token enviado para o backend');
      } catch (error) {
        console.error('[PushNotifications] Erro ao enviar token:', error);
      }
    } catch (error) {
      console.error('[PushNotifications] Erro ao registrar:', error);
    }
  }
}

