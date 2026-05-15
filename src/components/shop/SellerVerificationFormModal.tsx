import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Switch,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import { showToast } from '../CustomToast';
import { sellerVerificationApi } from '../../services/api';
import { SellerDocumentUploadField } from './SellerDocumentUploadField';
import { SelectRow } from '../SelectRow';
import {
  SELLER_VERIFICATION_MAX_IMAGE_SIZE_BYTES,
  SELLER_VERIFICATION_UPLOAD_HELPER_TEXT,
} from '../../config/seller-verification.config';
import { getSellerVerificationFieldLabel } from '../../utils/seller-verification-fields';
import {
  digitsOnly,
  formatBirthDateForDisplay,
  formatCpf,
  getAgeFromBirthDate,
  isValidCpf,
  parseBirthDateInput,
} from '../../utils/seller-verification-validation';

export type SellerVerificationFormData = {
  cpf?: string;
  birthDate?: string;
  ageConfirmed?: boolean;
  contentOwnershipConfirmed?: boolean;
  adultContentAware?: boolean;
  contentType?: string;
  isAdultContent?: boolean;
  documentFront?: string;
  documentBack?: string;
  selfieWithDocument?: string;
  status?: string;
  needsReviewReasons?: string[];
  needsReviewReason?: string;
  rejectionReason?: string | null;
  fieldsToReview?: string[];
};

type PickedImage = { uri: string; mimeType?: string | null; fileName?: string | null };

type DocKey = 'documentFront' | 'documentBack' | 'selfieWithDocument';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (data: SellerVerificationFormData) => void;
  existingData?: SellerVerificationFormData;
};

const LOCKED_HINT = 'Enviado anteriormente — somente leitura.';

const CONTENT_TYPE_OPTIONS = [
  { value: 'course', label: 'Curso' },
  { value: 'digital_content', label: 'Conteúdo digital' },
  { value: 'service', label: 'Serviço' },
  { value: 'other', label: 'Outro' },
];

async function pickSellerImage(): Promise<PickedImage | null> {
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
  if (asset.fileSize && asset.fileSize > SELLER_VERIFICATION_MAX_IMAGE_SIZE_BYTES) {
    showToast.error('Arquivo grande', 'Use uma imagem de até 30 MB.');
    return null;
  }
  return {
    uri: asset.uri,
    mimeType: asset.mimeType,
    fileName: asset.fileName,
  };
}

export function SellerVerificationFormModal({
  visible,
  onClose,
  onSuccess,
  existingData,
}: Props) {
  const { width } = useWindowDimensions();
  const twoColumnPersonal = width >= 400;
  const twoColumnDocs = width >= 480;

  const [displayData, setDisplayData] = useState<SellerVerificationFormData | undefined>(
    existingData
  );

  useEffect(() => {
    if (visible) setDisplayData(existingData);
  }, [visible, existingData]);

  const fieldsToReview = displayData?.fieldsToReview ?? [];
  const mustResubmitField = (field: string) => fieldsToReview.includes(field);

  const isReviewMode =
    displayData?.status === 'needs_review' ||
    (displayData?.status === 'rejected' && fieldsToReview.length > 0);

  const isCorrectionOnlyMode =
    fieldsToReview.length > 0 &&
    (displayData?.status === 'rejected' || displayData?.status === 'needs_review');

  const canEditField = useCallback(
    (field: string) => !isCorrectionOnlyMode || fieldsToReview.includes(field),
    [isCorrectionOnlyMode, fieldsToReview]
  );

  const [cpf, setCpf] = useState('');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [contentOwnershipConfirmed, setContentOwnershipConfirmed] = useState(false);
  const [adultContentAware, setAdultContentAware] = useState(false);
  const [contentType, setContentType] = useState('');
  const [isAdultContent, setIsAdultContent] = useState(false);

  const [documentFrontFile, setDocumentFrontFile] = useState<PickedImage | null>(null);
  const [documentFrontPreview, setDocumentFrontPreview] = useState<string | null>(null);
  const [documentBackFile, setDocumentBackFile] = useState<PickedImage | null>(null);
  const [documentBackPreview, setDocumentBackPreview] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<PickedImage | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [pickingDoc, setPickingDoc] = useState<DocKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hydrateFromDisplayData = useCallback((data?: SellerVerificationFormData) => {
    if (!data) {
      setCpf('');
      setBirthDateInput('');
      setAgeConfirmed(false);
      setContentOwnershipConfirmed(false);
      setAdultContentAware(false);
      setContentType('');
      setIsAdultContent(false);
      setDocumentFrontFile(null);
      setDocumentFrontPreview(null);
      setDocumentBackFile(null);
      setDocumentBackPreview(null);
      setSelfieFile(null);
      setSelfiePreview(null);
      return;
    }

    const review = data.fieldsToReview || [];
    const mustResubmit = (field: string) => review.includes(field);

    setCpf(mustResubmit('cpf') ? '' : formatCpf(data.cpf || ''));
    setBirthDateInput(
      mustResubmit('birthDate')
        ? ''
        : data.birthDate
          ? formatBirthDateForDisplay(data.birthDate)
          : ''
    );
    setAgeConfirmed(data.ageConfirmed ?? false);
    setContentOwnershipConfirmed(data.contentOwnershipConfirmed ?? false);
    setAdultContentAware(data.adultContentAware ?? false);

    if (mustResubmit('contentType')) {
      setContentType('');
      setIsAdultContent(false);
    } else {
      setContentType(data.contentType || '');
      setIsAdultContent(data.isAdultContent ?? false);
    }

    setDocumentFrontFile(null);
    setDocumentFrontPreview(mustResubmit('documentFront') ? null : data.documentFront || null);
    setDocumentBackFile(null);
    setDocumentBackPreview(mustResubmit('documentBack') ? null : data.documentBack || null);
    setSelfieFile(null);
    setSelfiePreview(
      mustResubmit('selfieWithDocument') ? null : data.selfieWithDocument || null
    );
  }, []);

  useEffect(() => {
    if (visible) hydrateFromDisplayData(displayData);
  }, [visible, displayData, hydrateFromDisplayData]);

  const isFieldStillPendingCorrection = useCallback(
    (field: string): boolean => {
      if (!fieldsToReview.includes(field)) return false;
      switch (field) {
        case 'documentFront':
          return !documentFrontFile && !documentFrontPreview;
        case 'documentBack':
          return !documentBackFile && !documentBackPreview;
        case 'selfieWithDocument':
          return !selfieFile && !selfiePreview;
        case 'cpf':
          return digitsOnly(cpf).length !== 11;
        case 'birthDate':
          return !parseBirthDateInput(birthDateInput);
        case 'contentType':
          return !contentType;
        default:
          return true;
      }
    },
    [
      fieldsToReview,
      documentFrontFile,
      documentFrontPreview,
      documentBackFile,
      documentBackPreview,
      selfieFile,
      selfiePreview,
      cpf,
      birthDateInput,
      contentType,
    ]
  );

  const pendingFieldsToReview = useMemo(
    () => fieldsToReview.filter(isFieldStillPendingCorrection),
    [fieldsToReview, isFieldStillPendingCorrection]
  );

  const needsFieldCorrection = (field: string) => pendingFieldsToReview.includes(field);

  const showCorrectionAlert =
    displayData?.status === 'needs_review' && fieldsToReview.length === 0
      ? true
      : pendingFieldsToReview.length > 0 &&
        (displayData?.status === 'rejected' || displayData?.status === 'needs_review');

  useEffect(() => {
    if (!isCorrectionOnlyMode || !displayData) return;

    if (!canEditField('cpf') && displayData.cpf) {
      const formatted = formatCpf(displayData.cpf);
      if (cpf !== formatted) setCpf(formatted);
    }
    if (!canEditField('birthDate') && displayData.birthDate) {
      const formatted = formatBirthDateForDisplay(displayData.birthDate);
      if (birthDateInput !== formatted) setBirthDateInput(formatted);
    }
    if (!canEditField('contentType') && displayData.contentType) {
      if (contentType !== displayData.contentType) setContentType(displayData.contentType);
      if (isAdultContent !== (displayData.isAdultContent ?? false)) {
        setIsAdultContent(displayData.isAdultContent ?? false);
      }
    }
    if (!canEditField('documentFront') && displayData.documentFront && !documentFrontPreview) {
      setDocumentFrontPreview(displayData.documentFront);
      setDocumentFrontFile(null);
    }
    if (!canEditField('documentBack') && displayData.documentBack && !documentBackPreview) {
      setDocumentBackPreview(displayData.documentBack);
      setDocumentBackFile(null);
    }
    if (
      !canEditField('selfieWithDocument') &&
      displayData.selfieWithDocument &&
      !selfiePreview
    ) {
      setSelfiePreview(displayData.selfieWithDocument);
      setSelfieFile(null);
    }
  }, [
    isCorrectionOnlyMode,
    displayData,
    canEditField,
    cpf,
    birthDateInput,
    contentType,
    isAdultContent,
    documentFrontPreview,
    documentBackPreview,
    selfiePreview,
  ]);

  const handleCpfChange = (value: string) => {
    if (!canEditField('cpf')) return;
    setCpf(formatCpf(value));
  };

  const handlePick = async (doc: DocKey) => {
    const fieldMap: Record<DocKey, string> = {
      documentFront: 'documentFront',
      documentBack: 'documentBack',
      selfieWithDocument: 'selfieWithDocument',
    };
    const field = fieldMap[doc];
    if (!canEditField(field)) {
      showToast.error('Bloqueado', 'Este item já estava correto e não pode ser alterado.');
      return;
    }
    setPickingDoc(doc);
    try {
      const picked = await pickSellerImage();
      if (!picked) return;
      if (doc === 'documentFront') {
        setDocumentFrontFile(picked);
        setDocumentFrontPreview(picked.uri);
      } else if (doc === 'documentBack') {
        setDocumentBackFile(picked);
        setDocumentBackPreview(picked.uri);
      } else {
        setSelfieFile(picked);
        setSelfiePreview(picked.uri);
      }
    } finally {
      setPickingDoc(null);
    }
  };

  const handleClear = (doc: DocKey) => {
    const fieldMap: Record<DocKey, string> = {
      documentFront: 'documentFront',
      documentBack: 'documentBack',
      selfieWithDocument: 'selfieWithDocument',
    };
    if (!canEditField(fieldMap[doc])) {
      showToast.error('Bloqueado', 'Este item já estava correto e não pode ser removido.');
      return;
    }
    if (doc === 'documentFront') {
      setDocumentFrontFile(null);
      setDocumentFrontPreview(null);
    } else if (doc === 'documentBack') {
      setDocumentBackFile(null);
      setDocumentBackPreview(null);
    } else {
      setSelfieFile(null);
      setSelfiePreview(null);
    }
  };

  const appendFile = (formData: FormData, key: string, file: PickedImage, fallbackName: string) => {
    formData.append(key, {
      uri: file.uri,
      type: file.mimeType || 'image/jpeg',
      name: file.fileName || fallbackName,
    } as unknown as Blob);
  };

  const handleSubmit = async () => {
    const requiresField = (field: string) => !isReviewMode || mustResubmitField(field);

    const cpfNumbers = digitsOnly(cpf);
    if (requiresField('cpf')) {
      if (!cpf || cpfNumbers.length !== 11) {
        showToast.error('CPF', 'CPF deve ter 11 dígitos');
        return;
      }
      if (!isValidCpf(cpf)) {
        showToast.error('CPF', 'CPF inválido. Verifique os dígitos.');
        return;
      }
    } else if (cpfNumbers.length !== 11) {
      showToast.error('CPF', 'CPF ausente. Recarregue ou entre em contato com o suporte.');
      return;
    }

    const birthParsed = parseBirthDateInput(birthDateInput);
    if (requiresField('birthDate') && !birthParsed) {
      showToast.error('Data', 'Informe a data de nascimento (DD/MM/AAAA)');
      return;
    }
    if (!birthParsed) {
      showToast.error('Data', 'Data de nascimento é obrigatória');
      return;
    }
    if (getAgeFromBirthDate(birthParsed) < 18) {
      showToast.error('Idade', 'Você deve ser maior de 18 anos');
      return;
    }

    if (!ageConfirmed || !contentOwnershipConfirmed || !adultContentAware) {
      showToast.error('Termos', 'Confirme todos os termos obrigatórios');
      return;
    }

    if (requiresField('contentType') && !contentType) {
      showToast.error('Conteúdo', 'Selecione o tipo de conteúdo');
      return;
    }
    if (!contentType) {
      showToast.error('Conteúdo', 'Selecione o tipo de conteúdo');
      return;
    }

    const hasDocument = (
      field: DocKey,
      file: PickedImage | null,
      preview: string | null
    ) => {
      if (!requiresField(field)) {
        return Boolean(file || preview || displayData?.[field]);
      }
      return Boolean(file || preview);
    };

    const missingDocs: string[] = [];
    if (!hasDocument('documentFront', documentFrontFile, documentFrontPreview)) {
      missingDocs.push('frente do documento');
    }
    if (!hasDocument('documentBack', documentBackFile, documentBackPreview)) {
      missingDocs.push('verso do documento');
    }
    if (!hasDocument('selfieWithDocument', selfieFile, selfiePreview)) {
      missingDocs.push('selfie com documento');
    }
    if (missingDocs.length > 0) {
      showToast.error(
        'Documentos',
        isReviewMode
          ? `Envie novamente: ${missingDocs.join(', ')}.`
          : 'Documento frente, verso e selfie são obrigatórios'
      );
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('cpf', cpfNumbers);
      formData.append('birthDate', birthParsed.toISOString());
      formData.append('ageConfirmed', 'true');
      formData.append('contentOwnershipConfirmed', 'true');
      formData.append('adultContentAware', 'true');
      formData.append('contentType', contentType);
      formData.append('isAdultContent', String(isAdultContent));

      if (documentFrontFile) appendFile(formData, 'documentFront', documentFrontFile, 'document_front.jpg');
      if (documentBackFile) appendFile(formData, 'documentBack', documentBackFile, 'document_back.jpg');
      if (selfieFile) appendFile(formData, 'selfieWithDocument', selfieFile, 'selfie.jpg');

      const response = await sellerVerificationApi.submitVerification(formData);
      if (response.success) {
        showToast.success('Enviado', 'Dados enviados! Aguarde a aprovação.');
        onSuccess((response.data ?? {}) as SellerVerificationFormData);
        onClose();
      } else {
        showToast.error('Erro', response.message || 'Erro ao enviar dados');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string }; status?: number }; message?: string };
      let msg = err.response?.data?.message || err.message || 'Erro ao enviar verificação';
      if (err.response?.status === 413) {
        msg = 'Arquivos muito grandes. Cada imagem pode ter no máximo 30 MB.';
      }
      showToast.error('Erro', String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  const modalTitle = isReviewMode
    ? displayData?.status === 'rejected'
      ? 'Corrigir e reenviar cadastro'
      : 'Revisar cadastro de vendedor'
    : 'Cadastro de vendedor';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{modalTitle}</Text>
            <TouchableOpacity onPress={handleClose} disabled={submitting}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {showCorrectionAlert ? (
              <View
                style={[
                  styles.alert,
                  displayData?.status === 'rejected' ? styles.alertError : styles.alertWarning,
                ]}
              >
                <Text style={styles.alertTitle}>
                  {displayData?.status === 'rejected'
                    ? 'Cadastro não aprovado — corrija os itens abaixo'
                    : 'Revisão necessária'}
                </Text>
                {(displayData?.rejectionReason || displayData?.needsReviewReason) ? (
                  <Text style={styles.alertBody}>
                    {displayData.rejectionReason || displayData.needsReviewReason}
                  </Text>
                ) : null}
                {pendingFieldsToReview.length > 0 ? (
                  <>
                    <Text style={styles.alertHint}>
                      Ainda falta corrigir os itens abaixo. Se remover um arquivo enviado, ele
                      volta para esta lista.
                    </Text>
                    {pendingFieldsToReview.map((field) => (
                      <Text key={field} style={styles.alertListItem}>
                        • {getSellerVerificationFieldLabel(field)}
                      </Text>
                    ))}
                  </>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Dados pessoais</Text>
            <View
              style={[
                styles.personalRow,
                !twoColumnPersonal && styles.personalCol,
                (needsFieldCorrection('cpf') || needsFieldCorrection('birthDate')) &&
                  styles.sectionHighlight,
              ]}
            >
              <View style={[styles.fieldHalf, !twoColumnPersonal && styles.fieldFull]}>
                <Text style={styles.label}>CPF{canEditField('cpf') ? ' *' : ''}</Text>
                <TextInput
                  style={[styles.input, !canEditField('cpf') && styles.inputDisabled]}
                  value={cpf}
                  onChangeText={handleCpfChange}
                  placeholder="000.000.000-00"
                  placeholderTextColor={COLORS.text.tertiary}
                  keyboardType="numeric"
                  maxLength={14}
                  editable={canEditField('cpf') && !submitting}
                />
                {!canEditField('cpf') ? (
                  <Text style={styles.fieldHint}>{LOCKED_HINT}</Text>
                ) : null}
              </View>
              <View style={[styles.fieldHalf, !twoColumnPersonal && styles.fieldFull]}>
                <Text style={styles.label}>
                  Data de nascimento{canEditField('birthDate') ? ' *' : ''}
                </Text>
                <TextInput
                  style={[styles.input, !canEditField('birthDate') && styles.inputDisabled]}
                  value={birthDateInput}
                  onChangeText={(t) => {
                    if (canEditField('birthDate')) setBirthDateInput(t);
                  }}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={COLORS.text.tertiary}
                  editable={canEditField('birthDate') && !submitting}
                />
                {!canEditField('birthDate') ? (
                  <Text style={styles.fieldHint}>{LOCKED_HINT}</Text>
                ) : null}
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              Documentos
              {isCorrectionOnlyMode ? (
                <Text style={styles.sectionSubtitle}>
                  {' '}
                  (todos aparecem; só os do alerta podem ser alterados)
                </Text>
              ) : null}
            </Text>

            <View style={[styles.docsGrid, !twoColumnDocs && styles.docsCol]}>
              <View style={[styles.docHalf, !twoColumnDocs && styles.fieldFull]}>
                <SellerDocumentUploadField
                  label="Documento — Frente"
                  required={canEditField('documentFront')}
                  viewOnly={!canEditField('documentFront')}
                  highlight={needsFieldCorrection('documentFront')}
                  previewUri={documentFrontPreview}
                  placeholderText="Toque para enviar a frente"
                  helperText={
                    canEditField('documentFront')
                      ? SELLER_VERIFICATION_UPLOAD_HELPER_TEXT
                      : LOCKED_HINT
                  }
                  onPick={() => handlePick('documentFront')}
                  onClear={() => handleClear('documentFront')}
                  picking={pickingDoc === 'documentFront'}
                />
              </View>
              <View style={[styles.docHalf, !twoColumnDocs && styles.fieldFull]}>
                <SellerDocumentUploadField
                  label="Documento — Verso"
                  required={canEditField('documentBack')}
                  viewOnly={!canEditField('documentBack')}
                  highlight={needsFieldCorrection('documentBack')}
                  previewUri={documentBackPreview}
                  placeholderText="Toque para enviar o verso"
                  helperText={
                    canEditField('documentBack')
                      ? SELLER_VERIFICATION_UPLOAD_HELPER_TEXT
                      : LOCKED_HINT
                  }
                  onPick={() => handlePick('documentBack')}
                  onClear={() => handleClear('documentBack')}
                  picking={pickingDoc === 'documentBack'}
                />
              </View>
              <View style={styles.selfieSpan}>
                <SellerDocumentUploadField
                  label="Selfie com documento"
                  required={canEditField('selfieWithDocument')}
                  viewOnly={!canEditField('selfieWithDocument')}
                  highlight={needsFieldCorrection('selfieWithDocument')}
                  previewUri={selfiePreview}
                  placeholderText="Selfie segurando o documento ao lado do rosto"
                  helperText={
                    canEditField('selfieWithDocument')
                      ? SELLER_VERIFICATION_UPLOAD_HELPER_TEXT
                      : LOCKED_HINT
                  }
                  onPick={() => handlePick('selfieWithDocument')}
                  onClear={() => handleClear('selfieWithDocument')}
                  picking={pickingDoc === 'selfieWithDocument'}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Tipo de conteúdo</Text>
            <View
              style={[
                needsFieldCorrection('contentType') ? styles.sectionHighlight : undefined,
              ]}
            >
              {canEditField('contentType') ? (
                <SelectRow
                  label="Tipo"
                  value={contentType}
                  options={CONTENT_TYPE_OPTIONS}
                  onChange={setContentType}
                  size="full"
                />
              ) : (
                <View>
                  <Text style={styles.label}>Tipo de conteúdo</Text>
                  <Text style={[styles.input, styles.inputDisabled, styles.readonlyValue]}>
                    {CONTENT_TYPE_OPTIONS.find((o) => o.value === contentType)?.label ||
                      contentType ||
                      '—'}
                  </Text>
                  <Text style={styles.fieldHint}>{LOCKED_HINT}</Text>
                </View>
              )}
              <View style={styles.switchRow}>
                <Switch
                  value={isAdultContent}
                  onValueChange={setIsAdultContent}
                  disabled={!canEditField('contentType') || submitting}
                />
                <Text
                  style={[
                    styles.switchLabel,
                    !canEditField('contentType') && { color: COLORS.text.tertiary },
                  ]}
                >
                  Conteúdo adulto (+18)
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              Confirmações
              {isCorrectionOnlyMode ? (
                <Text style={styles.sectionSubtitle}> (já aceitas no envio anterior)</Text>
              ) : null}
            </Text>
            <View style={isCorrectionOnlyMode ? styles.termsDisabled : undefined}>
              <View style={styles.switchRow}>
                <Switch
                  value={ageConfirmed}
                  onValueChange={setAgeConfirmed}
                  disabled={isCorrectionOnlyMode || submitting}
                />
                <Text style={styles.switchLabel}>Confirmo que sou maior de 18 anos</Text>
              </View>
              <View style={styles.switchRow}>
                <Switch
                  value={contentOwnershipConfirmed}
                  onValueChange={setContentOwnershipConfirmed}
                  disabled={isCorrectionOnlyMode || submitting}
                />
                <Text style={styles.switchLabel}>
                  Confirmo que o conteúdo que vou vender é de minha autoria
                </Text>
              </View>
              <View style={styles.switchRow}>
                <Switch
                  value={adultContentAware}
                  onValueChange={setAdultContentAware}
                  disabled={isCorrectionOnlyMode || submitting}
                />
                <Text style={styles.switchLabel}>
                  Estou ciente da responsabilidade por conteúdos que publicar
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerBtn, styles.cancelBtn]}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, styles.submitBtn, submitting && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isReviewMode ? 'Reenviar correção' : 'Enviar para aprovação'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
    paddingRight: 8,
  },
  scroll: { flexGrow: 0 },
  scrollContent: { padding: 16, paddingBottom: 24, gap: 4 },
  alert: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  alertError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: COLORS.states.error,
  },
  alertWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: COLORS.states.warning,
  },
  alertTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text.primary },
  alertBody: { fontSize: 13, color: COLORS.text.primary, lineHeight: 18 },
  alertHint: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4 },
  alertListItem: { fontSize: 12, fontWeight: '600', color: COLORS.states.error },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionSubtitle: { fontSize: 11, fontWeight: '400', color: COLORS.text.secondary },
  sectionHighlight: {
    borderWidth: 2,
    borderColor: COLORS.states.error,
    borderRadius: 10,
    padding: 8,
    marginBottom: 4,
  },
  personalRow: { flexDirection: 'row', gap: 12 },
  personalCol: { flexDirection: 'column' },
  fieldHalf: { flex: 1, minWidth: 0 },
  fieldFull: { width: '100%', flex: undefined },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.paper,
  },
  inputDisabled: {
    backgroundColor: COLORS.background.tertiary,
    color: COLORS.text.secondary,
  },
  readonlyValue: { paddingVertical: 12 },
  fieldHint: { fontSize: 11, color: COLORS.text.secondary, marginTop: 4 },
  docsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  docsCol: { flexDirection: 'column' },
  docHalf: { width: '48%', minWidth: 0, flexGrow: 1 },
  selfieSpan: { width: '100%' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  switchLabel: { flex: 1, fontSize: 13, color: COLORS.text.primary, lineHeight: 18 },
  termsDisabled: { opacity: 1 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelBtn: {
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary },
  submitBtn: { backgroundColor: COLORS.secondary.main },
  submitDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
