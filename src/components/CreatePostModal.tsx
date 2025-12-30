import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './Button';
import { COLORS } from '../theme/colors';
import { postsApi } from '../services/api';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { showToast } from './CustomToast';
import { PlanLocker } from './PlanLocker';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: () => void;
  editingPost?: {
    _id: string;
    content: string;
    category: string;
    visibility: 'PUBLIC' | 'FOLLOWERS' | 'FRIENDS';
    imageUrl?: string | null;
  } | null;
}

type VisibilityType = 'PUBLIC' | 'FOLLOWERS' | 'FRIENDS';

const CATEGORIES = [
  { value: 'noticias', label: '📰 Notícias' },
  { value: 'tecnologia', label: '💻 Tecnologia' },
  { value: 'entretenimento', label: '🎬 Entretenimento' },
  { value: 'esportes', label: '⚽ Esportes' },
  { value: 'educacao', label: '📚 Educação' },
  { value: 'saude', label: '🏥 Saúde' },
  { value: 'negocios', label: '💼 Negócios' },
  { value: 'arte', label: '🎨 Arte' },
  { value: 'musica', label: '🎵 Música' },
  { value: 'viagem', label: '✈️ Viagem' },
  { value: 'gastronomia', label: '🍽️ Gastronomia' },
  { value: 'moda', label: '👗 Moda' },
  { value: 'outros', label: '📌 Outros' },
];

export function CreatePostModal({ visible, onClose, onPostCreated, editingPost }: CreatePostModalProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState('');
  const [category, setCategory] = useState('outros');
  const [visibility, setVisibility] = useState<VisibilityType>('PUBLIC');
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);

  const isPro = user?.plan?.type === 'PRO' || user?.plan?.type === 'PRO_PLUS';
  const isStarter = user?.plan?.type === 'STARTER';
  const canUploadImage = isStarter || isPro; // STARTER para cima pode fazer upload
  const isEditing = !!editingPost;

  useEffect(() => {
    if (visible) {
      if (editingPost) {
        // Preencher formulário com dados do post
        setContent(editingPost.content);
        setCategory(editingPost.category || 'outros');
        setVisibility(editingPost.visibility || 'PUBLIC');
        setImagePreview(editingPost.imageUrl || null);
        setSelectedImage(null); // Não precisamos do objeto de imagem, só a URL
      } else {
        resetForm();
      }
    }
  }, [visible, editingPost]);

  const resetForm = () => {
    setContent('');
    setCategory('outros');
    setVisibility('PUBLIC');
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handlePickImage = async () => {
    if (!canUploadImage) {
      Alert.alert(
        'Upgrade Necessário',
        'Apenas usuários STARTER ou superior podem fazer upload de imagens. Faça upgrade do seu plano!'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
      setImagePreview(result.assets[0].uri);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Erro', 'Digite algo para postar!');
      return;
    }

    if (content.length > 1000) {
      Alert.alert('Erro', 'O conteúdo não pode ter mais de 1000 caracteres!');
      return;
    }

    // Validar hashtags (máximo 5)
    const hashtags = content.match(/#[\w\u00C0-\u017F]+/g) || [];
    if (hashtags.length > 5) {
      Alert.alert(
        'Muitas Hashtags',
        `Você usou ${hashtags.length} hashtags, mas o máximo permitido é 5. Remova ${hashtags.length - 5} hashtags.`
      );
      return;
    }

    try {
      setLoading(true);

      let imageUrl: string | null = null;

      // Se estiver editando e não houver nova imagem selecionada, manter a imagem atual ou remover se imagePreview for null
      if (isEditing && editingPost) {
        if (!selectedImage && imagePreview === null) {
          // Usuário removeu a imagem
          imageUrl = null;
        } else if (!selectedImage && imagePreview) {
          // Manter a imagem atual (já é uma URL)
          imageUrl = editingPost.imageUrl || null;
        }
      }

      // Upload de nova imagem se necessário
      if (selectedImage && canUploadImage) {
        const formData = new FormData();
        
        // Criar objeto de arquivo compatível
        const imageFile = {
          uri: selectedImage.uri,
          type: selectedImage.mimeType || 'image/jpeg',
          name: selectedImage.fileName || `photo_${Date.now()}.jpg`,
        };

        formData.append('image', imageFile as any);

        try {
          const uploadResponse = await fetch(`${postsApi.BASE_URL}/api/posts/upload-image`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: formData,
          });

          const uploadData = await uploadResponse.json();

          if (uploadData.success) {
            imageUrl = uploadData.imageUrl;
          }
        } catch (uploadError) {
          console.error('Erro ao fazer upload da imagem:', uploadError);
          Alert.alert('Aviso', 'Não foi possível fazer upload da imagem, mas o post será atualizado sem ela.');
        }
      }

      // Criar ou atualizar post
      let response;
      if (isEditing && editingPost) {
        // Atualizar post existente
        response = await postsApi.updatePost(editingPost._id, {
          content,
          imageUrl,
          visibility,
          category,
        });

        if (response.success) {
          showToast.success('Post atualizado com sucesso! 🎉');
          onPostCreated();
          onClose();
          resetForm();
        }
      } else {
        // Criar novo post
        response = await postsApi.createPost({
          content,
          imageUrl,
          visibility,
          category,
          linkId: null,
          hideAutoPreview: false,
        });

        if (response.success) {
          showToast.success('Post criado com sucesso! 🎉');
          onPostCreated();
          onClose();
          resetForm();
        }
      }
    } catch (error: any) {
      console.error(`Erro ao ${isEditing ? 'atualizar' : 'criar'} post:`, error);
      Alert.alert('Erro', error.response?.data?.message || `Não foi possível ${isEditing ? 'atualizar' : 'criar'} o post`);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = () => {
    return CATEGORIES.find(c => c.value === category)?.label || '📌 Outros';
  };

  const getVisibilityLabel = () => {
    switch (visibility) {
      case 'PUBLIC':
        return '🌍 Público';
      case 'FOLLOWERS':
        return '👥 Seguidores';
      case 'FRIENDS':
        return '👫 Amigos';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <Pressable
            style={[styles.container, { paddingTop: 20, paddingBottom: Math.max(insets.bottom, 20) }]}
            onPress={(e) => e.stopPropagation()}
          >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{isEditing ? 'Editar Post' : 'Criar Post'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar e Username */}
          <View style={styles.userInfo}>
            {getAvatarUrl(user?.avatar) ? (
              <Image
                source={{ uri: getAvatarUrl(user?.avatar) }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getUserInitials(user?.username)}
                </Text>
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.username}>@{user?.username}</Text>
              <TouchableOpacity
                onPress={() => setShowVisibilityPicker(true)}
                style={styles.visibilityChip}
              >
                <Text style={styles.visibilityText}>{getVisibilityLabel()}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Textarea */}
          <TextInput
            style={styles.textarea}
            placeholder={
              isPro
                ? 'No que você está pensando?'
                : 'Compartilhe algo...'
            }
            placeholderTextColor={COLORS.text.tertiary}
            multiline
            value={content}
            onChangeText={(text) => {
              // Máximo 3 quebras de linha consecutivas
              const sanitized = text
                .replace(/\n{4,}/g, '\n\n\n')
                .slice(0, 1000);
              setContent(sanitized);
            }}
            maxLength={1000}
            autoFocus
            editable={!loading}
          />

          {/* Contador de caracteres */}
          <View style={styles.charCount}>
            <Text style={styles.charCountText}>{content.length}/1000</Text>
            {content.match(/#[\w\u00C0-\u017F]+/g)?.length ? (
              <Text style={styles.hashtagCount}>
                {content.match(/#[\w\u00C0-\u017F]+/g)!.length}/5 hashtags
              </Text>
            ) : null}
          </View>

          {/* Preview da Imagem */}
          {imagePreview && (
            <View style={styles.imagePreviewContainer}>
              <View style={styles.imagePreview}>
                <Text style={styles.imagePreviewText}>📷 Imagem selecionada</Text>
                <TouchableOpacity
                  onPress={handleRemoveImage}
                  style={styles.removeImageButton}
                  disabled={loading}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Categoria */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categoria</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowCategoryPicker(true)}
              disabled={loading}
            >
              <Text style={styles.pickerText}>{getCategoryLabel()}</Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Botão Upload Imagem */}
          <PlanLocker
            requiredPlan="STARTER"
            currentPlan={user?.plan?.type as 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS' || 'FREE'}
          >
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handlePickImage}
              disabled={loading || !canUploadImage}
            >
              <Text style={styles.uploadButtonText}>📷 Adicionar Imagem</Text>
            </TouchableOpacity>
          </PlanLocker>
        </ScrollView>

        {/* Footer com botões */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} disabled={loading} style={styles.cancelButtonContainer}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !content.trim()}
            style={[
              styles.postButtonContainer,
              (!content.trim() || loading) && styles.postButtonContainerDisabled,
            ]}
          >
            <Text
              style={[
                styles.postButtonText,
                (!content.trim() || loading) && styles.postButtonTextDisabled,
              ]}
            >
              {loading ? (isEditing ? 'Atualizando...' : 'Postando...') : (isEditing ? 'Atualizar' : 'Postar')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Picker */}
        {showCategoryPicker && (
          <View style={styles.pickerModal}>
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerModalTitle}>Selecione a Categoria</Text>
              <ScrollView>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.pickerOption,
                      category === cat.value && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setCategory(cat.value);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Button
                variant="outline"
                onPress={() => setShowCategoryPicker(false)}
              >
                Fechar
              </Button>
            </View>
          </View>
        )}

        {/* Visibility Picker */}
        {showVisibilityPicker && (
          <View style={styles.pickerModal}>
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerModalTitle}>Visibilidade</Text>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  visibility === 'PUBLIC' && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  setVisibility('PUBLIC');
                  setShowVisibilityPicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>🌍 Público</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  visibility === 'FOLLOWERS' && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  setVisibility('FOLLOWERS');
                  setShowVisibilityPicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>👥 Seguidores</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  visibility === 'FRIENDS' && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  setVisibility('FRIENDS');
                  setShowVisibilityPicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>👫 Amigos</Text>
              </TouchableOpacity>
              <Button
                variant="outline"
                onPress={() => setShowVisibilityPicker(false)}
              >
                Fechar
              </Button>
            </View>
          </View>
        )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoid: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '85%',
    backgroundColor: COLORS.background.paper,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    gap: 12,
  },
  cancelButtonContainer: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.tertiary,
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  postButtonContainer: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary.main,
  },
  postButtonContainerDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  postButtonTextDisabled: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.secondary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: COLORS.background.tertiary,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  visibilityChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: `${COLORS.secondary.main}20`,
  },
  visibilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary.main,
  },
  textarea: {
    fontSize: 16,
    color: COLORS.text.primary,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
  },
  charCountText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  hashtagCount: {
    fontSize: 12,
    color: COLORS.secondary.main,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  pickerText: {
    fontSize: 15,
    color: COLORS.text.primary,
  },
  pickerArrow: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  uploadButton: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.secondary.main,
  },
  upgradeNotice: {
    backgroundColor: `${COLORS.secondary.light}20`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  upgradeNoticeText: {
    fontSize: 13,
    color: COLORS.secondary.main,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    marginBottom: 16,
  },
  imagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  imagePreviewText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  removeImageButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.states.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  pickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  pickerOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background.default,
    marginBottom: 8,
  },
  pickerOptionSelected: {
    backgroundColor: `${COLORS.secondary.main}20`,
    borderWidth: 2,
    borderColor: COLORS.secondary.main,
  },
  pickerOptionText: {
    fontSize: 15,
    color: COLORS.text.primary,
  },
});

