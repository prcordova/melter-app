import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../../contexts/ThemeContext';
import type { AppPalette } from '../../../theme/palettes';
import { showToast } from '../../CustomToast';
import { useAuth } from '../../../contexts/AuthContext';
import { getProductCreationStorageLimits, validateFileSize, PlanType } from '../../../config/plan-features';
import { getImageUrl } from '../../../utils/image';
import type { PackContentDeliveryMode } from '../ProductCreationWizard';
import { Button } from '../../Button';
import { productsApi } from '../../../services/products';
import { scrollFieldIntoView } from './scroll-field-into-view';

export type ProductStorageOptions = Parameters<typeof getProductCreationStorageLimits>[1];

interface ContentStepProps {
  formData: any;
  setFormData: (data: any) => void;
  isEditing?: boolean;
  /** Produto/rascunho no servidor — remover arquivo hospedado apaga do storage. */
  productId?: string | null;
  showMediaRequiredError?: boolean;
  storageOptions?: ProductStorageOptions;
  scrollRef?: { current: any };
  scrollYRef?: { current: number };
  focusField?: string | null;
  focusNonce?: number;
  issueFields?: string[];
}

export function ContentStep({
  formData,
  setFormData,
  isEditing = false,
  productId = null,
  showMediaRequiredError = false,
  storageOptions,
  scrollRef,
  scrollYRef,
  focusField = null,
  focusNonce = 0,
  issueFields = [],
}: ContentStepProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const deliveryRef = useRef<any>(null);
  const filesRef = useRef<any>(null);

  useEffect(() => {
    if (!focusNonce || !focusField) return;
    const target = focusField === 'delivery' ? deliveryRef : focusField === 'files' ? filesRef : null;
    if (!target) return;
    const timer = setTimeout(() => {
      scrollFieldIntoView(scrollRef, target, scrollYRef?.current ?? 0);
    }, 320);
    return () => clearTimeout(timer);
  }, [focusNonce, focusField, scrollRef, scrollYRef]);
  const { user } = useAuth();
  const userPlan = (user?.plan?.type || 'FREE') as PlanType;
  const storageLimits = useMemo(
    () => getProductCreationStorageLimits(userPlan, storageOptions),
    [userPlan, storageOptions]
  );
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [fileSizeErrors, setFileSizeErrors] = useState<string[]>([]);

  // Validar arquivos existentes sempre que o componente for renderizado
  useEffect(() => {
    if (formData.files && formData.files.length > 0) {
      const maxFileSize = storageLimits.maxFileSizePerFileBytes;
      const maxTotalSize = storageLimits.maxTotalFileSizeBytes;

      const errors: string[] = [];
      const currentTotalSize = formData.files.reduce((total: number, file: any) => total + (file.size || 0), 0);

      if (currentTotalSize > maxTotalSize) {
        errors.push(`Limite total de tamanho atingido (máx ${storageLimits.maxTotalFileSizeMb}MB)`);
      }

      formData.files.forEach((file: any) => {
        if (file.size > maxFileSize) {
          errors.push(`${file.name}: Arquivo muito grande (máx ${storageLimits.maxFileSizePerFileMb}MB)`);
        }
      });

      setFileSizeErrors(errors);
    } else {
      setFileSizeErrors([]);
    }
  }, [formData.files, storageLimits]);

  const handleAddLink = () => {
    const newLink = {
      id: Date.now().toString(),
      url: '',
      title: '',
      description: '',
    };

    setFormData({
      ...formData,
      links: [...formData.links, newLink],
    });
  };

  const handleLinkChange = (id: string, field: string, value: string) => {
    setFormData({
      ...formData,
      links: formData.links.map((link: any) =>
        link.id === id ? { ...link, [field]: value } : link
      ),
    });
  };

  const handleRemoveLink = (id: string) => {
    setFormData({
      ...formData,
      links: formData.links.filter((link: any) => link.id !== id),
    });
  };

  const handlePickFiles = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast.error('Permissão negada', 'Precisamos de acesso à galeria');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        allowsMultipleSelection: true, // Suportado em versões recentes do expo-image-picker
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingFiles(true);
        setFileSizeErrors([]);

        const errors: string[] = [];
        const validFiles: any[] = [];

        // Calcular tamanho total atual
        const currentTotalSize = formData.files.reduce((total: number, file: any) => total + (file.size || 0), 0);

        const maxFileSize = storageLimits.maxFileSizePerFileBytes;
        const maxTotalSize = storageLimits.maxTotalFileSizeBytes;

        for (let i = 0; i < result.assets.length; i++) {
          const asset = result.assets[i];
          const fileSize = asset.fileSize || 0;

          // Validar tamanho do arquivo
          const validation = validateFileSize(
            userPlan,
            fileSize,
            currentTotalSize + validFiles.reduce((sum, f) => sum + f.size, 0),
            storageOptions
          );
          
          if (!validation.valid) {
            errors.push(`${asset.fileName || `arquivo_${i}`}: ${validation.error}`);
            continue;
          }

          if (fileSize > maxFileSize) {
            errors.push(`${asset.fileName || `arquivo_${i}`}: Arquivo muito grande (máx ${storageLimits.maxFileSizePerFileMb}MB)`);
            continue;
          }

          const newTotalSize = currentTotalSize + validFiles.reduce((sum, f) => sum + f.size, 0) + fileSize;
          if (newTotalSize > maxTotalSize) {
            errors.push(`${asset.fileName || `arquivo_${i}`}: Limite total de tamanho atingido (máx ${storageLimits.maxTotalFileSizeMb}MB)`);
            continue;
          }

          validFiles.push(asset);
        }

        if (errors.length > 0) {
          setFileSizeErrors(errors);
          showToast.error('Erro', 'Alguns arquivos excedem os limites do seu plano atual');
        }

        const batchId = Date.now().toString();
        const newFiles = validFiles.map((asset, i) => ({
          id: `${batchId}-${i}`,
          name: asset.fileName || `arquivo_${i}.${asset.uri.split('.').pop()}`,
          size: asset.fileSize || 0,
          type: asset.mimeType || 'application/octet-stream',
          file: asset, // enviado ao S3 no publish (rascunho)
          url: null,
          uri: asset.uri,
        }));

        if (newFiles.length > 0) {
          setFormData((prev: any) => ({
            ...prev,
            files: [...(prev.files || []), ...newFiles],
          }));
        }

        if (validFiles.length > 0) {
          showToast.success('Sucesso', `${validFiles.length} arquivo(s) adicionado(s)`);
        }
        setUploadingFiles(false);
        setUploadProgress({});
      }
    } catch (error) {
      console.error('[ContentStep] Erro ao selecionar arquivos:', error);
      showToast.error('Erro', 'Não foi possível selecionar os arquivos');
      setUploadingFiles(false);
    }
  };

  const [removingFileId, setRemovingFileId] = useState<string | null>(null);

  const handleRemoveFile = async (id: string) => {
    const target = formData.files.find((file: any) => file.id === id);
    if (!target) return;

    if (target.existing && target.url && productId) {
      setRemovingFileId(id);
      try {
        const res = await productsApi.deleteUploadedFile(productId, target.url);
        if (!res.success) {
          showToast.error('Erro', res.message || 'Erro ao remover arquivo');
          return;
        }
      } catch {
        showToast.error('Erro', 'Erro ao remover arquivo');
        return;
      } finally {
        setRemovingFileId(null);
      }
    }

    setFormData((prev: any) => ({
      ...prev,
      files: (prev.files || []).filter((file: any) => file.id !== id),
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType?: string | null, fileType?: string | null) => {
    const m = mimeType || '';
    if (m.startsWith('image/') || fileType === 'image') {
      return <Ionicons name="image-outline" size={24} color={colors.text.secondary} />;
    }
    if (m.startsWith('video/') || fileType === 'video') {
      return <Ionicons name="videocam-outline" size={24} color={colors.text.secondary} />;
    }
    if (m.includes('pdf')) {
      return <Ionicons name="document-text-outline" size={24} color={colors.text.secondary} />;
    }
    return <Ionicons name="document-outline" size={24} color={colors.text.secondary} />;
  };

  const isImageOrVideoPreview = (file: any) => {
    const t = file?.type;
    const ft = file?.fileType;
    if (typeof t === 'string') {
      if (t.startsWith('image/') || t.startsWith('video/')) return true;
    }
    return ft === 'image' || ft === 'video';
  };

  const needsDeliveryChoice = !isEditing && !formData.contentDeliveryMode;
  const showLinksSection = formData.contentDeliveryMode === 'FILES_AND_LINKS';

  const selectDeliveryMode = (mode: PackContentDeliveryMode) => {
    setFormData({
      ...formData,
      contentDeliveryMode: mode,
      links: mode === 'FILES_ONLY' ? [] : formData.links,
    });
  };

  if (needsDeliveryChoice) {
    return (
      <View
        ref={deliveryRef}
        style={[styles.container, issueFields.includes('delivery') && styles.highlight]}
      >
        <Text style={styles.title}>O que você vai enviar neste pacote?</Text>
        <Text style={styles.subtitle}>
          Todo pacote precisa de pelo menos um arquivo de mídia na Melter. Links externos são
          opcionais e não substituem arquivos.
        </Text>

        <TouchableOpacity
          style={styles.choiceCard}
          onPress={() => selectDeliveryMode('FILES_ONLY')}
          activeOpacity={0.85}
        >
          <Ionicons name="folder-outline" size={32} color={colors.secondary.main} />
          <Text style={styles.choiceTitle}>Só arquivos</Text>
          <Text style={styles.choiceDescription}>
            Imagens, vídeos ou documentos que o comprador acessa na Melter.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.choiceCard}
          onPress={() => selectDeliveryMode('FILES_AND_LINKS')}
          activeOpacity={0.85}
        >
          <View style={styles.choiceIconRow}>
            <Ionicons name="folder-outline" size={28} color={colors.secondary.main} />
            <Ionicons name="link-outline" size={24} color={colors.text.secondary} />
          </View>
          <Text style={styles.choiceTitle}>Arquivos + links</Text>
          <Text style={styles.choiceDescription}>
            Mídia na Melter e links extras (Drive, site, etc.) para o comprador.
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showMediaRequiredError ? (
        <View style={styles.alertWarning}>
          <Text style={styles.alertWarningTitle}>Arquivo de mídia obrigatório</Text>
          <Text style={styles.alertWarningText}>
            Envie pelo menos um arquivo de mídia. Um link sozinho não é suficiente para criar o
            pacote.
          </Text>
        </View>
      ) : null}

      {fileSizeErrors.length > 0 && (
        <View style={styles.alertWarning}>
          <Text style={styles.alertWarningTitle}>Limite de tamanho atingido</Text>
          <Text style={styles.alertWarningText}>
            Faça upgrade do seu plano para ter acesso a mais espaço de armazenamento.
          </Text>
          {fileSizeErrors.map((error, index) => (
            <Text key={index} style={styles.alertWarningListItem}>
              • {error}
            </Text>
          ))}
        </View>
      )}

      <View
        ref={filesRef}
        style={[styles.section, issueFields.includes('files') && styles.highlight]}
      >
        <Text style={styles.sectionTitle}>Arquivos de mídia</Text>
        <View style={styles.addFilesRow}>
          <Button
            variant="primary"
            size="md"
            responsive={false}
            icon={<Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />}
            onPress={() => void handlePickFiles()}
            disabled={uploadingFiles}
            loading={uploadingFiles}
            accessibilityLabel="Adicionar arquivos"
          >
            Adicionar arquivos
          </Button>
        </View>

        {formData.files.length > 0 ? (
          <View style={styles.filesList}>
            {formData.files.map((file: any) => (
              <View key={file.id} style={styles.fileCard}>
                {/* Preview para imagens e vídeos */}
                {file.uri && isImageOrVideoPreview(file) ? (
                  <Image
                    source={{
                      uri:
                        /^https?:\/\//i.test(file.uri) || String(file.uri).startsWith('file:')
                          ? file.uri
                          : getImageUrl(file.uri) || file.uri,
                    }}
                    style={styles.fileThumbnail}
                  />
                ) : (
                  <View style={styles.fileIconContainer}>
                    {getFileIcon(file.type, file.fileType)}
                  </View>
                )}
                <View style={styles.fileInfo}>
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                  </View>
                </View>
                {uploadProgress[file.id] !== undefined ? (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[styles.progressBar, { width: `${uploadProgress[file.id]}%` }]}
                      />
                    </View>
                    <Text style={styles.progressText}>{uploadProgress[file.id]}%</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => void handleRemoveFile(file.id)}
                    style={styles.removeButton}
                    disabled={removingFileId !== null}
                  >
                    {removingFileId === file.id ? (
                      <ActivityIndicator size="small" color={colors.states.error} />
                    ) : (
                      <Ionicons name="close-circle" size={20} color={colors.states.error} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {showLinksSection && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Links externos</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddLink} activeOpacity={0.7}>
              <Ionicons name="link-outline" size={18} color={colors.text.secondary} />
              <Text style={styles.addButtonText}>Adicionar Link</Text>
            </TouchableOpacity>
          </View>

          {formData.links.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhum link adicionado ainda</Text>
            </View>
          ) : (
            <View style={styles.linksList}>
              {formData.links.map((link: any, index: number) => (
                <View key={link.id} style={styles.linkCard}>
                  <View style={styles.linkHeader}>
                    <Text style={styles.linkTitle}>Link {index + 1}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveLink(link.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.states.error} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>URL *</Text>
                    <TextInput
                      style={styles.input}
                      value={link.url}
                      onChangeText={(value) => handleLinkChange(link.id, 'url', value)}
                      placeholder="https://drive.google.com/file/d/..."
                      placeholderTextColor={colors.text.tertiary}
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Título</Text>
                    <TextInput
                      style={styles.input}
                      value={link.title}
                      onChangeText={(value) => handleLinkChange(link.id, 'title', value)}
                      placeholder="Título do link"
                      placeholderTextColor={colors.text.tertiary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Descrição</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={link.description}
                      onChangeText={(value) => handleLinkChange(link.id, 'description', value)}
                      placeholder="Descrição do link (opcional)"
                      placeholderTextColor={colors.text.tertiary}
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  choiceCard: {
    borderWidth: 1,
    borderColor: c.border.medium,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    backgroundColor: c.background.paper,
  },
  choiceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.text.primary,
    marginTop: 8,
  },
  choiceDescription: {
    fontSize: 14,
    color: c.text.secondary,
    marginTop: 4,
    lineHeight: 20,
  },
  choiceIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: `${c.secondary.main}14`,
    borderWidth: 1,
    borderColor: `${c.secondary.main}40`,
  },
  alertInfoText: {
    flex: 1,
    fontSize: 13,
    color: c.text.secondary,
    lineHeight: 18,
  },
  container: {
    gap: 20,
  },
  header: {
    marginBottom: 8,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: c.text.primary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: c.text.secondary,
  },
  section: {
    marginBottom: 24,
  },
  highlight: {
    borderWidth: 2,
    borderColor: c.states.warning,
    borderRadius: 12,
    padding: 8,
  },
  addFilesRow: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.background.tertiary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: c.border.light,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text.primary,
  },
  emptyBox: {
    backgroundColor: c.background.tertiary,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border.light,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: c.text.secondary,
  },
  linksList: {
    gap: 12,
  },
  linkCard: {
    backgroundColor: c.background.tertiary,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border.light,
  },
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text.primary,
  },
  removeButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: c.background.paper,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: c.text.primary,
    borderWidth: 1,
    borderColor: c.border.light,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  filesList: {
    gap: 8,
    marginTop: 12,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.background.tertiary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: c.border.light,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text.primary,
  },
  fileSize: {
    fontSize: 12,
    color: c.text.secondary,
    marginTop: 2,
  },
  progressContainer: {
    flex: 1,
    marginLeft: 12,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: c.background.paper,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: c.secondary.main,
  },
  progressText: {
    fontSize: 10,
    color: c.text.secondary,
  },
  alertWarning: {
    backgroundColor: c.background.tertiary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: c.border.medium,
  },
  alertWarningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 4,
  },
  alertWarningText: {
    fontSize: 12,
    color: c.text.secondary,
    marginBottom: 8,
  },
  alertWarningListItem: {
    fontSize: 12,
    color: c.text.secondary,
    marginLeft: 8,
    marginTop: 4,
  },
  fileThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  fileIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: c.background.paper,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
});

