import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Switch,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../theme/colors';
import { linksApi } from '../../services/api';
import { showToast } from '../CustomToast';
import { API_CONFIG } from '../../config/api.config';

interface LinkItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  imageUrl?: string;
  visible: boolean;
  createdAt: string;
  likes?: number;
  order: number;
}

interface LinkEditCardProps {
  link: LinkItem;
  index: number;
  sortMode: 'custom' | 'date' | 'name' | 'likes';
  userPlan?: 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS';
  onUpdate: (id: string, updates: Partial<LinkItem>) => void;
  onDelete: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export function LinkEditCard({
  link,
  index,
  sortMode,
  userPlan,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: LinkEditCardProps) {
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImagePicker = async () => {
    if (userPlan !== 'PRO' && userPlan !== 'PRO_PLUS') {
      showToast.info('Recurso Premium', 'Upload de imagens está disponível apenas no plano PRO');
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast.error('Permissão negada', 'Precisamos de permissão para acessar suas fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        try {
          const response = await linksApi.uploadLinkImage(link.id, result.assets[0].uri);
          if (response.success) {
            onUpdate(link.id, { imageUrl: response.data.imageUrl });
            showToast.success('Sucesso', 'Imagem adicionada com sucesso');
          } else {
            showToast.error('Erro', 'Não foi possível fazer upload da imagem');
          }
        } catch (error) {
          console.error('Erro ao fazer upload:', error);
          showToast.error('Erro', 'Não foi possível fazer upload da imagem');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      showToast.error('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const handleRemoveImage = () => {
    onUpdate(link.id, { imageUrl: undefined });
  };

  const handleToggleVisible = async (value: boolean) => {
    // Atualizar estado local imediatamente
    onUpdate(link.id, { visible: value });
    
    try {
      const response = await linksApi.updateLink(link.id, { visible: value });
      if (response.success) {
        showToast.success(
          'Sucesso',
          value ? 'Link agora está visível' : 'Link agora está oculto'
        );
      } else {
        // Reverter se falhar
        onUpdate(link.id, { visible: !value });
        showToast.error('Erro', 'Não foi possível atualizar a visibilidade');
      }
    } catch (error) {
      // Reverter se falhar
      onUpdate(link.id, { visible: !value });
      console.error('Erro ao atualizar visibilidade:', error);
      showToast.error('Erro', 'Não foi possível atualizar a visibilidade');
    }
  };

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${API_CONFIG.BASE_URL}${url}`;
  };

  const isPro = userPlan === 'PRO' || userPlan === 'PRO_PLUS';

  return (
    <View style={styles.card}>
      {/* Header com controles */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {sortMode === 'custom' && (
            <View style={styles.moveButtons}>
              <TouchableOpacity
                onPress={onMoveUp}
                disabled={!canMoveUp}
                style={[styles.moveButton, !canMoveUp && styles.moveButtonDisabled]}
              >
                <Ionicons
                  name="chevron-up"
                  size={18}
                  color={canMoveUp ? COLORS.text.primary : COLORS.text.tertiary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onMoveDown}
                disabled={!canMoveDown}
                style={[styles.moveButton, !canMoveDown && styles.moveButtonDisabled]}
              >
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={canMoveDown ? COLORS.text.primary : COLORS.text.tertiary}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => onDelete(link.id)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.states.error} />
        </TouchableOpacity>
      </View>

      {/* Imagem ou botão de adicionar */}
      {isPro ? (
        link.imageUrl ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: getImageUrl(link.imageUrl) || '' }}
              style={styles.image}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={handleRemoveImage}
            >
              <Ionicons name="close-circle" size={24} color={COLORS.states.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addImageButton}
            onPress={handleImagePicker}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color={COLORS.primary.main} />
            ) : (
              <>
                <Ionicons name="image-outline" size={24} color={COLORS.primary.main} />
                <Text style={styles.addImageText}>Adicionar Imagem</Text>
              </>
            )}
          </TouchableOpacity>
        )
      ) : (
        <View style={styles.proLockedContainer}>
          <Ionicons name="lock-closed" size={20} color={COLORS.text.tertiary} />
          <Text style={styles.proLockedText}>Imagens disponíveis no plano PRO</Text>
        </View>
      )}

      {/* Campos de edição */}
      <View style={styles.fields}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            value={link.title}
            onChangeText={(text) => onUpdate(link.id, { title: text })}
            placeholder="Título do link"
            placeholderTextColor={COLORS.text.tertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>URL</Text>
          <TextInput
            style={styles.input}
            value={link.url}
            onChangeText={(text) => onUpdate(link.id, { url: text })}
            placeholder="https://..."
            placeholderTextColor={COLORS.text.tertiary}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={link.description || ''}
            onChangeText={(text) => onUpdate(link.id, { description: text })}
            placeholder="Descrição do link"
            placeholderTextColor={COLORS.text.tertiary}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Footer com toggle de visibilidade */}
      <View style={styles.footer}>
        <View style={styles.visibilityContainer}>
          <View style={styles.visibilityLabelContainer}>
            <Text style={styles.visibilityLabel}>Visível</Text>
            <Text style={styles.visibilityDescription}>
              {link.visible ? 'Link será exibido no seu perfil' : 'Link ficará oculto'}
            </Text>
          </View>
          <Switch
            value={link.visible}
            onValueChange={handleToggleVisible}
            trackColor={{ false: COLORS.border.medium, true: COLORS.secondary.main }}
            thumbColor="#ffffff"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moveButtons: {
    flexDirection: 'row',
    gap: 4,
    marginRight: 8,
  },
  moveButton: {
    padding: 4,
  },
  moveButtonDisabled: {
    opacity: 0.3,
  },
  deleteButton: {
    padding: 4,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  addImageButton: {
    width: '100%',
    height: 120,
    borderWidth: 2,
    borderColor: COLORS.border.medium,
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: COLORS.background.default,
  },
  addImageText: {
    fontSize: 14,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  proLockedContainer: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: COLORS.background.default,
  },
  proLockedText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  fields: {
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  input: {
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  textArea: {
    minHeight: 60,
    paddingTop: 12,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    paddingTop: 12,
  },
  visibilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visibilityLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  visibilityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  visibilityDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
});

