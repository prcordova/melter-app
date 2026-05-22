import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';

// Criar instância do axios
export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  // Garantir que headers customizados não sejam removidos
  validateStatus: (status) => status < 500, // Não lançar erro para 4xx
  // CRÍTICO: Configurações para React Native com HTTPS cross-origin
  // Garantir que headers sejam enviados corretamente
  withCredentials: false, // Não usar credentials em requisições cross-origin
  maxRedirects: 5, // Permitir redirecionamentos
});

// Interceptor para adicionar token nas requisições
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      // CRÍTICO: No React Native com HTTPS cross-origin, precisamos definir o header
      // usando múltiplas abordagens para garantir que seja enviado
      const authHeader = `Bearer ${token}`;
      
      // Método 1: Usar .set() (padrão do axios)
      config.headers.set('Authorization', authHeader);
      config.headers.set('authorization', authHeader);
      
      // Método 2: Definir como propriedade direta (fallback para React Native)
      // Isso é necessário porque o React Native pode não enviar headers definidos com .set()
      (config.headers as any)['Authorization'] = authHeader;
      (config.headers as any)['authorization'] = authHeader;
      
      // Método 3: Usar common headers (axios padrão)
      if (config.headers.common) {
        (config.headers.common as any)['Authorization'] = authHeader;
        (config.headers.common as any)['authorization'] = authHeader;
      }
      
      // Método 4: Enviar também como X-Auth-Token (header customizado que não é bloqueado)
      // O React Native pode bloquear o header Authorization em requisições HTTPS cross-origin
      config.headers.set('X-Auth-Token', token);
      config.headers.set('x-auth-token', token);
      (config.headers as any)['X-Auth-Token'] = token;
      (config.headers as any)['x-auth-token'] = token;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    if (__DEV__) {
      console.error(`[API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response?.status, error.response?.data || error.message);
      
      // Log detalhado do header enviado
      if (error.config?.headers) {
        const authHeader = error.config.headers.Authorization || error.config.headers.authorization;
        console.error(`[API ERROR] Header Authorization enviado:`, authHeader ? `${authHeader.substring(0, 30)}...` : 'NÃO ENVIADO');
      }
    }
    
    if (error.response?.status === 401) {
      const errorCode = (error.response?.data as any)?.code;
      const errorMessage = (error.response?.data as any)?.message;
      
      // Não limpar token se for TOKEN_VERSION_MISMATCH
      if (errorCode === 'TOKEN_VERSION_MISMATCH') {
        console.warn('[API] Token version mismatch');
        return Promise.reject(error);
      }
      
      // NÃO remover token imediatamente - pode ser problema temporário
      // Só remover se for erro explícito de token inválido/expirado
      // ou se for rota de auth (login falhou)
      if (error.config?.url && error.config.url.includes('/auth/')) {
        // Login/logout - pode remover token
        if (__DEV__) {
          console.warn('[API] Erro 401 em rota de auth - removendo token');
        }
        await AsyncStorage.removeItem('token');
      } else {
        // Para outras rotas, não remover token imediatamente
        // Pode ser problema de CORS, rede, ou header não chegando
        if (__DEV__) {
          console.warn('[API] Erro 401 em rota protegida - mantendo token (pode ser problema de rede/CORS)');
          console.warn('[API] Mensagem do servidor:', errorMessage);
        }
      }
    }
    return Promise.reject(error);
  }
);

