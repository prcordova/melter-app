import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { storiesApi } from '../../services/api';
import { COLORS } from '../../theme/colors';
import { getImageUrl } from '../../utils/image';
import Ionicons from '@expo/vector-icons/Ionicons';

interface StoryReplyPreviewProps {
  storyId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'gif';
  compact?: boolean;
  isSentByMe?: boolean;
  onPress?: () => void;
}

export function StoryReplyPreview({
  storyId,
  mediaUrl,
  mediaType,
  compact = false,
  isSentByMe = false,
  onPress,
}: StoryReplyPreviewProps) {
  const [storyExists, setStoryExists] = useState<boolean | null>(null);
  const [storyOwnerUsername, setStoryOwnerUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se o story ainda existe
    const checkStoryExists = async () => {
      try {
        // Buscar o story específico por ID
        const response = await storiesApi.getStory(storyId);
        if (response.success && response.data) {
          setStoryExists(true);
          setStoryOwnerUsername(response.data.userId?.username || null);
        } else {
          setStoryExists(false);
        }
      } catch (error: any) {
        // Se retornou 404 ou 410 (expirado), story não existe
        if (error.response?.status === 404 || error.response?.status === 410) {
          setStoryExists(false);
        } else {
          // Outro erro, assumir que ainda existe mas houve problema de rede
          setStoryExists(true);
        }
      } finally {
        setLoading(false);
      }
    };

    checkStoryExists();
  }, [storyId]);

  // Se story não existe mais, mostrar mensagem
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.text.secondary} />
      </View>
    );
  }

  if (!storyExists) {
    return (
      <View style={styles.unavailableContainer}>
        <Text style={styles.unavailableText}>
          ℹ️ Este story não está mais disponível
        </Text>
      </View>
    );
  }

  const imageSource = getImageUrl(mediaUrl) ? { uri: getImageUrl(mediaUrl) } : null;

  return (
    <TouchableOpacity
      style={[styles.container, compact && styles.compactContainer]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Preview da imagem/vídeo do story */}
      <View style={[styles.previewImageContainer, compact && styles.compactPreview]}>
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.previewImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.previewPlaceholder}>
            <Ionicons
              name={mediaType === 'video' ? 'videocam-outline' : 'image-outline'}
              size={24}
              color={COLORS.text.tertiary}
            />
          </View>
        )}
        {mediaType === 'video' && (
          <View style={styles.videoIcon}>
            <Ionicons name="play-circle" size={20} color="#ffffff" />
          </View>
        )}
      </View>

      {/* Informações */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {isSentByMe ? '💬 Você respondeu o story' : '📖 Respondeu seu story'}
        </Text>
        <Text style={styles.infoSubtext}>
          Toque para ver o story
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.background.tertiary,
    marginBottom: 8,
    maxWidth: 220,
  },
  compactContainer: {
    maxWidth: 180,
  },
  loadingContainer: {
    padding: 12,
    alignItems: 'center',
  },
  unavailableContainer: {
    padding: 12,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    marginBottom: 8,
  },
  unavailableText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  previewImageContainer: {
    width: '100%',
    height: 240,
    backgroundColor: COLORS.background.tertiary,
    position: 'relative',
  },
  compactPreview: {
    height: 180,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.tertiary,
  },
  videoIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  infoContainer: {
    padding: 12,
    backgroundColor: COLORS.background.paper,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary.main,
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 11,
    color: COLORS.text.secondary,
  },
});

