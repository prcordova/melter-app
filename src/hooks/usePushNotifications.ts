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
    console.log('[PushNotifications] ✅ Canal "messages" criado com sucesso (HIGH importance)');
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
      
      console.log('[PushNotifications] 📬 Notificação recebida no APP (foreground):', {
        type: notification.request.content.data?.type,
        title: notification.request.content.title,
        body: notification.request.content.body,
        channelId: channelId,
        identifier: notification.request.identifier,
      });
      
      // Se for notificação de mensagem, podemos atualizar o estado aqui
      if (notification.request.content.data?.type === 'MESSAGE') {
        console.log('[PushNotifications] ✅ Notificação de mensagem recebida - atualizando contador');
        // O NotificationContext já vai buscar as notificações
        // Mas podemos adicionar lógica específica aqui se necessário
      }
    });
    
    console.log('[PushNotifications] ✅ Listener de notificações configurado');

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
      console.log('[PushNotifications] Permissões atuais:', {
        status: permissions.status,
        android: permissions.granted ? 'SIM' : 'NÃO',
        ios: permissions.ios?.status || 'N/A',
      });
      
      let finalStatus = permissions.status;

      if (permissions.status !== 'granted') {
        console.log('[PushNotifications] Solicitando permissões...');
        const requestResult = await Notifications.requestPermissionsAsync();
        finalStatus = requestResult.status;
        console.log('[PushNotifications] Resultado da solicitação:', {
          status: requestResult.status,
          android: requestResult.granted ? 'SIM' : 'NÃO',
        });
      }

      if (finalStatus !== 'granted') {
        console.warn('[PushNotifications] ❌ Permissão de notificação negada - status:', finalStatus);
        console.warn('[PushNotifications] ⚠️ AS NOTIFICAÇÕES VISUAIS NÃO FUNCIONARÃO SEM PERMISSÃO!');
        return;
      }
      
      console.log('[PushNotifications] ✅ Permissão de notificação concedida');

      // Obter token do Expo Push
      // O projectId é obtido automaticamente do app.json ou Constants
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || undefined;
      
      console.log(`[PushNotifications] Obtendo token - projectId: ${projectId || 'não configurado'}`);
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      console.log(`[PushNotifications] Token obtido: ${token.data.substring(0, 20)}... (token completo: ${token.data})`);

      // Enviar token para o backend
      try {
        const response = await api.post('/api/users/push-token', {
          pushToken: token.data,
          platform: Platform.OS,
        });
        console.log('[PushNotifications] Token registrado com sucesso no backend');
      } catch (error: any) {
        console.error('[PushNotifications] Erro ao enviar token:', error?.response?.data || error?.message);
      }
    } catch (error) {
      console.error('[PushNotifications] Erro ao registrar:', error);
    }
  }
}

