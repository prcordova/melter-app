import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { authApi, userApi } from '../services/api';
import { getBiometricLoginEnabled } from '../services/biometricLogin';
import { User } from '../types';

interface LoginResult {
  requires2FA?: boolean;
  requiresCancelDeletion?: boolean;
  tempToken?: string;
  deletionScheduledAt?: string | null;
  success?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** True após restaurar sessão com token e login biométrico ativo — mostrar modal até desbloquear. */
  biometricUnlockRequired: boolean;
  clearBiometricUnlockRequirement: () => void;
  login: (username: string, password: string, twoFactorCode?: string, tempToken?: string) => Promise<LoginResult | undefined>;
  confirmCancelDeletionLogin: (tempToken: string) => Promise<LoginResult | undefined>;
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
  const [biometricUnlockRequired, setBiometricUnlockRequired] = useState(false);

  const clearBiometricUnlockRequirement = () => {
    setBiometricUnlockRequired(false);
  };

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
        return;
      }

      await AsyncStorage.multiRemove(['token', USER_CACHE_KEY]);
      setUser(null);
    } catch (error: any) {
      console.error('Erro ao recarregar usuário:', error);
      const code = error?.response?.data?.code;
      if (code === 'TOKEN_VERSION_MISMATCH') {
        return;
      }
      if (error?.response?.status === 401) {
        await AsyncStorage.multiRemove(['token', USER_CACHE_KEY]);
        setUser(null);
      }
    }
  };

  // Carregar usuário ao iniciar app
  useEffect(() => {
    const loadUser = async () => {
      let cachedUser: User | null = null;

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
              cachedUser = parsed;
            }
          } catch {
            await AsyncStorage.removeItem(USER_CACHE_KEY);
          }
        }

        try {
          const response = await userApi.getMyProfile();

          if (response?.success && response.data) {
            const userData = mapApiToUser(response.data);
            setUser(userData);
            await persistUserCache(userData);
            try {
              if (await getBiometricLoginEnabled()) {
                setBiometricUnlockRequired(true);
              }
            } catch {
              /* ignore */
            }
            return;
          }

          // Resposta 200 com success false = sessão inválida (ex.: token expirado sem throw)
          await AsyncStorage.multiRemove(['token', USER_CACHE_KEY]);
          setUser(null);
        } catch (error: any) {
          console.error('Erro ao carregar usuário:', error);
          const errorCode = error?.response?.data?.code;
          const status = error?.response?.status;

          if (errorCode === 'TOKEN_VERSION_MISMATCH') {
            // Mesma regra da API: não apagar token aqui; usuário precisa novo login / fluxo dedicado
            setUser(null);
            return;
          }

          if (status === 401) {
            await AsyncStorage.multiRemove(['token', USER_CACHE_KEY]);
            setUser(null);
            return;
          }

          // Sem resposta (rede/timeout): não “deslogar” à toa — usa cache se existir
          if (!error?.response && cachedUser) {
            setUser(cachedUser);
            return;
          }

          if (status && status >= 500 && cachedUser) {
            setUser(cachedUser);
            return;
          }

          await AsyncStorage.multiRemove(['token', USER_CACHE_KEY]);
          setUser(null);
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        setUser(null);
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

      if (response.requiresCancelDeletion && response.tempToken) {
        return {
          requiresCancelDeletion: true,
          tempToken: response.tempToken,
          deletionScheduledAt: response.deletionScheduledAt ?? null,
        };
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
        setBiometricUnlockRequired(false);

        return { success: true };
      }
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const confirmCancelDeletionLogin = async (cancelTempToken: string): Promise<LoginResult | undefined> => {
    try {
      const response = await authApi.confirmCancelDeletion(cancelTempToken);
      if (response.requires2FA && response.tempToken) {
        return { requires2FA: true, tempToken: response.tempToken };
      }
      const token = (response as any).data?.token || (response as any).token;
      if (response.success && token) {
        await AsyncStorage.setItem('token', token);
        const userData = (response as any).data?.user || (response as any).user;
        if (!userData) throw new Error('Dados do usuário não encontrados');
        const nextUser: User = {
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
        setUser(nextUser);
        await persistUserCache(nextUser);
        setBiometricUnlockRequired(false);
        return { success: true };
      }
      throw new Error((response as any).message || 'Não foi possível cancelar a exclusão');
    } catch (error) {
      console.error('Erro ao confirmar cancelamento de exclusão:', error);
      throw error;
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', USER_CACHE_KEY]);
    setBiometricUnlockRequired(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        biometricUnlockRequired,
        clearBiometricUnlockRequirement,
        login,
        confirmCancelDeletionLogin,
        logout,
        refreshUser,
      }}
    >
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

