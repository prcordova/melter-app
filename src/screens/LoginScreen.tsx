import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AxiosError } from 'axios';
import { showToast } from '../components/CustomToast';

export function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // 2FA State
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await login(
        formData.username,
        formData.password,
        requires2FA ? twoFactorCode : undefined,
        tempToken || undefined
      );

      // Se requer 2FA, mostrar campo de código
      if (result?.requires2FA && result?.tempToken) {
        setRequires2FA(true);
        setTempToken(result.tempToken);
        setError('');
        setLoading(false);
        return;
      }

      // Login bem-sucedido
      // A navegação será tratada automaticamente pelo AuthContext
    } catch (error) {
      const err = error as AxiosError<{ message: string; requiresVerification?: boolean; email?: string }>;
      console.error('[LOGIN] Erro no login:', err);

      if (err.response?.data?.requiresVerification && err.response?.data?.email) {
        const userEmail = err.response.data.email;
        showToast.info('Verificação Necessária', 'Você precisa verificar seu e-mail antes de fazer login.');
        setTimeout(() => {
          (navigation as any).navigate('VerifyEmail', { email: userEmail });
        }, 1500);
      } else {
        setError(err.response?.data?.message || 'Erro ao fazer login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setRequires2FA(false);
    setTempToken(null);
    setTwoFactorCode('');
    setError('');
  };

  const isFormValid = formData.username.length >= 3 && formData.password.length >= 6;

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
          {/* Formulário de Login Centralizado */}
          <View style={styles.formContainer}>
            <View style={styles.formCard}>
              {/* Logo/Título */}
              <Text style={styles.logo}>Melter</Text>
              <Text style={styles.formTitle}>Bem Vindo!</Text>

              {/* Mensagem de erro */}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {requires2FA ? (
                // Formulário de 2FA
                <View style={styles.form}>
                  <View style={styles.twoFactorHeader}>
                    <Text style={styles.twoFactorTitle}>Verificação 2FA</Text>
                    <Text style={styles.twoFactorDescription}>
                      Digite o código do seu app autenticador
                    </Text>
                  </View>

                  <Input
                    label="Código de 6 dígitos"
                    value={twoFactorCode}
                    onChangeText={(text) => setTwoFactorCode(text.replace(/\D/g, ''))}
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={Boolean(!loading)}
                    style={styles.twoFactorInput}
                  />

                  <Button
                    onPress={handleSubmit}
                    loading={Boolean(loading)}
                    disabled={Boolean(twoFactorCode.length !== 6 || loading)}
                    style={styles.submitButton}
                  >
                    Verificar
                  </Button>

                  <Button
                    onPress={handleBack}
                    variant="outline"
                    disabled={Boolean(loading)}
                    style={styles.backButton}
                  >
                    Voltar
                  </Button>
                </View>
              ) : (
                // Formulário de login normal
                <View style={styles.form}>
                  <Input
                    label="Nome de usuário"
                    value={formData.username}
                    onChangeText={(text) =>
                      setFormData((prev) => ({ ...prev, username: text }))
                    }
                    placeholder="Digite seu usuário"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={Boolean(!loading)}
                  />

                  <Input
                    label="Senha"
                    value={formData.password}
                    onChangeText={(text) =>
                      setFormData((prev) => ({ ...prev, password: text }))
                    }
                    placeholder="Digite sua senha"
                    secureTextEntry={Boolean(!showPassword)}
                    autoCapitalize="none"
                    editable={Boolean(!loading)}
                    rightIcon={
                      <Text style={styles.eyeIcon}>
                        {showPassword ? 'Ocultar' : 'Mostrar'}
                      </Text>
                    }
                    onRightIconPress={() => setShowPassword(!showPassword)}
                  />

                  <Button
                    onPress={handleSubmit}
                    loading={Boolean(loading)}
                    disabled={Boolean(!isFormValid || loading)}
                    style={styles.submitButton}
                  >
                    Acessar
                  </Button>

                  <TouchableOpacity 
                    style={styles.forgotPassword}
                    onPress={() => (navigation as any).navigate('ForgotPassword')}
                  >
                    <Text style={styles.forgotPasswordText}>
                      Recuperar senha?
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Link para cadastro */}
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Não tem uma conta? </Text>
                <TouchableOpacity onPress={() => (navigation as any).navigate('Register')}>
                  <Text style={styles.signupLink}>Cadastre-se</Text>
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
    justifyContent: 'center',
    paddingVertical: 40,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
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
    marginBottom: 32,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    gap: 8,
  },
  twoFactorHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  twoFactorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  twoFactorDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  twoFactorInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  submitButton: {
    marginTop: 8,
  },
  backButton: {
    marginTop: 8,
  },
  eyeIcon: {
    fontSize: 12,
    color: '#d946ef',
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#d946ef',
    fontSize: 14,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  signupText: {
    color: '#64748b',
    fontSize: 14,
  },
  signupLink: {
    color: '#d946ef',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

