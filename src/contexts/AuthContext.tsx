import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { authApi, userApi } from '../services/api';
import { User } from '../types';

interface LoginResult {
  requires2FA?: boolean;
  tempToken?: string;
  success?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, twoFactorCode?: string, tempToken?: string) => Promise<LoginResult | undefined>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_CACHE_KEY = '@melter_auth_user_cache_v1';

function mapApiToUser(data: any): User {
  return {
    id: data._id || data.id,
    username: data.username,
    email: data.email,
    avatar: data.avatar,
    following: Array.isArray(data.following) ? data.following : [],
    plan: data.plan,
    accountType: data.accountType,
    twoFactor: data.twoFactor,
    verifiedBadge: data.verifiedBadge,
    wallet: data.wallet,
    termsAndPrivacy: data.termsAndPrivacy,
  };
}

async function persistUserCache(u: User) {
  try {
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Recarregar dados do usuário
  const refreshUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await userApi.getMyProfile();
      if (response.success && response.data) {
        const userData = mapApiToUser(response.data);
        setUser(userData);
        await persistUserCache(userData);
      }
    } catch (error) {
      console.error('Erro ao recarregar usuário:', error);
    }
  };

  // Carregar usuário ao iniciar app
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        
        if (!token) {
          setLoading(false);
          return;
        }

        const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as User;
            if (parsed?.id && parsed?.username) {
              setUser(parsed);
              setLoading(false);
            }
          } catch {
            await AsyncStorage.removeItem(USER_CACHE_KEY);
          }
        }

        const response = await userApi.getMyProfile();

        if (response.success && response.data) {
          const userData = mapApiToUser(response.data);
          setUser(userData);
          await persistUserCache(userData);
        }
      } catch (error: any) {
        console.error('Erro ao carregar usuário:', error);
        const errorCode = error?.response?.data?.code;
        if (errorCode !== 'TOKEN_VERSION_MISMATCH') {
          await AsyncStorage.removeItem('token');
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    const refreshIfAuthenticated = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      await refreshUser();
    };

    const intervalId = setInterval(refreshIfAuthenticated, 5 * 60 * 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshIfAuthenticated();
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [user]);

  const login = async (
    username: string,
    password: string,
    twoFactorCode?: string,
    tempToken?: string
  ): Promise<LoginResult | undefined> => {
    try {
      // Remover token antigo e cache de sessão anterior
      await AsyncStorage.multiRemove(['token', USER_CACHE_KEY]);

      let response: any;

      // Se tem tempToken e código 2FA, completar login com 2FA
      if (tempToken && twoFactorCode) {
        response = await authApi.login2FA(tempToken, twoFactorCode);
      } else {
        // Login normal
        response = await authApi.login(username, password);
      }
      
      // Verificar se requer 2FA
      if (response.requires2FA && response.tempToken) {
        return { requires2FA: true, tempToken: response.tempToken };
      }
      
      // Verificar estrutura da resposta - token pode estar em response.token ou response.data.token
      const token = response.data?.token || response.token;
      
      if (response.success && (response.data || token)) {
        if (!token) {
          throw new Error('Token não encontrado na resposta do servidor');
        }
        
        await AsyncStorage.setItem('token', token);
        
        const userData = response.data?.user || response.user;
        
        if (!userData) {
          throw new Error('Dados do usuário não encontrados na resposta');
        }
        
        const user: User = {
          id: userData.id || userData._id,
          username: userData.username,
          email: userData.email,
          avatar: userData.avatar,
          following: userData.following,
          plan: userData.plan,
          accountType: userData.accountType,
          twoFactor: userData.twoFactor,
          verifiedBadge: userData.verifiedBadge,
          wallet: userData.wallet,
        };
        setUser(user);
        await persistUserCache(user);

        return { success: true };
      }
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', USER_CACHE_KEY]);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

