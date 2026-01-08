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
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { BackButton } from '../components/BackButton';
import { authApi } from '../services/api';
import { showToast } from '../components/CustomToast';
import { AxiosError } from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { COLORS } from '../theme/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function RegisterScreen() {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    fullName: '',
    birthDate: '',
  });
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Buscar referralCode do AsyncStorage ao montar o componente
  useEffect(() => {
    const loadReferralCode = async () => {
      try {
        const storedRef = await AsyncStorage.getItem('referralCode');
        if (storedRef) {
          setReferralCode(storedRef);
        }
      } catch (error) {
        console.error('Erro ao carregar referralCode:', error);
      }
    };
    loadReferralCode();
  }, []);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/g, '($1) $2-$3').trim();
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/g, '($1) $2-$3');
  };

  const formatDate = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return numbers.replace(/(\d{2})(\d{0,2})/, '$1/$2');
    return numbers.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast.error('Permissão', 'Precisamos de permissão para acessar suas fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAvatarUri(asset.uri);
      
      // Para React Native, vamos usar FormData diretamente
      // O avatar será enviado como URI e o backend precisará lidar com isso
      setAvatarFile({
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });
    }
  };

  const handleSubmit = async () => {
    // Validações
    if (!formData.username || !formData.email || !formData.password ||
        !formData.confirmPassword || !formData.phone || !formData.fullName || !formData.birthDate) {
      showToast.error('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    if (!acceptedTerms) {
      showToast.error('Erro', 'Você precisa aceitar os termos de uso');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast.error('Erro', 'As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      showToast.error('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      showToast.error('Erro', 'Telefone inválido');
      return;
    }

    // Validar data de nascimento (deve ter 18+ anos)
    const birthDateParts = formData.birthDate.split('/');
    if (birthDateParts.length !== 3) {
      showToast.error('Erro', 'Data de nascimento inválida');
      return;
    }
    const birthDate = new Date(
      parseInt(birthDateParts[2]),
      parseInt(birthDateParts[1]) - 1,
      parseInt(birthDateParts[0])
    );
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      if (age - 1 < 18) {
        showToast.error('Erro', 'Você deve ter pelo menos 18 anos');
        return;
      }
    } else if (age < 18) {
      showToast.error('Erro', 'Você deve ter pelo menos 18 anos');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        phone: cleanPhone,
        fullName: formData.fullName,
        birthDate: `${birthDateParts[2]}-${birthDateParts[1]}-${birthDateParts[0]}`,
        termsAccepted: acceptedTerms,
        avatar: avatarFile || undefined,
        referralCode: referralCode || undefined,
      });

      // Limpar referralCode do AsyncStorage após registro bem-sucedido
      if (referralCode && response.success) {
        try {
          await AsyncStorage.removeItem('referralCode');
        } catch (error) {
          console.error('Erro ao remover referralCode:', error);
        }
      }

      if (response.success) {
        if (response.data?.requiresVerification) {
          const userEmail = response.data?.email || formData.email;
          showToast.success('Sucesso', 'Conta criada! Verifique seu e-mail para ativar sua conta.');
          (navigation as any).navigate('VerifyEmail', { email: userEmail });
        } else {
          showToast.success('Sucesso', 'Conta criada com sucesso!');
          navigation.goBack();
        }
      }
    } catch (error) {
      const err = error as AxiosError<{ message: string }>;
      showToast.error('Erro', err.response?.data?.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = 
    formData.username.length >= 3 &&
    formData.email.includes('@') &&
    formData.password.length >= 6 &&
    formData.password === formData.confirmPassword &&
    formData.phone.replace(/\D/g, '').length >= 10 &&
    formData.fullName.length >= 3 &&
    formData.birthDate.length === 10 &&
    acceptedTerms;

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
            <BackButton title="Login" />
          </View>

              <View style={styles.formContainer}>
            <View style={styles.formCard}>
              <Text style={styles.logo}>Melter</Text>
              <Text style={styles.formTitle}>Criar Conta</Text>

              {/* Indicador de Referral Code */}
              {referralCode && (
                <View style={styles.referralBanner}>
                  <Ionicons name="gift" size={20} color="#ffffff" />
                  <Text style={styles.referralText}>
                    Você está ajudando <Text style={styles.referralCodeText}>{referralCode}</Text>!
                  </Text>
                </View>
              )}

              {/* Avatar */}
              <View style={styles.avatarContainer}>
                {avatarUri ? (
                  <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrapper}>
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    <View style={styles.avatarOverlay}>
                      <Ionicons name="camera" size={24} color="#ffffff" />
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarPlaceholder}>
                    <Ionicons name="camera" size={32} color={COLORS.text.secondary} />
                    <Text style={styles.avatarPlaceholderText}>Foto (opcional)</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.form}>
                <Input
                  label="Nome completo"
                  value={formData.fullName}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, fullName: text }))}
                  placeholder="Digite seu nome completo"
                  editable={!loading}
                />

                <Input
                  label="Data de nascimento"
                  value={formData.birthDate}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, birthDate: formatDate(text) }))}
                  placeholder="DD/MM/AAAA"
                  keyboardType="number-pad"
                  maxLength={10}
                  editable={!loading}
                />

                <Input
                  label="Nome de usuário"
                  value={formData.username}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, username: text.toLowerCase().replace(/\s/g, '') }))}
                  placeholder="Digite seu usuário"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />

                <Input
                  label="E-mail"
                  value={formData.email}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text.toLowerCase() }))}
                  placeholder="Digite seu e-mail"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />

                <Input
                  label="Telefone"
                  value={formData.phone}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, phone: formatPhone(text) }))}
                  placeholder="(00) 00000-0000"
                  keyboardType="phone-pad"
                  maxLength={15}
                  editable={!loading}
                />

                <Input
                  label="Senha"
                  value={formData.password}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, password: text }))}
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
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, confirmPassword: text }))}
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

                <TouchableOpacity
                  style={styles.termsContainer}
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                  disabled={loading}
                >
                  <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                    {acceptedTerms && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                  </View>
                  <Text style={styles.termsText}>
                    Aceito os{' '}
                    <Text style={styles.termsLink}>termos de uso</Text>
                    {' '}e{' '}
                    <Text style={styles.termsLink}>política de privacidade</Text>
                  </Text>
                </TouchableOpacity>

                <Button
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={!isFormValid || loading}
                  style={styles.submitButton}
                >
                  Criar Conta
                </Button>

                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>Já tem uma conta? </Text>
                  <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.loginLink}>Fazer login</Text>
                  </TouchableOpacity>
                </View>
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
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary.main,
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  referralText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  referralCodeText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.secondary.main,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.background.default,
    borderWidth: 2,
    borderColor: COLORS.border.light,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  form: {
    gap: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border.medium,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.secondary.main,
    borderColor: COLORS.secondary.main,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.secondary.main,
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

