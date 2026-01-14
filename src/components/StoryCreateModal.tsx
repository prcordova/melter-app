import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { storiesApi } from '../services/api';
import { COLORS } from '../theme/colors';
import { showToast } from './CustomToast';

const { width, height } = Dimensions.get('window');

interface StoryCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

export function StoryCreateModal({
  visible,
  onClose,
  onStoryCreated,
}: StoryCreateModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageSize, setSelectedImageSize] = useState<number | null>(null);
  const [storyText, setStoryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState<'followers' | 'friends'>('followers');
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setSelectedImageSize(result.assets[0].fileSize || null);
        setStoryText('');
      }
    } catch (error) {
      showToast.error('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showToast.error('Permissão negada', 'Precisamos de acesso à câmera para tirar fotos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setSelectedImageSize(result.assets[0].fileSize || null);
        setStoryText('');
      }
    } catch (error) {
      showToast.error('Erro', 'Não foi possível abrir a câmera');
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) return;

    try {
      setLoading(true);

      // 1. Obter informações do arquivo
      const filename = selectedImage.split('/').pop() || `story_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      let fileType = match ? `image/${match[1]}` : 'image/jpeg';
      
      // Normalizar tipo de arquivo (jpg -> jpeg)
      if (fileType === 'image/jpg') {
        fileType = 'image/jpeg';
      }
      
      // Obter tamanho do arquivo (usar do ImagePicker se disponível, senão buscar via fetch)
      let fileSize = selectedImageSize;
      if (!fileSize || fileSize === 0) {
        try {
          const response = await fetch(selectedImage);
          const blob = await response.blob();
          fileSize = blob.size;
        } catch (error) {
          console.error('[StoryCreate] Erro ao obter tamanho do arquivo:', error);
          // Usar tamanho padrão se não conseguir obter
          fileSize = 1024 * 1024; // 1MB como fallback
        }
      }
      
      // Validar tamanho mínimo
      if (!fileSize || fileSize === 0) {
        throw new Error('Não foi possível determinar o tamanho do arquivo');
      }

      // 2. Fazer upload do arquivo usando presigned URL (upload direto ao S3)
      const uploadResponse = await storiesApi.uploadStoryMedia(
        selectedImage,
        filename,
        fileType,
        fileSize
      );

      if (!uploadResponse.success || !uploadResponse.data?.url) {
        throw new Error(uploadResponse.message || 'Erro ao fazer upload');
      }

      // 2. Criar story com texto simples (fixo na parte inferior)
      const storyData = {
        content: {
          type: 'image' as const,
          mediaUrl: uploadResponse.data.url,
          text: storyText.trim() || null,
          elements: [],
          zoom: 1,
          panX: 0,
          panY: 0,
        },
        visibility: visibility,
        duration: 10,
      };

      const response = await storiesApi.createStory(storyData);

      if (response.success) {
        showToast.success('Sucesso', 'Story criado com sucesso!');
        setSelectedImage(null);
        setSelectedImageSize(null);
        setStoryText('');
        onStoryCreated();
        onClose();
      } else {
        throw new Error(response.message || 'Erro ao criar story');
      }
    } catch (error: any) {
      console.error('[StoryCreate] Erro ao criar:', error);
      showToast.error(
        'Erro',
        error?.response?.data?.message || error?.message || 'Não foi possível criar o story'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (selectedImage) {
      return (
        <TouchableWithoutFeedback onPress={() => setShowVisibilityMenu(false)}>
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />

            {/* Overlay com controles */}
            <View style={[styles.previewOverlay, { paddingTop: insets.top + 20 }]}>
              <View style={styles.topControls}>
                <TouchableOpacity
                  style={styles.cancelPreview}
                  onPress={() => {
                    setSelectedImage(null);
                    setSelectedImageSize(null);
                    setStoryText('');
                  }}
                >
                  <Ionicons name="close" size={30} color="#ffffff" />
                </TouchableOpacity>
                
                {/* Seletor de visibilidade */}
                <View style={styles.visibilityContainer}>
                  <TouchableOpacity
                    style={styles.visibilityButton}
                    onPress={() => setShowVisibilityMenu(!showVisibilityMenu)}
                  >
                    <Ionicons 
                      name={visibility === 'friends' ? 'people' : 'people-outline'} 
                      size={24} 
                      color="#ffffff" 
                    />
                  </TouchableOpacity>
                  
                  {showVisibilityMenu && (
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                      <View style={styles.visibilityMenu}>
                        <TouchableOpacity
                          style={[
                            styles.visibilityOption,
                            visibility === 'followers' && styles.visibilityOptionActive
                          ]}
                          onPress={() => {
                            setVisibility('followers');
                            setShowVisibilityMenu(false);
                          }}
                        >
                          <Ionicons name="people-outline" size={20} color="#ffffff" />
                          <Text style={styles.visibilityOptionText}>Seguidores</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.visibilityOption,
                            visibility === 'friends' && styles.visibilityOptionActive
                          ]}
                          onPress={() => {
                            setVisibility('friends');
                            setShowVisibilityMenu(false);
                          }}
                        >
                          <Ionicons name="people" size={20} color="#ffffff" />
                          <Text style={styles.visibilityOptionText}>Amigos</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableWithoutFeedback>
                  )}
                </View>
              </View>
            </View>

          {/* Input de texto fixo na parte inferior com botão de compartilhar ao lado (estilo WhatsApp) */}
          <View style={[styles.textInputContainer, { bottom: insets.bottom + 20 }]}>
            <TextInput
              style={styles.textInput}
              placeholder="Digite seu texto..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={storyText}
              onChangeText={setStoryText}
              multiline
              maxLength={200}
              autoFocus={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              onPress={handleUpload}
              disabled={loading || !selectedImage}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Ionicons name="send" size={24} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
          </View>
        </TouchableWithoutFeedback>
      );
    }

    return (
      <View style={styles.selectionContainer}>
        <View style={styles.selectionHeader}>
          <Text style={styles.selectionTitle}>Criar Story</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.optionCard} onPress={handlePickImage}>
            <View style={[styles.iconContainer, { backgroundColor: COLORS.secondary.main }]}>
              <Ionicons name="images" size={32} color="#ffffff" />
            </View>
            <Text style={styles.optionText}>Galeria</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handleTakePhoto}>
            <View style={[styles.iconContainer, { backgroundColor: COLORS.primary.main }]}>
              <Ionicons name="camera" size={32} color="#ffffff" />
            </View>
            <Text style={styles.optionText}>Câmera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={selectedImage ? false : true}
      onRequestClose={onClose}
    >
      <View style={[styles.container, !selectedImage && styles.modalOverlay]}>
        {renderContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  selectionContainer: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  selectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 20,
  },
  optionCard: {
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewImage: {
    width: width,
    height: height,
    resizeMode: 'cover',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelPreview: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  textInputContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    gap: 12,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'left',
    minHeight: 40,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  visibilityContainer: {
    position: 'relative',
  },
  visibilityButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
  },
  visibilityMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 12,
    padding: 8,
    minWidth: 140,
    zIndex: 1000,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderRadius: 8,
  },
  visibilityOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  visibilityOptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});
