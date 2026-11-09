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
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';
import { ThemedStatusBar } from '../components/ThemedStatusBar';
import {
  isBiometricLoginSupported,
  hasBiometricLoginConfigured,
  enableBiometricLogin,
  getBiometricLoginCredential,
  migrateLegacyBiometricLogin,
  clearBiometricLogin,
} from '../services/biometricLogin';
import * as Clipboard from 'expo-clipboard';

const TWO_FACTOR_CODE_LENGTH = 6;

export function LoginScreen() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useAppTheme();
  const { login, loginWithDevice, confirmCancelDeletionLogin } = useAuth();
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
  const [rejectedCode, setRejectedCode] = useState<string | null>(null);

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

  const handleSubmit = async (codeOverride?: string) => {
    const code = codeOverride ?? twoFactorCode;
    setError('');
    setLoading(true);

    try {
      const result = await login(
        formData.username,
        formData.password,
        requires2FA ? code : undefined,
        tempToken || undefined
      );

      if (requires2FA && result?.success === false) {
        setTwoFactorCode('');
        setRejectedCode(code);
        if (result.sessionExpired) {
          handleBack();
          setError('O tempo para digitar o código acabou. Entre com usuário e senha novamente.');
        } else {
          setError(`${result.message || 'Código inválido'}. Aguarde o próximo código no autenticador.`);
        }
        return;
      }

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

      // Login bem-sucedido — opcionalmente ativar login biométrico (sem guardar a senha)
      if (result?.success && saveWithBiometric && canUseBiometric) {
        try {
          await enableBiometricLogin(formData.username);
          showToast.success('Biometria', 'Acesso ativado. Use impressão digital ou rosto para entrar.');
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
    setRejectedCode(null);
    setError('');
  };

  /** Com 6 dígitos envia sozinho — exceto o mesmo código já recusado (precisa de um novo do autenticador). */
  const applyTwoFactorCode = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, TWO_FACTOR_CODE_LENGTH);
    setTwoFactorCode(digits);
    if (digits.length === TWO_FACTOR_CODE_LENGTH && !loading && digits !== rejectedCode) {
      void handleSubmit(digits);
    }
  };

  const handlePasteTwoFactorCode = async () => {
    const text = await Clipboard.getStringAsync().catch(() => '');
    const match = text.match(/\d{6}/);
    if (!match) {
      showToast.error('2FA', 'Nenhum código de 6 dígitos na área de transferência.');
      return;
    }
    if (match[0] === rejectedCode) {
      setError('Esse código já foi recusado. Copie o próximo código do autenticador.');
      return;
    }
    applyTwoFactorCode(match[0]);
  };

  const isFormValid = formData.username.length >= 3 && formData.password.length >= 6;

  const handleBiometricQuickLogin = async () => {
    setError('');
    setBioLoginLoading(true);
    try {
      const credential = await getBiometricLoginCredential('Autentique-se para entrar no Melter');

      if (credential.type === 'legacy') {
        const { username, password } = credential;
        const result = await login(username, password);
        if (result?.requires2FA && result?.tempToken) {
          setFormData((prev) => ({ ...prev, username, password }));
          setRequires2FA(true);
          setTempToken(result.tempToken);
          showToast.info('2FA', 'Conta com 2FA: digite o código do autenticador.');
        } else if (result?.requiresCancelDeletion && result?.tempToken) {
          setFormData((prev) => ({ ...prev, username, password }));
          promptCancelDeletion(result.tempToken, result.deletionScheduledAt);
        } else if (result?.success) {
          void migrateLegacyBiometricLogin(username, password);
        }
        return;
      }

      const result = await loginWithDevice(credential.credentialId, credential.secret);
      if (result?.requiresCancelDeletion && result?.tempToken) {
        promptCancelDeletion(result.tempToken, result.deletionScheduledAt);
      }
    } catch (e: any) {
      if (e?.code === 'BIOMETRIC_CANCELLED') {
        return;
      }
      const apiError = (e as AxiosError<{ message?: string; code?: string }>)?.response?.data;
      if (apiError?.code === 'DEVICE_CREDENTIAL_INVALID') {
        await clearBiometricLogin({ revokeRemote: false });
        await refreshBioConfigured();
      }
      setError(apiError?.message || e?.message || 'Não foi possível entrar com biometria.');
      if (e?.code === 'BIOMETRIC_INVALIDATED') {
        await refreshBioConfigured();
      }
    } finally {
      setBioLoginLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ThemedStatusBar />
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
                    onChangeText={applyTwoFactorCode}
                    placeholder="000000"
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    maxLength={TWO_FACTOR_CODE_LENGTH}
                    editable={Boolean(!loading)}
                    autoFocus
                    style={styles.twoFactorInput}
                    rightIcon={<Ionicons name="clipboard-outline" size={22} color={colors.secondary.main} />}
                    onRightIconPress={loading ? undefined : () => void handlePasteTwoFactorCode()}
                    helperText="Toque no ícone para colar o código copiado"
                  />

                  <Button
                    onPress={() => void handleSubmit()}
                    disabled={Boolean(
                      twoFactorCode.length !== TWO_FACTOR_CODE_LENGTH || twoFactorCode === rejectedCode || loading
                    )}
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
                          Após entrar, confirme com digital ou rosto. Sua senha não fica guardada no aparelho.
                        </Text>
                      </View>
                      <Switch
                        value={saveWithBiometric}
                        onValueChange={setSaveWithBiometric}
                        disabled={Boolean(loading)}
                        trackColor={{ false: colors.border.medium, true: '#f9a8d4' }}
                        thumbColor={saveWithBiometric ? colors.secondary.light : '#f4f4f5'}
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
                      <Ionicons name="finger-print" size={22} color={colors.secondary.light} />
                      <Text style={styles.bioQuickBtnText}>
                        {bioLoginLoading ? 'A autenticar…' : 'Entrar com biometria'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <Button
                    onPress={() => void handleSubmit()}
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

const createStyles = (c: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background.default,
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
    backgroundColor: c.background.paper,
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
    color: c.secondary.light,
    textAlign: 'center',
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: c.text.primary,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorContainer: {
    backgroundColor: c.states.error + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: c.states.error,
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
    color: c.text.primary,
    marginBottom: 4,
  },
  twoFactorDescription: {
    fontSize: 14,
    color: c.text.secondary,
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
    color: c.secondary.light,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: c.secondary.light,
    fontSize: 14,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: c.border.medium,
  },
  signupText: {
    color: c.text.secondary,
    fontSize: 14,
  },
  signupLink: {
    color: c.secondary.light,
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
    borderTopColor: c.divider,
  },
  bioRowTextWrap: {
    flex: 1,
  },
  bioRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text.primary,
  },
  bioRowHint: {
    fontSize: 12,
    color: c.text.tertiary,
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
    borderColor: c.border.medium,
    backgroundColor: c.background.tertiary,
  },
  bioQuickBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.secondary.main,
  },
  btnMuted: {
    opacity: 0.6,
  },
});

