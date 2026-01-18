import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { API_CONFIG } from '../config/api.config';

export function useSocketIO() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      return;
    }

    console.log('[Socket.IO] Inicializando conexão...');

    const initSocket = async () => {
      try {
        // Obter token do AsyncStorage
        const token = await AsyncStorage.getItem('token');

        if (!token) {
          console.warn('[Socket.IO] Token não encontrado - não será possível conectar');
          return;
        }

        // Criar conexão Socket.IO
        const socketUrl = API_CONFIG.BASE_URL.replace(/\/$/, ''); // Remover barra final se existir
        
        const newSocket = io(socketUrl, {
          auth: {
            token: token,
          },
          transports: ['websocket', 'polling'],
          path: '/socket.io/',
        });

        socketRef.current = newSocket;

        // Eventos de conexão
        newSocket.on('connect', () => {
          console.log('[Socket.IO] ✅ Conectado ao servidor');
          setIsConnected(true);
          setSocket(newSocket);
        });

        newSocket.on('disconnect', () => {
          console.log('[Socket.IO] ❌ Desconectado do servidor');
          setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
          console.error('[Socket.IO] Erro de conexão:', error.message);
          setIsConnected(false);
        });

      } catch (error) {
        console.error('[Socket.IO] Erro ao inicializar:', error);
        setIsConnected(false);
      }
    };

    initSocket();

    // Cleanup
    return () => {
      console.log('[Socket.IO] Desconectando...');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?.id]);

  return {
    socket,
    isConnected,
  };
}

