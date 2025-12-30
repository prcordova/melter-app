import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Recarregar dados do usuário
  const refreshUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await userApi.getMyProfile();
      if (response.success) {
        const userData: User = {
          id: response.data._id || response.data.id,
          username: response.data.username,
          email: response.data.email,
          avatar: response.data.avatar,
          following: response.data.following,
          plan: response.data.plan,
          accountType: response.data.accountType,
          twoFactor: response.data.twoFactor,
          wallet: response.data.wallet,
          termsAndPrivacy: response.data.termsAndPrivacy,
        };
        setUser(userData);
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

        const response = await userApi.getMyProfile();
        
        if (response.success) {
          const userData: User = {
            id: response.data._id || response.data.id,
            username: response.data.username,
            email: response.data.email,
            avatar: response.data.avatar,
            following: response.data.following,
            plan: response.data.plan,
            accountType: response.data.accountType,
            twoFactor: response.data.twoFactor,
            wallet: response.data.wallet,
          };
          setUser(userData);
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

  const login = async (
    username: string,
    password: string,
    twoFactorCode?: string,
    tempToken?: string
  ): Promise<LoginResult | undefined> => {
    try {
      // Remover token antigo
      await AsyncStorage.removeItem('token');

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
      
      if (response.success && response.data) {
        await AsyncStorage.setItem('token', response.data.token);
        
        const userData: User = {
          id: response.data.user.id || response.data.user._id,
          username: response.data.user.username,
          email: response.data.user.email,
          avatar: response.data.user.avatar,
          following: response.data.user.following,
          plan: response.data.user.plan,
          accountType: response.data.user.accountType,
          twoFactor: response.data.user.twoFactor,
          wallet: response.data.user.wallet,
        };
        setUser(userData);

        return { success: true };
      }
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
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

