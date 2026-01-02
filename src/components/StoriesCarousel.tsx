import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
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

    return (
      <TouchableOpacity
        key={`story-${group.user._id}-${index}`}
        style={styles.storyItem}
        onPress={() => onStoryClick(group)}
      >
        <View
          style={[
            styles.storyBorder,
            isViewed ? styles.storyBorderViewed : styles.storyBorderNew,
            isCurrentUser && styles.storyBorderCurrent,
          ]}
        >
          {getAvatarUrl(group.user.avatar) ? (
            <Image
              source={{ uri: getAvatarUrl(group.user.avatar) }}
              style={styles.storyAvatar}
            />
          ) : (
            <View style={[styles.storyAvatar, styles.placeholderAvatar]}>
              <Text style={styles.placeholderText}>
                {getUserInitials(group.user.username)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.storyUsername} numberOfLines={1}>
          {isCurrentUser ? 'Você' : group.user.username}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCreateStory = () => {
    return (
      <TouchableOpacity
        style={styles.storyItem}
        onPress={onCreateStory}
      >
        <View style={[styles.storyBorder, styles.createStoryBorder]}>
          <View style={styles.createStoryAvatar}>
            {getAvatarUrl(user?.avatar) ? (
              <Image
                source={{ uri: getAvatarUrl(user?.avatar) }}
                style={styles.storyAvatar}
              />
            ) : (
              <View style={[styles.storyAvatar, styles.placeholderAvatar]}>
                <Text style={styles.placeholderText}>
                  {getUserInitials(user?.username)}
                </Text>
              </View>
            )}
            <View style={styles.addIconContainer}>
              <Text style={styles.addIcon}>+</Text>
            </View>
          </View>
        </View>
        <Text style={styles.storyUsername} numberOfLines={1}>
          Criar Story
        </Text>
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
    alignItems: 'center',
    width: 70,
  },
  storyBorder: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 2,
    marginBottom: 4,
  },
  storyBorderNew: {
    borderWidth: 2,
    borderColor: '#d946ef',
  },
  storyBorderViewed: {
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  storyBorderCurrent: {
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  createStoryBorder: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
  },
  createStoryAvatar: {
    position: 'relative',
  },
  placeholderAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#d946ef',
  },
  placeholderText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  addIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#d946ef',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  addIcon: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: -2,
  },
  storyUsername: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    width: '100%',
  },
});

