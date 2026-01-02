import React, { useState, useRef } from 'react';
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
  PanResponder,
  Animated,
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

interface TextElement {
  id: string;
  text: string;
  x: number; // porcentagem (0-100)
  y: number; // porcentagem (0-100)
  fontSize: number;
  color: string;
  isEditing: boolean;
}

export function StoryCreateModal({
  visible,
  onClose,
  onStoryCreated,
}: StoryCreateModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [tempText, setTempText] = useState('');
  const [tempPosition, setTempPosition] = useState({ x: 0, y: 0 });

  const panRespondersRef = useRef<{ [key: string]: any }>({});

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
        setTextElements([]);
        setActiveElementId(null);
        setEditingElementId(null);
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

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
        setTextElements([]);
        setActiveElementId(null);
        setEditingElementId(null);
      }
    } catch (error) {
      showToast.error('Erro', 'Não foi possível abrir a câmera');
    }
  };

  const handleCanvasPress = (event: any) => {
    if (!selectedImage) return;

    const { locationX, locationY } = event.nativeEvent;
    const xPercent = (locationX / width) * 100;
    const yPercent = (locationY / height) * 100;

    // Verificar se clicou em algum elemento existente
    const clickedElement = textElements.find((el) => {
      const elX = (el.x / 100) * width;
      const elY = (el.y / 100) * height;
      const distance = Math.sqrt(
        Math.pow(locationX - elX, 2) + Math.pow(locationY - elY, 2)
      );
      return distance < 100; // Raio de 100px para detectar clique
    });

    if (clickedElement) {
      // Selecionar elemento existente
      setActiveElementId(clickedElement.id);
      setEditingElementId(clickedElement.id);
      setShowTextInput(true);
      setTempText(clickedElement.text);
    } else {
      // Criar novo elemento de texto
      setTempPosition({ x: xPercent, y: yPercent });
      setTempText('');
      setShowTextInput(true);
      setActiveElementId(null);
      setEditingElementId(null);
    }
  };

  const handleAddText = () => {
    if (!tempText.trim()) {
      setShowTextInput(false);
      return;
    }

    if (editingElementId) {
      // Editar elemento existente
      setTextElements((prev) =>
        prev.map((el) =>
          el.id === editingElementId
            ? { ...el, text: tempText.trim(), isEditing: false }
            : el
        )
      );
    } else {
      // Criar novo elemento
      const newElement: TextElement = {
        id: `text_${Date.now()}`,
        text: tempText.trim(),
        x: tempPosition.x,
        y: tempPosition.y,
        fontSize: 24,
        color: '#ffffff',
        isEditing: false,
      };
      setTextElements((prev) => [...prev, newElement]);
    }

    setShowTextInput(false);
    setTempText('');
    setEditingElementId(null);
  };

  const createPanResponder = (elementId: string) => {
    if (panRespondersRef.current[elementId]) {
      return panRespondersRef.current[elementId];
    }

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setActiveElementId(elementId);
        setEditingElementId(null);
      },
      onPanResponderMove: (evt, gestureState) => {
        const element = textElements.find((el) => el.id === elementId);
        if (!element) return;

        const newX = element.x + (gestureState.dx / width) * 100;
        const newY = element.y + (gestureState.dy / height) * 100;

        setTextElements((prev) =>
          prev.map((el) =>
            el.id === elementId
              ? {
                  ...el,
                  x: Math.max(0, Math.min(100, newX)),
                  y: Math.max(0, Math.min(100, newY)),
                }
              : el
          )
        );
      },
      onPanResponderRelease: () => {
        setActiveElementId(null);
      },
    });

    panRespondersRef.current[elementId] = panResponder;
    return panResponder;
  };

  const handleDeleteElement = (elementId: string) => {
    setTextElements((prev) => prev.filter((el) => el.id !== elementId));
    if (activeElementId === elementId) {
      setActiveElementId(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) return;

    try {
      setLoading(true);

      // 1. Fazer upload do arquivo
      const filename = selectedImage.split('/').pop() || `story_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `image/${match[1]}` : 'image/jpeg';

      const uploadResponse = await storiesApi.uploadStoryMedia(
        selectedImage,
        filename,
        fileType
      );

      if (!uploadResponse.success || !uploadResponse.data?.url) {
        throw new Error(uploadResponse.message || 'Erro ao fazer upload');
      }

      // 2. Criar story com elementos de texto
      const storyData = {
        content: {
          type: 'image' as const,
          mediaUrl: uploadResponse.data.url,
          text: null,
          elements: textElements.map((el) => ({
            type: 'text' as const,
            content: el.text,
            x: el.x,
            y: el.y,
            fontSize: el.fontSize,
            color: el.color,
            backgroundColor: 'transparent',
            strokeColor: '#000000',
            fontWeight: 'bold' as const,
          })),
          zoom: 1,
          panX: 0,
          panY: 0,
        },
        visibility: 'followers' as const,
        duration: 10,
      };

      const response = await storiesApi.createStory(storyData);

      if (response.success) {
        showToast.success('Sucesso', 'Story criado com sucesso!');
        setSelectedImage(null);
        setTextElements([]);
        setActiveElementId(null);
        setEditingElementId(null);
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

  const renderTextElements = () => {
    return textElements.map((element) => {
      const panResponder = createPanResponder(element.id);
      const isActive = activeElementId === element.id;

      return (
        <View
          key={element.id}
          style={[
            styles.textElementContainer,
            {
              left: `${element.x}%`,
              top: `${element.y}%`,
            },
          ]}
          {...panResponder.panHandlers}
        >
          {isActive && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteElement(element.id)}
            >
              <Ionicons name="close-circle" size={24} color="#ff0000" />
            </TouchableOpacity>
          )}
          <Text
            style={[
              styles.textElement,
              {
                fontSize: element.fontSize,
                color: element.color,
                textShadowColor: '#000000',
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 4,
              },
            ]}
            onPress={() => {
              setEditingElementId(element.id);
              setTempText(element.text);
              setShowTextInput(true);
            }}
          >
            {element.text}
          </Text>
        </View>
      );
    });
  };

  const renderContent = () => {
    if (selectedImage) {
      return (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          
          {/* Canvas para adicionar textos */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCanvasPress}
          >
            {renderTextElements()}
          </TouchableOpacity>

          {/* Overlay com controles */}
          <View style={[styles.previewOverlay, { paddingTop: insets.top + 20 }]}>
            <View style={styles.topControls}>
              <TouchableOpacity
                style={styles.cancelPreview}
                onPress={() => {
                  setSelectedImage(null);
                  setTextElements([]);
                  setActiveElementId(null);
                  setEditingElementId(null);
                }}
              >
                <Ionicons name="close" size={30} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addTextButton}
                onPress={() => {
                  setTempPosition({ x: 50, y: 50 });
                  setTempText('');
                  setShowTextInput(true);
                  setEditingElementId(null);
                }}
              >
                <Ionicons name="text" size={24} color="#ffffff" />
                <Text style={styles.addTextButtonText}>Texto</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
              <TouchableOpacity
                style={[styles.publishButton, loading && styles.publishButtonDisabled]}
                onPress={handleUpload}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.publishButtonText}>Compartilhar</Text>
                    <Ionicons name="send" size={20} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Input de texto flutuante */}
          {showTextInput && (
            <View style={styles.textInputOverlay}>
              <TextInput
                style={styles.textInput}
                placeholder="Digite seu texto..."
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={tempText}
                onChangeText={setTempText}
                autoFocus
                multiline
                maxLength={100}
                onSubmitEditing={handleAddText}
              />
              <View style={styles.textInputActions}>
                <TouchableOpacity
                  style={styles.textInputCancel}
                  onPress={() => {
                    setShowTextInput(false);
                    setTempText('');
                    setEditingElementId(null);
                  }}
                >
                  <Text style={styles.textInputCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.textInputConfirm}
                  onPress={handleAddText}
                >
                  <Text style={styles.textInputConfirmText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
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
  addTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  addTextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomControls: {
    alignItems: 'center',
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary.main,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 10,
  },
  publishButtonDisabled: {
    opacity: 0.7,
  },
  publishButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  textElementContainer: {
    position: 'absolute',
    transform: [{ translateX: -50 }, { translateY: -50 }],
  },
  textElement: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: -30,
    right: -10,
    zIndex: 10,
  },
  textInputOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: 16,
  },
  textInput: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12,
  },
  textInputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  textInputCancel: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  textInputCancelText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  textInputConfirm: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.secondary.main,
  },
  textInputConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
