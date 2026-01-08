import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { BackButton } from '../components/BackButton';
import { authApi } from '../services/api';
import { showToast } from '../components/CustomToast';
import { AxiosError } from 'axios';
import { COLORS } from '../theme/colors';

type AuthStackParamList = {
  VerifyEmail: {
    email?: string;
  };
};

export function VerifyEmailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AuthStackParamList, 'VerifyEmail'>>();
  const [email, setEmail] = useState(route.params?.email || '');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [remainingTime, setRemainingTime] = useState(0);

  // Contador para reenvio
  useEffect(() => {
    if (remainingTime > 0) {
      const timer = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [remainingTime]);

  const handleVerify = async () => {
    if (!email || !email.includes('@')) {
      showToast.error('Erro', 'Digite um e-mail válido');
      return;
    }

    if (!token || token.length !== 6) {
      showToast.error('Erro', 'Digite o token de 6 dígitos');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.verifyEmail(email, token);

      if (response.success) {
        showToast.success('Sucesso', response.message || 'E-mail verificado com sucesso!');
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          navigation.navigate('Login' as never);
        }, 2000);
      }
    } catch (error) {
      const err = error as AxiosError<{ message: string }>;
      showToast.error('Erro', err.response?.data?.message || 'Token inválido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || !email.includes('@')) {
      showToast.error('Erro', 'Digite um e-mail válido');
      return;
    }

    if (!canResend) {
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;
      showToast.error(
        'Aguarde',
        `Aguarde ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} para reenviar`
      );
      return;
    }

    setResendLoading(true);

    try {
      const response = await authApi.resendVerification(email);

      if (response.success) {
        showToast.success('Sucesso', response.message || 'Novo código enviado para seu e-mail');
        
        // Bloquear reenvio por 30 segundos
        setCanResend(false);
        setRemainingTime(30);
      }
    } catch (error) {
      const err = error as AxiosError<{ message: string; retryAfter?: number }>;
      
      // Se houver rate limit, usar o tempo retornado
      if (err.response?.status === 429 && err.response?.data?.retryAfter) {
        const retryAfter = err.response.data.retryAfter;
        setRemainingTime(retryAfter);
        setCanResend(false);
        const minutes = Math.floor(retryAfter / 60);
        const seconds = retryAfter % 60;
        showToast.error(
          'Aguarde',
          `Aguarde ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} para reenviar`
        );
      } else {
        showToast.error('Erro', err.response?.data?.message || 'Erro ao reenviar código');
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContainer}>
          <View style={styles.header}>
            <BackButton title="Voltar" />
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formCard}>
              <Text style={styles.logo}>Melter</Text>
              <Text style={styles.formTitle}>Verificar E-mail</Text>

              <Text style={styles.description}>
                {loading && token.length === 6
                  ? 'Verificando seu e-mail...'
                  : 'Digite o código de 6 dígitos enviado para seu e-mail'}
              </Text>

              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  <Text style={styles.infoBold}>Importante:</Text> Verifique sua caixa de entrada e spam. O código é válido por 24 horas.
                </Text>
              </View>

              <View style={styles.form}>
                <Input
                  label="E-mail"
                  value={email}
                  onChangeText={(text) => setEmail(text.toLowerCase())}
                  placeholder="Digite seu e-mail"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading && !route.params?.email}
                />

                <Input
                  label="Código de verificação"
                  value={token}
                  onChangeText={(text) => setToken(text.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                  style={styles.tokenInput}
                  autoFocus
                />

                <Button
                  onPress={handleVerify}
                  loading={loading}
                  disabled={token.length !== 6 || !email || !email.includes('@') || loading}
                  style={styles.submitButton}
                >
                  Verificar E-mail
                </Button>

                <Button
                  variant="outline"
                  onPress={handleResend}
                  loading={resendLoading}
                  disabled={resendLoading || loading || !canResend || !email || !email.includes('@')}
                  style={styles.resendButton}
                >
                  {!canResend && remainingTime > 0
                    ? `Reenviar em ${Math.floor(remainingTime / 60).toString().padStart(2, '0')}:${(remainingTime % 60).toString().padStart(2, '0')}`
                    : 'Reenviar Código'}
                </Button>
              </View>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Já verificou? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
                  <Text style={styles.loginLink}>Fazer login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 40,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 16,
  },
  formContainer: {
    width: '100%',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#d946ef',
    textAlign: 'center',
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoContainer: {
    backgroundColor: COLORS.primary.light + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  form: {
    gap: 16,
  },
  tokenInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 8,
  },
  resendButton: {
    marginTop: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  loginText: {
    color: '#64748b',
    fontSize: 14,
  },
  loginLink: {
    color: '#d946ef',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

