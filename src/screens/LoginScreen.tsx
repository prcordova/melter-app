import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AxiosError } from 'axios';
import { showToast } from '../components/CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  isBiometricLoginSupported,
  hasBiometricLoginConfigured,
  saveCredentialsWithBiometricConfirmation,
  getCredentialsWithBiometric,
} from '../services/biometricLogin';

export function LoginScreen() {
  const { login, confirmCancelDeletionLogin } = useAuth();
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const [hasBioLogin, setHasBioLogin] = useState(false);
  const [saveWithBiometric, setSaveWithBiometric] = useState(false);
  const [bioLoginLoading, setBioLoginLoading] = useState(false);

  // 2FA State
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const promptCancelDeletion = (token: string, scheduledAt?: string | null) => {
    const dateHint = scheduledAt
      ? `\n\nExclusão prevista para ${new Date(scheduledAt).toLocaleString('pt-BR')}.`
      : '';
    Alert.alert(
      'Conta em período de exclusão',
      `Ao entrar, o pedido de exclusão será cancelado e sua conta volta ao normal.${dateHint}`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Entrar e cancelar exclusão',
          onPress: () => {
            void (async () => {
              try {
                setLoading(true);
                const result = await confirmCancelDeletionLogin(token);
                if (result?.requires2FA && result.tempToken) {
                  setRequires2FA(true);
                  setTempToken(result.tempToken);
                }
              } catch (e) {
                const err = e as AxiosError<{ message?: string; code?: string }>;
                const msg =
                  err.response?.data?.code === 'ACCOUNT_DELETION_EXPIRED'
                    ? err.response.data.message ||
                      'Há um problema com esta conta. Crie uma nova conta utilizando outro e-mail.'
                    : err.response?.data?.message || 'Não foi possível concluir o login.';
                setError(msg);
                showToast.error('Login', msg);
              } finally {
                setLoading(false);
              }
            })();
          },
        },
      ]
    );
  };

  useEffect(() => {
    (async () => {
      setCanUseBiometric(await isBiometricLoginSupported());
    })();
  }, []);

  const refreshBioConfigured = useCallback(async () => {
    setHasBioLogin(await hasBiometricLoginConfigured());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshBioConfigured();
    }, [refreshBioConfigured])
  );

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

      if (result?.requiresCancelDeletion && result?.tempToken) {
        setLoading(false);
        promptCancelDeletion(result.tempToken, result.deletionScheduledAt);
        return;
      }

      // Login bem-sucedido — opcionalmente guardar credenciais para biometria
      if (result?.success && saveWithBiometric && canUseBiometric) {
        try {
          await saveCredentialsWithBiometricConfirmation(formData.username, formData.password);
          showToast.success('Biometria', 'Acesso guardado. Pode usar impressão digital ou rosto para entrar.');
          await refreshBioConfigured();
        } catch (e: any) {
          if (e?.code !== 'BIOMETRIC_CANCELLED') {
            showToast.error('Biometria', e?.message || 'Não foi possível guardar o acesso biométrico.');
          }
        }
      }

      // A navegação será tratada automaticamente pelo AuthContext
    } catch (error) {
      const err = error as AxiosError<{ message: string; requiresVerification?: boolean; email?: string; code?: string }>;
      console.error('[LOGIN] Erro no login:', err);

      if (err.response?.data?.code === 'ACCOUNT_DELETION_EXPIRED') {
        const msg =
          err.response.data.message ||
          'Há um problema com esta conta. Crie uma nova conta utilizando outro e-mail.';
        setError(msg);
        showToast.error('Login', msg);
      } else if (err.response?.data?.requiresVerification && err.response?.data?.email) {
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

  const handleBiometricQuickLogin = async () => {
    setError('');
    setBioLoginLoading(true);
    try {
      const { username, password } = await getCredentialsWithBiometric();
      const result = await login(username, password);
      if (result?.requires2FA && result?.tempToken) {
        setFormData((prev) => ({ ...prev, username, password }));
        setRequires2FA(true);
        setTempToken(result.tempToken);
        showToast.info('2FA', 'Conta com 2FA: digite o código do autenticador.');
      } else if (result?.requiresCancelDeletion && result?.tempToken) {
        setFormData((prev) => ({ ...prev, username, password }));
        promptCancelDeletion(result.tempToken, result.deletionScheduledAt);
      }
    } catch (e: any) {
      if (e?.code === 'BIOMETRIC_CANCELLED') {
        return;
      }
      setError(e?.message || 'Não foi possível entrar com biometria.');
    } finally {
      setBioLoginLoading(false);
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
                    disabled={Boolean(twoFactorCode.length !== 6 || loading)}
                    style={styles.submitButton}
                  >
                    {loading ? 'Verificando...' : 'Verificar'}
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

                  {canUseBiometric ? (
                    <View style={styles.bioRow}>
                      <View style={styles.bioRowTextWrap}>
                        <Text style={styles.bioRowTitle}>Guardar acesso com biometria</Text>
                        <Text style={styles.bioRowHint}>
                          Após entrar, confirme com digital ou rosto para guardar utilizador e senha neste aparelho.
                        </Text>
                      </View>
                      <Switch
                        value={saveWithBiometric}
                        onValueChange={setSaveWithBiometric}
                        disabled={Boolean(loading)}
                        trackColor={{ false: '#e2e8f0', true: '#f9a8d4' }}
                        thumbColor={saveWithBiometric ? '#d946ef' : '#f4f4f5'}
                      />
                    </View>
                  ) : null}

                  {hasBioLogin && canUseBiometric ? (
                    <TouchableOpacity
                      style={[styles.bioQuickBtn, bioLoginLoading && styles.btnMuted]}
                      onPress={handleBiometricQuickLogin}
                      disabled={bioLoginLoading || loading}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="finger-print" size={22} color="#d946ef" />
                      <Text style={styles.bioQuickBtnText}>
                        {bioLoginLoading ? 'A autenticar…' : 'Entrar com biometria'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <Button
                    onPress={handleSubmit}
                    disabled={Boolean(!isFormValid || loading)}
                    style={styles.submitButton}
                  >
                    {loading ? 'Entrando...' : 'Acessar'}
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
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  bioRowTextWrap: {
    flex: 1,
  },
  bioRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  bioRowHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 16,
  },
  bioQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e9d5ff',
    backgroundColor: '#faf5ff',
  },
  bioQuickBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a21caf',
  },
  btnMuted: {
    opacity: 0.6,
  },
});

