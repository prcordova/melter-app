import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { BackButton } from '../components/BackButton';
import { authApi } from '../services/api';
import { showToast } from '../components/CustomToast';
import { AxiosError } from 'axios';
import { COLORS } from '../theme/colors';

type Step = 'email' | 'token' | 'password';

export function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tokenValidated, setTokenValidated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendToken = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email || !email.includes('@')) {
      setError('Digite um e-mail válido');
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.forgotPassword(email);
      setSuccess(response.message || 'Se o e-mail estiver cadastrado, você receberá um token de recuperação.');
      setTokenValidated(false);
      setStep('token');
    } catch (error) {
      const err = error as AxiosError<{ message: string }>;
      setError(err.response?.data?.message || 'Erro ao enviar token');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    if (!token || token.length !== 6) {
      setError('Digite o token de 6 dígitos');
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.verifyResetToken(email, token);
      if (response.data?.valid) {
        setSuccess('Token válido! Agora você pode criar uma nova senha.');
        setTokenValidated(true);
        setStep('password');
      } else {
        setError('Token inválido');
      }
    } catch (error) {
      const err = error as AxiosError<{ message: string }>;
      setError(err.response?.data?.message || 'Token inválido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setSuccess('');

    if (!tokenValidated) {
      setError('Token não foi validado. Volte para a etapa anterior.');
      setStep('token');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.resetPassword(email, token, newPassword);
      setSuccess(response.message || 'Senha alterada com sucesso!');

      Alert.alert(
        'Sucesso',
        'Sua senha foi alterada com sucesso! Você será redirecionado para o login.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      const err = error as AxiosError<{ message: string }>;
      setError(err.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'token') {
      setStep('email');
      setToken('');
      setError('');
      setSuccess('');
    } else if (step === 'password') {
      setStep('token');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
    } else {
      navigation.goBack();
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
            <BackButton title="Login" onPress={handleBack} />
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formCard}>
              <Text style={styles.logo}>Melter</Text>
              <Text style={styles.formTitle}>Recuperar Senha</Text>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {success && (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>{success}</Text>
                </View>
              )}

              {step === 'email' && (
                <View style={styles.form}>
                  <Text style={styles.stepDescription}>
                    Digite seu e-mail para receber um token de recuperação
                  </Text>

                  <Input
                    label="E-mail"
                    value={email}
                    onChangeText={(text) => setEmail(text.toLowerCase())}
                    placeholder="Digite seu e-mail"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />

                  <Button
                    onPress={handleSendToken}
                    loading={loading}
                    disabled={!email || !email.includes('@') || loading}
                    style={styles.submitButton}
                  >
                    Enviar Token
                  </Button>
                </View>
              )}

              {step === 'token' && (
                <View style={styles.form}>
                  <Text style={styles.stepDescription}>
                    Digite o token de 6 dígitos enviado para seu e-mail
                  </Text>

                  <Input
                    label="Token"
                    value={token}
                    onChangeText={(text) => setToken(text.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                    style={styles.tokenInput}
                  />

                  <Button
                    onPress={handleVerifyToken}
                    loading={loading}
                    disabled={token.length !== 6 || loading}
                    style={styles.submitButton}
                  >
                    Verificar Token
                  </Button>

                  <TouchableOpacity
                    onPress={() => {
                      setStep('email');
                      setToken('');
                      setError('');
                      setSuccess('');
                    }}
                    style={styles.backLink}
                  >
                    <Text style={styles.backLinkText}>Reenviar token</Text>
                  </TouchableOpacity>
                </View>
              )}

              {step === 'password' && (
                <View style={styles.form}>
                  <Text style={styles.stepDescription}>
                    Crie uma nova senha para sua conta
                  </Text>

                  <Input
                    label="Nova senha"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Mínimo 6 caracteres"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    rightIcon={
                      <Text style={styles.eyeIcon}>
                        {showPassword ? 'Ocultar' : 'Mostrar'}
                      </Text>
                    }
                    onRightIconPress={() => setShowPassword(!showPassword)}
                  />

                  <Input
                    label="Confirmar senha"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Digite a senha novamente"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    rightIcon={
                      <Text style={styles.eyeIcon}>
                        {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                      </Text>
                    }
                    onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />

                  <Button
                    onPress={handleResetPassword}
                    loading={loading}
                    disabled={
                      newPassword.length < 6 ||
                      newPassword !== confirmPassword ||
                      loading
                    }
                    style={styles.submitButton}
                  >
                    Alterar Senha
                  </Button>
                </View>
              )}

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Lembrou sua senha? </Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
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
  successContainer: {
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#065f46',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
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
  eyeIcon: {
    fontSize: 12,
    color: '#d946ef',
    fontWeight: '600',
  },
  backLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  backLinkText: {
    color: COLORS.secondary.main,
    fontSize: 14,
    fontWeight: '500',
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

