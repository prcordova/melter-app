import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../../theme/colors';
import { showToast } from '../../CustomToast';
import { useAuth } from '../../../contexts/AuthContext';

interface ContentStepProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ContentStep({ formData, setFormData }: ContentStepProps) {
  const { user } = useAuth();
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

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

        const newFiles: any[] = [];
        for (let i = 0; i < result.assets.length; i++) {
          const asset = result.assets[i];
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

          newFiles.push(newFile);
        }

        setFormData({
          ...formData,
          files: [...formData.files, ...newFiles],
        });

        showToast.success('Sucesso', `${newFiles.length} arquivo(s) adicionado(s)`);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="folder-outline" size={24} color={COLORS.secondary.main} />
        <Text style={styles.title}>Adicionar Conteúdo</Text>
      </View>

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
          <View style={styles.filesList}>
            {formData.files.map((file: any) => (
              <View key={file.id} style={styles.fileCard}>
                <View style={styles.fileInfo}>
                  <Ionicons name="document-outline" size={24} color={COLORS.text.secondary} />
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
});

