import React, { useState, useEffect } from 'react';
import {
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
import { useNavigation } from '@react-navigation/native';
import { Button } from './Button';
import { COLORS } from '../theme/colors';
import { postsApi, linksApi } from '../services/api';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { showToast } from './CustomToast';
import { PlanLocker } from './PlanLocker';
import { hasFeatureAccess } from '../config/plan-features';
import { CustomModal } from './CustomModal';

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

interface ProfileLink {
  _id: string;
  title: string;
  url: string;
  imageUrl?: string;
  description?: string;
}

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
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState('');
  const [category, setCategory] = useState('outros');
  const [visibility, setVisibility] = useState<VisibilityType>('PUBLIC');
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [myLinks, setMyLinks] = useState<ProfileLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);

  const userPlan = (user?.plan?.type || 'FREE') as import('../config/plan-features').PlanType;
  const canUploadImage = hasFeatureAccess(userPlan, 'canUploadPostImages');
  const canPostWithoutLink = hasFeatureAccess(userPlan, 'canPostWithoutLink');
  const isEditing = !!editingPost;
  const selectedLink = myLinks.find((link) => link._id === selectedLinkId) ?? null;
  const showLinkMenuEmptyState = !canPostWithoutLink && myLinks.length === 0;

  useEffect(() => {
    if (visible) {
      if (editingPost) {
        // Preencher formulário com dados do post
        setContent(editingPost.content);
        setCategory(editingPost.category || 'outros');
        setVisibility(editingPost.visibility || 'PUBLIC');
        setImagePreview(editingPost.imageUrl || null);
        setSelectedImage(null);
        setSelectedLinkId('');
      } else {
        resetForm();
        void fetchMyLinks();
      }
    }
  }, [visible, editingPost]);

  const fetchMyLinks = async () => {
    try {
      const response = await linksApi.getLinks();
      const raw = (response as { success?: boolean; data?: ProfileLink[] }).data ?? response;
      const links = Array.isArray(raw) ? raw : [];
      setMyLinks(
        links
          .map((item: ProfileLink & { id?: string }) => ({
            _id: item._id || item.id || '',
            title: item.title,
            url: item.url,
            imageUrl: item.imageUrl,
            description: item.description,
          }))
          .filter((link) => link._id)
      );
    } catch (error) {
      console.error('Erro ao buscar links:', error);
      setMyLinks([]);
    }
  };

  const resetForm = () => {
    setContent('');
    setCategory('outros');
    setVisibility('PUBLIC');
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedLinkId('');
  };

  const handleOpenLinksSettings = () => {
    setShowLinkPicker(false);
    onClose();
    const parent = navigation.getParent();
    parent?.navigate('ProfileStack', { screen: 'LinksSettings' });
  };

  const handlePickImage = async () => {
    if (!canUploadImage) {
      Alert.alert(
        'Upgrade Necessário',
        'Apenas usuários PRO ou superior podem enviar imagens em posts.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedImage(asset);
      setImagePreview(asset.uri);
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

    if (!isEditing && !canPostWithoutLink && !selectedLinkId) {
      Alert.alert(
        'Link obrigatório',
        'No plano FREE você precisa selecionar um link do seu perfil para postar.'
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
          linkId: selectedLinkId || null,
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

  const getLinkLabel = () => {
    if (selectedLink) return `🔗 ${selectedLink.title}`;
    return '🔗 Link';
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
    <CustomModal visible={visible} onClose={onClose} animationType="fade" overlayStyle={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <Pressable
            style={[styles.container, { paddingBottom: Math.max(insets.bottom, 0) }]}
            onPress={(e) => e.stopPropagation()}
          >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{isEditing ? 'Editar Post' : 'Criar Post'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Avatar e Username */}
          <View style={styles.userInfo}>
            {user?.avatar ? (
              <Image
                source={{ uri: getAvatarUrl(user.avatar) }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getUserInitials(user?.username || 'U')}
                </Text>
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.username}>@{user?.username || 'usuário'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowVisibilityPicker(true)}
              style={styles.visibilityChip}
            >
              <Text style={styles.visibilityText}>{getVisibilityLabel()}</Text>
            </TouchableOpacity>
          </View>

          {/* Textarea */}
          <ScrollView 
            style={styles.textareaContainer}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            <TextInput
              style={styles.textarea}
              placeholder={
                canUploadImage
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
          </ScrollView>

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
          {imagePreview ? (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: imagePreview }}
                style={styles.imagePreviewImage}
                resizeMode="cover"
                onError={(error) => {
                  console.error('Erro ao carregar preview:', error);
                }}
              />
              <TouchableOpacity
                onPress={handleRemoveImage}
                style={styles.removeImageButton}
                disabled={loading}
              >
                <Ionicons name="close-circle" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Preview do link selecionado */}
          {!isEditing && selectedLink ? (
            <View style={styles.linkPreviewContainer}>
              {selectedLink.imageUrl ? (
                <Image
                  source={{ uri: selectedLink.imageUrl }}
                  style={styles.linkPreviewImage}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.linkPreviewInfo}>
                <Text style={styles.linkPreviewTitle} numberOfLines={1}>
                  {selectedLink.title}
                </Text>
                {selectedLink.description ? (
                  <Text style={styles.linkPreviewDescription} numberOfLines={2}>
                    {selectedLink.description}
                  </Text>
                ) : null}
                <Text style={styles.linkPreviewUrl} numberOfLines={1}>
                  {selectedLink.url}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedLinkId('')}
                style={styles.removeLinkButton}
                disabled={loading}
              >
                <Ionicons name="close-circle" size={22} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Categoria, Link e Imagem */}
          <View style={styles.actionsRow}>
            <View style={styles.sectionThird}>
              <Text style={styles.sectionTitle}>Categoria</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowCategoryPicker(true)}
                disabled={loading}
              >
                <Text style={styles.pickerText} numberOfLines={1}>{getCategoryLabel()}</Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            {!isEditing ? (
              <View style={styles.sectionThird}>
                <Text style={styles.sectionTitle}>Link</Text>
                <TouchableOpacity
                  style={[
                    styles.picker,
                    !canPostWithoutLink && !selectedLinkId && styles.pickerRequired,
                  ]}
                  onPress={() => setShowLinkPicker(true)}
                  disabled={loading}
                >
                  <Text style={styles.pickerText} numberOfLines={1}>{getLinkLabel()}</Text>
                  <Text style={styles.pickerArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={[styles.sectionThird, isEditing && styles.sectionHalf]}>
              <Text style={styles.sectionTitle}>Imagem</Text>
              <PlanLocker
                requiredPlan="PRO"
                currentPlan={user?.plan?.type as 'FREE' | 'LITE' | 'STARTER' | 'PRO' | 'PRO_PLUS' || 'FREE'}
              >
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePickImage}
                  disabled={loading || !canUploadImage}
                >
                  <Text style={styles.uploadButtonText} numberOfLines={1}>📷 Adicionar</Text>
                </TouchableOpacity>
              </PlanLocker>
            </View>
          </View>
        </View>

        {/* Footer com botões */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} disabled={loading} style={styles.cancelButtonContainer}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={
              loading ||
              !content.trim() ||
              (!isEditing && !canPostWithoutLink && !selectedLinkId)
            }
            style={[
              styles.postButtonContainer,
              (loading ||
                !content.trim() ||
                (!isEditing && !canPostWithoutLink && !selectedLinkId)) &&
                styles.postButtonContainerDisabled,
            ]}
          >
            <Text
              style={[
                styles.postButtonText,
                (loading ||
                  !content.trim() ||
                  (!isEditing && !canPostWithoutLink && !selectedLinkId)) &&
                  styles.postButtonTextDisabled,
              ]}
            >
              {loading ? (isEditing ? 'Atualizando...' : 'Postando...') : (isEditing ? 'Atualizar' : 'Postar')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Picker */}
        {showCategoryPicker && (
          <Pressable 
            style={styles.pickerModal}
            onPress={() => setShowCategoryPicker(false)}
          >
            <Pressable 
              style={styles.pickerModalContent}
              onPress={(e) => e.stopPropagation()}
            >
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
            </Pressable>
          </Pressable>
        )}

        {/* Link Picker */}
        {showLinkPicker && (
          <Pressable
            style={styles.pickerModal}
            onPress={() => setShowLinkPicker(false)}
          >
            <Pressable
              style={styles.pickerModalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.pickerModalTitle}>Selecione um Link</Text>
              {showLinkMenuEmptyState ? (
                <View style={styles.linkEmptyState}>
                  <Text style={styles.linkEmptyStateText}>
                    Cadastre um link no seu perfil para poder postar no plano FREE.
                  </Text>
                  <TouchableOpacity
                    style={styles.addLinkButton}
                    onPress={handleOpenLinksSettings}
                  >
                    <Text style={styles.addLinkButtonText}>Adicionar Link</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView>
                  {canPostWithoutLink ? (
                    <TouchableOpacity
                      style={[
                        styles.pickerOption,
                        !selectedLinkId && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedLinkId('');
                        setShowLinkPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>Nenhum (post sem link)</Text>
                    </TouchableOpacity>
                  ) : null}
                  {myLinks.map((link) => (
                    <TouchableOpacity
                      key={link._id}
                      style={[
                        styles.pickerOption,
                        selectedLinkId === link._id && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedLinkId(link._id);
                        setShowLinkPicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>🔗 {link.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <Button
                variant="outline"
                onPress={() => setShowLinkPicker(false)}
              >
                Fechar
              </Button>
            </Pressable>
          </Pressable>
        )}

        {/* Visibility Picker */}
        {showVisibilityPicker && (
          <Pressable 
            style={styles.pickerModal}
            onPress={() => setShowVisibilityPicker(false)}
          >
            <Pressable 
              style={styles.pickerModalContent}
              onPress={(e) => e.stopPropagation()}
            >
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
            </Pressable>
          </Pressable>
        )}
          </Pressable>
        </KeyboardAvoidingView>
    </CustomModal>
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
    maxHeight: '95%',
    minHeight: 700,
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
    gap: 8,
    marginTop: 'auto',
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
    padding: 16,
    paddingBottom: 8,
    minHeight: 0,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
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
    marginRight: 'auto',
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  visibilityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: `${COLORS.secondary.main}20`,
    marginLeft: 'auto',
  },
  visibilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary.main,
  },
  textareaContainer: {
    minHeight: 150,
    maxHeight: 200,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textarea: {
    fontSize: 16,
    color: COLORS.text.primary,
    minHeight: 130,
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
  sectionHalf: {
    flex: 1,
    marginBottom: 0,
  },
  sectionThird: {
    flex: 1,
    marginBottom: 0,
    minWidth: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    minHeight: 40,
  },
  pickerRequired: {
    borderColor: COLORS.secondary.main,
  },
  pickerText: {
    fontSize: 13,
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 4,
  },
  pickerArrow: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  uploadButton: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    minHeight: 40,
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondary.main,
  },
  linkPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    backgroundColor: COLORS.background.default,
  },
  linkPreviewImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
  },
  linkPreviewInfo: {
    flex: 1,
    minWidth: 0,
  },
  linkPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  linkPreviewDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 2,
  },
  linkPreviewUrl: {
    fontSize: 11,
    color: COLORS.secondary.main,
  },
  removeLinkButton: {
    padding: 4,
  },
  linkEmptyState: {
    marginBottom: 12,
    gap: 10,
  },
  linkEmptyStateText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  addLinkButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.secondary.main,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addLinkButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  imagePreviewImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
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
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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

