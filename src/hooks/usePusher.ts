import { useEffect, useRef, useState } from 'react';
import Pusher from 'pusher-js/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { API_CONFIG } from '../config/api.config';

interface PusherMessage {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  type?: 'text' | 'image' | 'document';
  timestamp: string;
  imageUrl?: string;
  documentUrl?: string;
  documentName?: string;
  storyReply?: any;
}

export function usePusher() {
  const { user } = useAuth();
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const [channel, setChannel] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setChannel(null);
      setIsConnected(false);
      channelRef.current = null;
      return;
    }

    console.log('[Pusher] Inicializando conexão Pusher...');

    // Função assíncrona para inicializar Pusher
    const initPusher = async () => {
      try {
        // Obter token do AsyncStorage para autenticação
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          console.warn('[Pusher] Token não encontrado - não será possível autenticar canais privados');
          return;
        }

        const pusher = new Pusher(API_CONFIG.PUSHER_KEY, {
          cluster: API_CONFIG.PUSHER_CLUSTER,
          authorizer: (channel: any) => {
            return {
              authorize: (socketId: string, callback: (error: Error | null, data?: any) => void) => {
                const body = new URLSearchParams({
                  socket_id: socketId,
                  channel_name: channel.name,
                }).toString();

                fetch(`${API_CONFIG.BASE_URL}/api/pusher/auth`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Bearer ${token}`,
                    'X-Auth-Token': token,
                  },
                  body,
                })
                  .then(async (response) => {
                    const data = await response.json();
                    if (!response.ok) {
                      console.error('[Pusher] Falha na autenticação do canal:', response.status, data);
                      callback(new Error(data?.error || `Auth ${response.status}`), data);
                      return;
                    }
                    callback(null, data);
                  })
                  .catch((authError: any) => {
                    console.error('[Pusher] Erro no authorizer customizado:', authError);
                    callback(authError instanceof Error ? authError : new Error('Falha de autenticação Pusher'));
                  });
              },
            };
          },
        });

        pusherRef.current = pusher;

        // Configurar eventos de conexão
        pusher.connection.bind('connected', () => {
          console.log('[Pusher] ✅ Conectado ao Pusher');
          setIsConnected(true);
        });

        pusher.connection.bind('disconnected', () => {
          console.log('[Pusher] ❌ Desconectado do Pusher');
          setIsConnected(false);
        });

        pusher.connection.bind('error', (err: any) => {
          console.error('[Pusher] Erro de conexão:', err);
          setIsConnected(false);
        });

        // Subscrever ao canal privado do usuário
        const channelName = `private-user-${user.id}`;
        console.log(`[Pusher] Subscrevendo ao canal: ${channelName}`);
        
        const channel = pusher.subscribe(channelName);

        channel.bind('pusher:subscription_succeeded', () => {
          console.log(`[Pusher] ✅ Subscrito com sucesso ao canal ${channelName}`);
          channelRef.current = channel; // Atualizar ref para cleanup
          setChannel(channel); // Atualizar estado quando subscrição for bem-sucedida
        });

        channel.bind('pusher:subscription_error', (error: any) => {
          console.error('[Pusher] Erro na subscrição:', error);
          setChannel(null);
        });

        // Se já estiver conectado, definir o canal imediatamente
        if (pusher.connection.state === 'connected') {
          setChannel(channel);
        }
      } catch (error) {
        console.error('[Pusher] Erro ao inicializar:', error);
        setChannel(null);
        setIsConnected(false);
      }
    };

    initPusher();

    // Cleanup
    return () => {
      console.log('[Pusher] Desconectando...');
      // Usar ref para garantir que temos o canal mais recente
      if (channelRef.current) {
        try {
          channelRef.current.unbind_all();
          channelRef.current.unsubscribe();
        } catch (error) {
          console.error('[Pusher] Erro ao fazer cleanup do canal:', error);
        }
        channelRef.current = null;
      }
      
      if (pusherRef.current) {
        try {
          pusherRef.current.disconnect();
        } catch (error) {
          console.error('[Pusher] Erro ao desconectar:', error);
        }
      }
      setChannel(null);
      setIsConnected(false);
    };
  }, [user?.id]);

  return {
    pusher: pusherRef.current,
    channel,
    isConnected,
  };
}

