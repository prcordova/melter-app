import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Image,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { COLORS } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { userApi } from '../../services/api';
import { showToast } from '../../components/CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../../components/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  hasBiometricLoginConfigured,
  clearBiometricLogin,
} from '../../services/biometricLogin';

export function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Change Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requires2FAForPassword, setRequires2FAForPassword] = useState(false);
  const [logoutAllDevices, setLogoutAllDevices] = useState(true);

  // 2FA Setup
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoFAQRCode, setTwoFAQRCode] = useState<string | null>(null);
  const [twoFASecret, setTwoFASecret] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [biometricQuickLoginEnabled, setBiometricQuickLoginEnabled] = useState(false);

  useEffect(() => {
    if (user?.twoFactor?.enabled) {
      setTwoFAEnabled(true);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const on = await hasBiometricLoginConfigured();
      if (!cancelled) setBiometricQuickLoginEnabled(on);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword) {
      setError('Preencha todos os campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 20) {
      setError('A senha deve ter entre 6 e 20 caracteres');
      return;
    }

    try {
      setLoading(true);
      const response = await userApi.changePassword({
        currentPassword,
        newPassword,
        twoFactorCode: twoFactorCode || undefined,
        logoutAllDevices,
      });

      if (response.success) {
        if (response.data?.newToken && logoutAllDevices) {
          try {
            await AsyncStorage.setItem('token', response.data.newToken);
          } catch (e) {
            console.error('[SECURITY] Erro ao salvar token:', e);
          }
        }

        setSuccess(response.message || 'Senha alterada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTwoFactorCode('');
        setRequires2FAForPassword(false);
        setLogoutAllDevices(true);
        try {
          await clearBiometricLogin();
          setBiometricQuickLoginEnabled(false);
        } catch {
          /* ignore */
        }
      }
    } catch (err: any) {
      if (err.response?.data?.requires2FA) {
        setRequires2FAForPassword(true);
        setError('Digite o código do seu autenticador para confirmar a troca de senha');
      } else {
        setError(err.response?.data?.message || 'Erro ao alterar senha');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userApi.setup2FA();

      if (response.success && response.data) {
        setTwoFAQRCode(response.data.qrCode);
        setTwoFASecret(response.data.secret);
        setShow2FADialog(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao configurar 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userApi.verify2FA(setupCode);

      if (response.success && response.data) {
        setBackupCodes(response.data.backupCodes || []);
        setTwoFAEnabled(true);
        setSuccess('2FA ativado com sucesso!');
        if (refreshUser) refreshUser();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleClose2FADialog = () => {
    setShow2FADialog(false);
    setTwoFAQRCode(null);
    setTwoFASecret(null);
    setSetupCode('');
    setBackupCodes([]);
  };

  const confirmRemoveBiometric = () => {
    Alert.alert(
      'Remover acesso biométrico',
      'As credenciais guardadas neste aparelho serão apagadas. Pode voltar a ativar no ecrã de login.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearBiometricLogin();
              setBiometricQuickLoginEnabled(false);
              showToast.success('Biometria', 'Acesso biométrico removido.');
            } catch {
              showToast.error('Biometria', 'Não foi possível remover.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton title="Configurações" />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🔒 Segurança</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Alertas globais */}
        {error && (
          <View style={styles.alertError}>
            <Ionicons name="alert-circle" size={20} color={COLORS.states.error} />
            <Text style={styles.alertText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close" size={20} color={COLORS.states.error} />
            </TouchableOpacity>
          </View>
        )}
        {success && (
          <View style={styles.alertSuccess}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.states.success} />
            <Text style={styles.alertText}>{success}</Text>
            <TouchableOpacity onPress={() => setSuccess(null)}>
              <Ionicons name="close" size={20} color={COLORS.states.success} />
            </TouchableOpacity>
          </View>
        )}

        {/* Acesso biométrico no aparelho */}
        {biometricQuickLoginEnabled && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconContainer, { backgroundColor: '#a855f7' }]}>
                <Ionicons name="finger-print" size={24} color="#ffffff" />
              </View>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>Biometria neste aparelho</Text>
                <Text style={styles.sectionSubtitle}>
                  Login rápido e bloqueio ao abrir o app estão ativos com as credenciais guardadas de forma segura.
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.form}>
              <TouchableOpacity style={styles.dangerOutlineBtn} onPress={confirmRemoveBiometric}>
                <Text style={styles.dangerOutlineBtnText}>Remover acesso biométrico</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Seção: Alterar Senha */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={24} color="#ffffff" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Alterar Senha</Text>
              <Text style={styles.sectionSubtitle}>Altere sua senha para manter sua conta segura</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.form}>
            {/* Senha atual */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Senha Atual</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Digite sua senha atual"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showCurrentPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={COLORS.text.secondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Nova senha */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nova Senha</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Digite sua nova senha"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={COLORS.text.secondary}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>Mínimo de 6 caracteres</Text>
            </View>

            {/* Confirmar senha */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmar Nova Senha</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    confirmPassword !== '' && confirmPassword !== newPassword && styles.inputError,
                  ]}
                  placeholder="Confirme sua nova senha"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={COLORS.text.secondary}
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword !== '' && confirmPassword !== newPassword && (
                <Text style={styles.errorText}>As senhas não coincidem</Text>
              )}
            </View>

            {/* Código 2FA se necessário */}
            {requires2FAForPassword && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Código 2FA</Text>
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  placeholderTextColor={COLORS.text.tertiary}
                  value={twoFactorCode}
                  onChangeText={(text) => setTwoFactorCode(text.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Text style={styles.helperText}>
                  Digite o código de 6 dígitos do seu autenticador
                </Text>
              </View>
            )}

            {/* Toggle Logout All Devices */}
            <View style={styles.toggleContainer}>
              <Ionicons name="phone-portrait-outline" size={20} color={COLORS.text.secondary} />
              <View style={styles.toggleContent}>
                <Text style={styles.toggleLabel}>Desconectar todos os dispositivos</Text>
                <Text style={styles.toggleDescription}>
                  Ao alterar a senha, todos os outros dispositivos serão desconectados
                </Text>
              </View>
              <Switch
                value={logoutAllDevices}
                onValueChange={setLogoutAllDevices}
                trackColor={{ false: COLORS.border.medium, true: COLORS.secondary.main }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Botão */}
            <Button
              onPress={handleChangePassword}
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              loading={loading}
              style={styles.saveButton}
            >
              Alterar Senha
            </Button>
          </View>
        </View>

        {/* Seção: 2FA */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, twoFAEnabled && styles.iconContainerSuccess]}>
              <Ionicons name="shield-checkmark" size={24} color="#ffffff" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Autenticação de Dois Fatores</Text>
              <View style={styles.chipContainer}>
                <View style={[styles.chip, twoFAEnabled && styles.chipSuccess]}>
                  <Ionicons
                    name={twoFAEnabled ? 'checkmark-circle' : 'warning'}
                    size={14}
                    color={twoFAEnabled ? COLORS.states.success : COLORS.states.warning}
                  />
                  <Text style={[styles.chipText, twoFAEnabled && styles.chipTextSuccess]}>
                    {twoFAEnabled ? 'Ativo' : 'Inativo'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionDescription}>
            Adicione uma camada extra de segurança à sua conta usando um aplicativo autenticador
          </Text>

          {twoFAEnabled ? (
            <View style={styles.alertSuccess}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.states.success} />
              <Text style={styles.alertText}>2FA está ativado na sua conta</Text>
            </View>
          ) : (
            <Button
              onPress={handleSetup2FA}
              disabled={loading}
              loading={loading}
              style={styles.setupButton}
            >
              Configurar 2FA
            </Button>
          )}
        </View>

        {/* Seção: Verificação */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[
              styles.iconContainer,
              user?.verifiedBadge?.isVerified && styles.iconContainerSuccess,
            ]}>
              <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Verificação</Text>
              <View style={styles.chipContainer}>
                <View style={[
                  styles.chip,
                  user?.verifiedBadge?.isVerified && styles.chipSuccess,
                ]}>
                  <Ionicons
                    name={user?.verifiedBadge?.isVerified ? 'checkmark-circle' : 'warning'}
                    size={14}
                    color={
                      user?.verifiedBadge?.isVerified
                        ? COLORS.states.success
                        : COLORS.states.warning
                    }
                  />
                  <Text style={[
                    styles.chipText,
                    user?.verifiedBadge?.isVerified && styles.chipTextSuccess,
                  ]}>
                    {user?.verifiedBadge?.isVerified ? 'Verificado' : 'Não Verificado'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionDescription}>
            Verifique sua identidade para obter o selo de verificação
          </Text>

          {user?.verifiedBadge?.isVerified ? (
            <View style={styles.alertSuccess}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.states.success} />
              <Text style={styles.alertText}>Sua conta está verificada</Text>
            </View>
          ) : (
            <Button
              variant="outline"
              onPress={() => {
                showToast.info('Verificação', 'Acesse os planos para verificar sua conta');
              }}
              style={styles.verifyButton}
            >
              Verificar Conta
            </Button>
          )}
        </View>
      </ScrollView>

      {/* Dialog 2FA Setup */}
      <Modal
        visible={show2FADialog}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose2FADialog}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Ionicons name="shield-checkmark" size={24} color={COLORS.secondary.main} />
              <Text style={styles.modalTitle}>Configurar 2FA</Text>
            </View>
            <TouchableOpacity onPress={handleClose2FADialog}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {backupCodes.length > 0 ? (
              <View>
                <View style={styles.alertSuccess}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.states.success} />
                  <Text style={styles.alertText}>✅ 2FA ativado com sucesso!</Text>
                </View>
                <View style={styles.alertWarning}>
                  <Ionicons name="warning" size={20} color={COLORS.states.warning} />
                  <Text style={styles.alertText}>
                    ⚠️ Guarde estes códigos de backup em local seguro. Você precisará deles se perder acesso ao seu autenticador.
                  </Text>
                </View>
                <View style={styles.backupCodesContainer}>
                  {backupCodes.map((code, idx) => (
                    <View key={idx} style={styles.backupCodeItem}>
                      <Text style={styles.backupCodeText}>{code}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.modalDescription}>
                  Escaneie o QR code com seu app autenticador (Google Authenticator, Authy, etc.)
                </Text>

                {twoFAQRCode && (
                  <Image
                    source={{ uri: twoFAQRCode }}
                    style={styles.qrCode}
                    resizeMode="contain"
                  />
                )}

                {twoFASecret && (
                  <View style={styles.alertInfo}>
                    <Ionicons name="information-circle" size={20} color={COLORS.states.info} />
                    <Text style={styles.alertText}>
                      Ou digite manualmente: <Text style={styles.secretText}>{twoFASecret}</Text>
                    </Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Código de Verificação</Text>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="000000"
                    placeholderTextColor={COLORS.text.tertiary}
                    value={setupCode}
                    onChangeText={(text) => setSetupCode(text.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                  />
                </View>

                <Button
                  onPress={handleVerify2FA}
                  disabled={loading || setupCode.length !== 6}
                  loading={loading}
                  style={styles.verify2FAButton}
                >
                  Verificar e Ativar
                </Button>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              variant="outline"
              onPress={handleClose2FADialog}
              style={styles.modalCloseButton}
            >
              {backupCodes.length > 0 ? 'Fechar' : 'Cancelar'}
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    paddingBottom: 12,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  scrollContent: {
    padding: 16,
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.states.error + '20',
    borderWidth: 1,
    borderColor: COLORS.states.error + '40',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.states.success + '20',
    borderWidth: 1,
    borderColor: COLORS.states.success + '40',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  alertWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.states.warning + '20',
    borderWidth: 1,
    borderColor: COLORS.states.warning + '40',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.states.info + '20',
    borderWidth: 1,
    borderColor: COLORS.states.info + '40',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  section: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSuccess: {
    backgroundColor: COLORS.states.success,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  chipContainer: {
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.states.warning + '20',
    borderWidth: 1,
    borderColor: COLORS.states.warning + '40',
  },
  chipSuccess: {
    backgroundColor: COLORS.states.success + '20',
    borderColor: COLORS.states.success + '40',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.states.warning,
  },
  chipTextSuccess: {
    color: COLORS.states.success,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  eyeButton: {
    padding: 12,
  },
  input: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  inputError: {
    borderColor: COLORS.states.error,
  },
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.states.error,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.background.tertiary,
    padding: 16,
    borderRadius: 8,
  },
  toggleContent: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  saveButton: {
    marginTop: 8,
  },
  setupButton: {
    marginTop: 8,
  },
  verifyButton: {
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  modalContent: {
    padding: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  qrCode: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: 16,
    borderRadius: 8,
  },
  secretText: {
    fontFamily: 'monospace',
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  verify2FAButton: {
    marginTop: 16,
  },
  backupCodesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: COLORS.background.tertiary,
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  backupCodeItem: {
    width: '48%',
    padding: 12,
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  backupCodeText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  modalCloseButton: {
    width: '100%',
  },
  dangerOutlineBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.states.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerOutlineBtnText: {
    color: COLORS.states.error,
    fontSize: 15,
    fontWeight: '600',
  },
});

