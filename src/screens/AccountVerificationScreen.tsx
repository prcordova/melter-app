import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { COLORS } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { userApi, sellerVerificationApi } from '../services/api';
import { showToast } from '../components/CustomToast';
import { shouldShowVerifiedBadgeOnProfile } from '../utils/verified-badge';

type PickedImage = { uri: string; mimeType?: string | null; fileName?: string | null };

function digitsOnly(s: string) {
  return s.replace(/\D/g, '');
}

function isValidCpfDigits(cpf: string): boolean {
  const clean = digitsOnly(cpf);
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (11 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10), 10)) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(clean.substring(10, 11), 10);
}

async function pickImage(): Promise<PickedImage | null> {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissionResult.granted) {
    showToast.error('Permissão negada', 'Precisamos de acesso à galeria');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
    showToast.error('Arquivo grande', 'Use uma imagem de até 8 MB.');
    return null;
  }
  return {
    uri: asset.uri,
    mimeType: asset.mimeType,
    fileName: asset.fileName,
  };
}

export function AccountVerificationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [documentFront, setDocumentFront] = useState<PickedImage | null>(null);
  const [selfieWithDocument, setSelfieWithDocument] = useState<PickedImage | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const planType = user?.plan?.type || 'FREE';
  const isProPlus = planType === 'PRO_PLUS';
  const has2FA = !!user?.twoFactor?.enabled;
  const alreadyVerified = shouldShowVerifiedBadgeOnProfile(user);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const res = await sellerVerificationApi.getVerification();
          if (cancelled || !res.success) return;
          const st = res.data?.status;
          if (st === 'pending') {
            showToast.info('Em análise', 'Você já tem uma solicitação pendente.');
            (navigation as any).goBack();
          }
        } catch {
          /* ignore */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [navigation])
  );

  const handleSubmit = async () => {
    if (!isProPlus || !has2FA || alreadyVerified) {
      showToast.error('Indisponível', 'Confira plano PRO+, 2FA e status da conta.');
      return;
    }
    const name = fullName.trim();
    const cleanCpf = digitsOnly(cpf);
    const bd = birthDate.trim();
    if (!name || !cleanCpf || !bd) {
      showToast.error('Campos obrigatórios', 'Preencha nome completo, CPF e data de nascimento.');
      return;
    }
    if (!isValidCpfDigits(cleanCpf)) {
      showToast.error('CPF inválido', 'Verifique os dígitos do CPF.');
      return;
    }
    if (!documentFront || !selfieWithDocument) {
      showToast.error('Documentos', 'Envie a foto do documento (frente) e a selfie com o documento.');
      return;
    }

    const formData = new FormData();
    formData.append('fullName', name);
    formData.append('cpf', cleanCpf);
    formData.append('birthDate', bd);
    const cleanPhone = digitsOnly(phone);
    if (cleanPhone.length >= 10) {
      formData.append('phone', cleanPhone);
    }
    formData.append('documentFront', {
      uri: documentFront.uri,
      type: documentFront.mimeType || 'image/jpeg',
      name: documentFront.fileName || 'document_front.jpg',
    } as any);
    formData.append('selfieWithDocument', {
      uri: selfieWithDocument.uri,
      type: selfieWithDocument.mimeType || 'image/jpeg',
      name: selfieWithDocument.fileName || 'selfie_document.jpg',
    } as any);

    try {
      setSubmitting(true);
      const res = await userApi.submitAccountVerification(formData);
      if (res.success) {
        showToast.success('Enviado', res.message || 'Solicitação recebida. Análise em até 48 horas.');
        await refreshUser();
        (navigation as any).goBack();
      } else {
        showToast.error('Não enviado', (res as any).message || 'Tente novamente.');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erro ao enviar';
      showToast.error('Erro', String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <BackButton />
        <Text style={styles.muted}>Faça login para continuar.</Text>
      </View>
    );
  }

  if (alreadyVerified) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={styles.headerTitle}>Conta verificada</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.block}>
          <Ionicons name="checkmark-circle" size={48} color={COLORS.states.success} />
          <Text style={styles.lead}>Sua conta já possui o selo verificado.</Text>
        </View>
      </View>
    );
  }

  if (!isProPlus || !has2FA) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={styles.headerTitle}>Verificação</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.block}>
          <Text style={styles.lead}>
            {!isProPlus
              ? 'O selo verificado está disponível no plano PRO+.'
              : 'Ative a autenticação em dois fatores (2FA) nas configurações de segurança antes de enviar os documentos.'}
          </Text>
          {!isProPlus && (
            <Button variant="primary" onPress={() => (navigation as any).navigate('Plans')} style={{ marginTop: 16 }}>
              Ver planos
            </Button>
          )}
          {isProPlus && !has2FA && (
            <Button
              variant="primary"
              onPress={() => (navigation as any).navigate('SecuritySettings')}
              style={{ marginTop: 16 }}
            >
              Segurança e 2FA
            </Button>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <BackButton />
        <Text style={styles.headerTitle}>Verificação de conta</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Envie seus dados como no site: nome completo, CPF, data de nascimento, documento com foto (frente) e selfie
          segurando o documento. A análise costuma levar até 48 horas.
        </Text>

        <Text style={styles.label}>Nome completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Como consta no documento"
          placeholderTextColor={COLORS.text.tertiary}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>CPF</Text>
        <TextInput
          style={styles.input}
          placeholder="Somente números"
          placeholderTextColor={COLORS.text.tertiary}
          value={cpf}
          onChangeText={(t) => setCpf(digitsOnly(t))}
          keyboardType="number-pad"
          maxLength={11}
        />

        <Text style={styles.label}>Data de nascimento</Text>
        <TextInput
          style={styles.input}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={COLORS.text.tertiary}
          value={birthDate}
          onChangeText={setBirthDate}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Telefone (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="DDD + número"
          placeholderTextColor={COLORS.text.tertiary}
          value={phone}
          onChangeText={(t) => setPhone(digitsOnly(t))}
          keyboardType="phone-pad"
          maxLength={11}
        />

        <Text style={styles.label}>Documento (frente)</Text>
        <TouchableOpacity style={styles.pickRow} onPress={async () => setDocumentFront(await pickImage())}>
          {documentFront ? (
            <Image source={{ uri: documentFront.uri }} style={styles.thumb} />
          ) : (
            <View style={styles.pickPlaceholder}>
              <Ionicons name="image-outline" size={28} color={COLORS.text.tertiary} />
              <Text style={styles.pickText}>Toque para escolher</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Selfie com o documento</Text>
        <TouchableOpacity style={styles.pickRow} onPress={async () => setSelfieWithDocument(await pickImage())}>
          {selfieWithDocument ? (
            <Image source={{ uri: selfieWithDocument.uri }} style={styles.thumb} />
          ) : (
            <View style={styles.pickPlaceholder}>
              <Ionicons name="camera-outline" size={28} color={COLORS.text.tertiary} />
              <Text style={styles.pickText}>Toque para escolher</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Ao enviar, você confirma que as informações são verdadeiras e que os documentos são autênticos, como no fluxo
          do site.
        </Text>

        <Button variant="primary" onPress={handleSubmit} disabled={submitting} style={{ marginTop: 8 }}>
          {submitting ? <ActivityIndicator color="#fff" /> : 'Enviar verificação'}
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background.default,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  intro: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  pickRow: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    backgroundColor: COLORS.background.paper,
    minHeight: 120,
  },
  thumb: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  pickPlaceholder: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pickText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  disclaimer: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 16,
    lineHeight: 18,
  },
  block: {
    padding: 24,
    alignItems: 'center',
  },
  lead: {
    fontSize: 16,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  muted: {
    color: COLORS.text.secondary,
    marginTop: 12,
  },
});
