import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StoriesGroup } from '../types/feed';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, getUserInitials } from '../utils/image';

interface StoriesCarouselProps {
  storiesGroups: StoriesGroup[];
  onStoryClick: (group: StoriesGroup) => void;
  onCreateStory: () => void;
}

export function StoriesCarousel({
  storiesGroups,
  onStoryClick,
  onCreateStory,
}: StoriesCarouselProps) {
  const { user } = useAuth();

  // Verificar se o usuário já tem stories
  const userHasStories = storiesGroups.some(
    (group) => group?.user?._id === user?.id
  );

  // Verificar se um story foi visualizado
  const isStoryViewed = (story: any) => {
    return story.views?.some((view: any) => view?.userId?._id === user?.id);
  };

  // Verificar se todos os stories do grupo foram visualizados
  const isGroupViewed = (group: StoriesGroup) => {
    return group.stories.every((story) => isStoryViewed(story));
  };

  const renderStoryItem = (group: StoriesGroup, index: number) => {
    // Validação de segurança
    if (!group || !group.user || !group.user._id) {
      return null;
    }

    const isViewed = isGroupViewed(group);
    const isCurrentUser = group.user._id === user?.id;
    const firstStory = group.stories?.[0];
    const storyImageUrl = firstStory?.content?.mediaUrl;

    return (
      <TouchableOpacity
        key={`story-${group.user._id}-${index}`}
        style={styles.storyItem}
        onPress={() => onStoryClick(group)}
      >
        <View style={styles.storyCard}>
          {/* Preview do story (imagem/vídeo) */}
          {storyImageUrl ? (
            <Image
              source={{ uri: storyImageUrl }}
              style={styles.storyPreview}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.storyPreview, styles.storyPreviewPlaceholder]}>
              <Text style={styles.placeholderText}>
                {getUserInitials(group.user.username || 'U')}
              </Text>
            </View>
          )}

          {/* Overlay escuro no topo */}
          <View style={styles.storyOverlay} />

          {/* Avatar do usuário sobreposto */}
          <View style={styles.avatarContainer}>
            {getAvatarUrl(group.user.avatar) ? (
              <Image
                source={{ uri: getAvatarUrl(group.user.avatar) }}
                style={[
                  styles.storyAvatar,
                  isViewed && styles.storyAvatarViewed,
                  isCurrentUser && styles.storyAvatarCurrent,
                ]}
              />
            ) : (
              <View style={[styles.storyAvatar, styles.placeholderAvatar, isViewed && styles.storyAvatarViewed, isCurrentUser && styles.storyAvatarCurrent]}>
                <Text style={styles.avatarPlaceholderText}>
                  {getUserInitials(group.user.username || 'U')}
                </Text>
              </View>
            )}
          </View>

          {/* Nome do usuário no bottom */}
          <View style={styles.usernameContainer}>
            <Text style={styles.storyUsername} numberOfLines={1}>
              {isCurrentUser ? 'Você' : group.user.username || 'Usuário'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCreateStory = () => {
    return (
      <TouchableOpacity
        style={styles.storyItem}
        onPress={onCreateStory}
      >
        <View style={[styles.storyCard, styles.createStoryCard]}>
          {getAvatarUrl(user?.avatar) ? (
            <Image
              source={{ uri: getAvatarUrl(user?.avatar) }}
              style={styles.storyPreview}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.storyPreview, styles.storyPreviewPlaceholder]}>
              <Text style={styles.placeholderText}>
                {getUserInitials(user?.username || 'U')}
              </Text>
            </View>
          )}
          <View style={styles.createStoryOverlay}>
            <View style={styles.addIconContainer}>
              <Ionicons name="add" size={24} color="#ffffff" />
            </View>
            <View style={styles.usernameContainer}>
              <Text style={styles.storyUsername}>Criar Story</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Botão de criar story */}
        {renderCreateStory()}

        {/* Stories dos usuários */}
        {storiesGroups
          .filter((group) => group && group.user && group.user._id) // Filtrar grupos inválidos
          .map((group, index) => renderStoryItem(group, index))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  storyItem: {
    width: 100, // Largura do card vertical
  },
  storyCard: {
    width: 100,
    height: 160, // Altura maior que largura (retangular vertical)
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  storyPreview: {
    width: '100%',
    height: '100%',
  },
  storyPreviewPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#d946ef',
  },
  storyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  avatarContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  storyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#f1f5f9',
  },
  storyAvatarViewed: {
    borderColor: '#cbd5e1',
  },
  storyAvatarCurrent: {
    borderColor: '#8b5cf6',
  },
  placeholderAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#d946ef',
  },
  placeholderText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  avatarPlaceholderText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  usernameContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  storyUsername: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  createStoryCard: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  createStoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  addIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d946ef',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
});

