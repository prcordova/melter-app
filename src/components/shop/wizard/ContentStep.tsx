import React, { useState, useEffect } from 'react';
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
import { COLORS } from '../../../theme/colors';
import { showToast } from '../../CustomToast';
import { useAuth } from '../../../contexts/AuthContext';
import { PLAN_LIMITS, validateFileSize, PlanType } from '../../../config/plan-features';

interface ContentStepProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ContentStep({ formData, setFormData }: ContentStepProps) {
  const { user } = useAuth();
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [fileSizeErrors, setFileSizeErrors] = useState<string[]>([]);

  // Validar arquivos existentes sempre que o componente for renderizado
  useEffect(() => {
    if (formData.files && formData.files.length > 0) {
      const userPlan = (user?.plan?.type || 'FREE') as PlanType;
      const planLimits = PLAN_LIMITS[userPlan];
      const maxFileSize = planLimits.maxFileSizePerFile * 1024 * 1024;
      const maxTotalSize = planLimits.maxTotalFileSize * 1024 * 1024;

      const errors: string[] = [];
      const currentTotalSize = formData.files.reduce((total: number, file: any) => total + (file.size || 0), 0);

      // Verificar se o tamanho total excede o limite
      if (currentTotalSize > maxTotalSize) {
        errors.push(`Limite total de tamanho atingido (máx ${planLimits.maxTotalFileSize}MB)`);
      }

      // Verificar cada arquivo individual
      formData.files.forEach((file: any) => {
        if (file.size > maxFileSize) {
          errors.push(`${file.name}: Arquivo muito grande (máx ${planLimits.maxFileSizePerFile}MB)`);
        }
      });

      setFileSizeErrors(errors);
    } else {
      setFileSizeErrors([]);
    }
  }, [formData.files, user?.plan?.type]);

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

        // Obter limites do plano do usuário
        const userPlan = (user?.plan?.type || 'FREE') as PlanType;
        const planLimits = PLAN_LIMITS[userPlan];
        const maxFileSize = planLimits.maxFileSizePerFile * 1024 * 1024; // converter MB para bytes
        const maxTotalSize = planLimits.maxTotalFileSize * 1024 * 1024; // converter MB para bytes

        for (let i = 0; i < result.assets.length; i++) {
          const asset = result.assets[i];
          const fileSize = asset.fileSize || 0;

          // Validar tamanho do arquivo
          const validation = validateFileSize(userPlan, fileSize, currentTotalSize + validFiles.reduce((sum, f) => sum + f.size, 0));
          
          if (!validation.valid) {
            errors.push(`${asset.fileName || `arquivo_${i}`}: ${validation.error}`);
            continue;
          }

          if (fileSize > maxFileSize) {
            errors.push(`${asset.fileName || `arquivo_${i}`}: Arquivo muito grande (máx ${planLimits.maxFileSizePerFile}MB)`);
            continue;
          }

          const newTotalSize = currentTotalSize + validFiles.reduce((sum, f) => sum + f.size, 0) + fileSize;
          if (newTotalSize > maxTotalSize) {
            errors.push(`${asset.fileName || `arquivo_${i}`}: Limite total de tamanho atingido (máx ${planLimits.maxTotalFileSize}MB)`);
            continue;
          }

          validFiles.push(asset);
        }

        if (errors.length > 0) {
          setFileSizeErrors(errors);
          showToast.error('Erro', 'Alguns arquivos excedem os limites do seu plano atual');
        }

        // Processar apenas arquivos válidos
        for (let i = 0; i < validFiles.length; i++) {
          const asset = validFiles[i];
          const fileId = Date.now().toString() + i;

          // Simular progresso
          for (let progress = 0; progress <= 100; progress += 20) {
            setUploadProgress((prev) => ({ ...prev, [fileId]: progress }));
            await new Promise((resolve) => setTimeout(resolve, 50));
          }

          const newFile = {
            id: fileId,
            name: asset.fileName || `arquivo_${i}.${asset.uri.split('.').pop()}`,
            size: asset.fileSize || 0,
            type: asset.mimeType || 'application/octet-stream',
            file: asset, // Manter o arquivo original para upload posterior
            url: null, // URL será definida após upload
            uri: asset.uri,
          };

          setFormData({
            ...formData,
            files: [...formData.files, newFile],
          });
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

  const handleRemoveFile = (id: string) => {
    setFormData({
      ...formData,
      files: formData.files.filter((file: any) => file.id !== id),
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalFileSize = () => {
    return formData.files.reduce((total: number, file: any) => total + (file.size || 0), 0);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Ionicons name="image-outline" size={24} color={COLORS.text.secondary} />;
    } else if (mimeType.startsWith('video/')) {
      return <Ionicons name="videocam-outline" size={24} color={COLORS.text.secondary} />;
    } else if (mimeType.includes('pdf')) {
      return <Ionicons name="document-text-outline" size={24} color={COLORS.text.secondary} />;
    } else {
      return <Ionicons name="document-outline" size={24} color={COLORS.text.secondary} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="folder-outline" size={24} color={COLORS.secondary.main} />
        <Text style={styles.title}>Adicionar Conteúdo</Text>
      </View>

      {fileSizeErrors.length > 0 && (
        <View style={styles.alertWarning}>
          <Text style={styles.alertWarningTitle}>🚀 Limite de tamanho atingido!</Text>
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

      {/* Arquivos */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📁 Arquivos</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handlePickFiles}
            disabled={uploadingFiles}
            activeOpacity={0.7}
          >
            {uploadingFiles ? (
              <ActivityIndicator size="small" color={COLORS.secondary.main} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color={COLORS.secondary.main} />
                <Text style={styles.addButtonText}>Adicionar Arquivo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {formData.files.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nenhum arquivo adicionado ainda</Text>
          </View>
        ) : (
          <>
            <View style={styles.filesList}>
              {formData.files.map((file: any) => (
                <View key={file.id} style={styles.fileCard}>
                  {/* Preview para imagens e vídeos */}
                  {file.uri && (file.type.startsWith('image/') || file.type.startsWith('video/')) ? (
                    <Image source={{ uri: file.uri }} style={styles.fileThumbnail} />
                  ) : (
                    <View style={styles.fileIconContainer}>
                      {getFileIcon(file.type)}
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
                      onPress={() => handleRemoveFile(file.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={20} color={COLORS.states.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
            {/* Resumo do tamanho total */}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                📊 Total: {formatFileSize(getTotalFileSize())} / {PLAN_LIMITS[(user?.plan?.type || 'FREE') as PlanType].maxTotalFileSize}MB
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Links (Opcional) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔗 Links Externos (Opcional)</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddLink} activeOpacity={0.7}>
            <Ionicons name="link-outline" size={18} color={COLORS.secondary.main} />
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
                    <Ionicons name="close-circle" size={20} color={COLORS.states.error} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>URL *</Text>
                  <TextInput
                    style={styles.input}
                    value={link.url}
                    onChangeText={(value) => handleLinkChange(link.id, 'url', value)}
                    placeholder="https://drive.google.com/file/d/..."
                    placeholderTextColor={COLORS.text.tertiary}
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
                    placeholderTextColor={COLORS.text.tertiary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Descrição</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={link.description}
                    onChangeText={(value) => handleLinkChange(link.id, 'description', value)}
                    placeholder="Descrição do link (opcional)"
                    placeholderTextColor={COLORS.text.tertiary}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  section: {
    marginBottom: 24,
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
    color: COLORS.text.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary.main,
  },
  emptyBox: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  linksList: {
    gap: 12,
  },
  linkCard: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
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
    color: COLORS.text.primary,
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
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  filesList: {
    gap: 8,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
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
    color: COLORS.text.primary,
  },
  fileSize: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  progressContainer: {
    flex: 1,
    marginLeft: 12,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: COLORS.background.paper,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.secondary.main,
  },
  progressText: {
    fontSize: 10,
    color: COLORS.text.secondary,
  },
  alertWarning: {
    backgroundColor: COLORS.states.warning + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.states.warning,
  },
  alertWarningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.states.warning,
    marginBottom: 4,
  },
  alertWarningText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  alertWarningListItem: {
    fontSize: 12,
    color: COLORS.text.secondary,
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
    backgroundColor: COLORS.background.paper,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryBox: {
    backgroundColor: COLORS.states.info + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.states.info,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.states.info,
  },
});

