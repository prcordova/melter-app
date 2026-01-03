import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
  PanResponder,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StoriesGroup, Story } from '../types/feed';
import { storiesApi, userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { COLORS } from '../theme/colors';
import { showToast } from './CustomToast';
import { StoryReactionButton } from './stories/StoryReactionButton';
import { StoryMessageInput } from './stories/StoryMessageInput';
import { ReportStoryModal } from './stories/ReportStoryModal';

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 segundos por story

interface StoryViewerModalProps {
  visible: boolean;
  onClose: () => void;
  storiesGroups: StoriesGroup[];
  initialGroupIndex: number;
  onStoryViewed?: (storyId: string) => void;
}

export function StoryViewerModal({
  visible,
  onClose,
  storiesGroups,
  initialGroupIndex,
  onStoryViewed,
}: StoryViewerModalProps) {
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [loadingFriendship, setLoadingFriendship] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const progress = useRef(new Animated.Value(0)).current;
  const currentGroup = storiesGroups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  
  const nextStory = useCallback(() => {
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
      progress.setValue(0);
    } else if (groupIndex < storiesGroups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
      progress.setValue(0);
    } else {
      onClose();
    }
  }, [storyIndex, currentGroup, groupIndex, storiesGroups, onClose, progress]);

  const prevStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
      progress.setValue(0);
    } else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      setStoryIndex(storiesGroups[groupIndex - 1].stories.length - 1);
      progress.setValue(0);
    } else {
      progress.setValue(0); // Reinicia o primeiro story
    }
  }, [storyIndex, groupIndex, storiesGroups, progress]);

  useEffect(() => {
    if (visible) {
      setGroupIndex(initialGroupIndex);
      setStoryIndex(0);
      progress.setValue(0);
    }
  }, [visible, initialGroupIndex]);

  useEffect(() => {
    if (!visible || loading || isPaused || !currentStory) return;

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) {
        nextStory();
      }
    });

    return () => animation.stop();
  }, [visible, loading, isPaused, currentStory, storyIndex, groupIndex, progress, nextStory]);

  // Marcar como visto
  useEffect(() => {
    if (visible && currentStory && !loading) {
      storiesApi.viewStory(currentStory._id).then(() => {
        if (onStoryViewed) onStoryViewed(currentStory._id);
      }).catch(() => {});
    }
  }, [currentStory?._id, visible, loading]);

  // Mostrar Alert de confirmação de exclusão
  useEffect(() => {
    if (showDeleteConfirm && currentStory) {
      Alert.alert(
        'Excluir Story',
        'Tem certeza que deseja excluir este story? Esta ação não pode ser desfeita.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => setShowDeleteConfirm(false),
          },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              try {
                setDeleting(true);
                const response = await storiesApi.deleteStory(currentStory._id);
                if (response.success) {
                  showToast.success('Sucesso', 'Story excluído com sucesso');
                  setShowDeleteConfirm(false);
                  // Se não houver mais stories, fechar o modal
                  if (currentGroup.stories.length === 1) {
                    onClose();
                  } else {
                    // Avançar para o próximo story ou voltar
                    if (storyIndex < currentGroup.stories.length - 1) {
                      setStoryIndex(storyIndex + 1);
                    } else if (groupIndex < storiesGroups.length - 1) {
                      setGroupIndex(groupIndex + 1);
                      setStoryIndex(0);
                    } else {
                      onClose();
                    }
                  }
                } else {
                  throw new Error(response.message || 'Erro ao excluir story');
                }
              } catch (error: any) {
                console.error('Erro ao excluir story:', error);
                showToast.error('Erro', error.message || 'Não foi possível excluir o story');
              } finally {
                setDeleting(false);
              }
            },
          },
        ]
      );
    }
  }, [showDeleteConfirm, currentStory?._id, currentGroup?.stories.length, storyIndex, groupIndex, storiesGroups.length, onClose]);

  // Verificar status de amizade
  useEffect(() => {
    const checkFriendship = async () => {
      if (!currentStory || !currentUser || currentStory.userId._id === currentUser.id) {
        setIsFriend(false);
        return;
      }

      setLoadingFriendship(true);
      try {
        const response = await userApi.checkFriendshipStatus(currentStory.userId._id);
        if (response.success && response.data) {
          setIsFriend(response.data.status === 'FRIENDLY' || response.data.status === 'FRIENDS');
        }
      } catch (error) {
        console.error('Erro ao verificar amizade:', error);
        setIsFriend(false);
      } finally {
        setLoadingFriendship(false);
      }
    };

    if (visible && currentStory) {
      checkFriendship();
    }
  }, [visible, currentStory?._id, currentUser?.id]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setIsPaused(true),
      onPanResponderRelease: (evt, gestureState) => {
        setIsPaused(false);
        const { locationX } = evt.nativeEvent;
        
        if (gestureState.dy > 50) {
          onClose();
        } else if (locationX < width / 3) {
          prevStory();
        } else if (locationX > (width * 2) / 3) {
          nextStory();
        }
      },
    })
  ).current;

  if (!currentGroup || !currentStory) return null;

  const isOwnStory = currentGroup.user._id === currentUser?.id;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container} {...panResponder.panHandlers}>
        {/* Background do Story */}
        <View style={styles.mediaContainer}>
          <Image
            source={{ uri: currentStory.content.mediaUrl }}
            style={styles.media}
            resizeMode="cover"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
          />
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          )}
        </View>

        {/* Overlay do Story */}
        <View style={styles.overlay}>
          {/* Top Section: Progress Bars + Header */}
          <View style={[styles.topSection, { paddingTop: insets.top + 8 }]}>
            {/* Progress Bars */}
            <View style={styles.progressContainer}>
              {currentGroup.stories.map((_, index) => (
                <View key={index} style={styles.progressBarBg}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      {
                        width:
                          index < storyIndex
                            ? '100%'
                            : index === storyIndex
                            ? progress.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                              })
                            : '0%',
                      },
                    ]}
                  />
                </View>
              ))}
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.userInfo}>
                <Image
                  source={{ uri: getAvatarUrl(currentGroup.user.avatar) }}
                  style={styles.avatar}
                />
                <View>
                  <Text style={styles.username}>{currentGroup.user.username}</Text>
                  <Text style={styles.time}>
                    {formatDistanceToNow(new Date(currentStory.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                {/* Menu de 3 pontinhos */}
                <TouchableOpacity
                  onPress={() => setShowMenu(true)}
                  style={styles.menuButton}
                >
                  <Ionicons name="ellipsis-horizontal" size={24} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={30} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Story Text (se houver) */}
          {currentStory.content.text && (
            <View style={styles.textOverlay}>
              <Text style={styles.storyText}>{currentStory.content.text}</Text>
            </View>
          )}

          {/* Footer Actions */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            {isOwnStory ? (
              <TouchableOpacity 
                style={styles.viewersButton}
                onPress={() => setShowViewers(true)}
              >
                <Ionicons name="eye-outline" size={20} color="#ffffff" />
                <Text style={styles.footerText}>
                  {currentStory.views?.length || 0} visualizações
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                {/* Input de mensagem e reações (apenas para amigos) */}
                {!loadingFriendship && isFriend && (
                  <View style={styles.friendActions}>
                    <View style={styles.messageInputWrapper}>
                      <StoryMessageInput
                        storyId={currentStory._id}
                        storyMediaUrl={currentStory.content.mediaUrl}
                        storyMediaType={currentStory.content.type}
                        recipientId={currentStory.userId._id}
                        currentUserId={currentUser?.id}
                        onMessageSent={() => {
                          showToast.success('Sucesso', 'Mensagem enviada!');
                          setIsPaused(true); // Pausar story após enviar
                        }}
                        onFocus={() => setIsPaused(true)}
                        onBlur={() => setIsPaused(false)}
                      />
                    </View>
                    <StoryReactionButton
                      storyId={currentStory._id}
                      currentUserId={currentUser?.id}
                      isFriend={true}
                      onReactionAdded={() => {
                        // Atualizar visualizações se necessário
                      }}
                    />
                  </View>
                )}

                {/* Reações centralizadas (se não for amigo) */}
                {!loadingFriendship && !isFriend && (
                  <View style={styles.nonFriendActions}>
                    <StoryReactionButton
                      storyId={currentStory._id}
                      currentUserId={currentUser?.id}
                      isFriend={false}
                      onReactionAdded={() => {
                        // Atualizar visualizações se necessário
                      }}
                    />
                    <TouchableOpacity 
                      style={styles.reportButton}
                      onPress={() => {
                        Alert.alert('Denunciar Story', 'Deseja denunciar este conteúdo?', [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Denunciar', style: 'destructive', onPress: () => storiesApi.reportStory(currentStory._id, { category: 'other', description: 'Reported from mobile' }) }
                        ]);
                      }}
                    >
                      <Ionicons name="flag-outline" size={24} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Menu de Opções */}
        {showMenu && (
          <Modal
            visible={showMenu}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowMenu(false)}
          >
            <TouchableOpacity
              style={styles.menuOverlay}
              activeOpacity={1}
              onPress={() => setShowMenu(false)}
            >
              <View style={styles.menuContainer}>
                {isOwnStory ? (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.states.error} />
                    <Text style={[styles.menuItemText, { color: COLORS.states.error }]}>
                      Excluir story
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowMenu(false);
                      setShowReportModal(true);
                    }}
                  >
                    <Ionicons name="flag-outline" size={20} color={COLORS.states.warning} />
                    <Text style={[styles.menuItemText, { color: COLORS.states.warning }]}>
                      Denunciar story
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemLast]}
                  onPress={() => setShowMenu(false)}
                >
                  <Text style={styles.menuItemText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}


        {/* Modal de Denúncia */}
        <ReportStoryModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          storyId={currentStory._id}
          storyOwnerUsername={currentGroup.user.username}
        />

        {/* Modal de Visualizadores (Simplified) */}
        {showViewers && (
          <Modal
            visible={showViewers}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowViewers(false)}
          >
            <View style={styles.viewersOverlay}>
              <View style={styles.viewersContainer}>
                <View style={styles.viewersHeader}>
                  <Text style={styles.viewersTitle}>Visualizações</Text>
                  <TouchableOpacity onPress={() => setShowViewers(false)}>
                    <Ionicons name="close" size={24} color={COLORS.text.primary} />
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.viewersList}>
                  {currentStory.views?.map((view: any, index: number) => (
                    <View key={index} style={styles.viewerItem}>
                      <Image
                        source={{ uri: getAvatarUrl(view.userId.avatar) }}
                        style={styles.viewerAvatar}
                      />
                      <Text style={styles.viewerUsername}>{view.userId.username}</Text>
                    </View>
                  ))}
                  {(!currentStory.views || currentStory.views.length === 0) && (
                    <Text style={styles.noViewersText}>Nenhuma visualização ainda</Text>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: width,
    height: height,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topSection: {
    width: '100%',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  username: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  time: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    minWidth: 200,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  textOverlay: {
    position: 'absolute',
    top: '40%',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  storyText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 12,
  },
  footer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  viewersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 400,
  },
  messageInputWrapper: {
    flex: 1,
  },
  nonFriendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  viewerActions: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
  footerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  viewersOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  viewersContainer: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
    padding: 20,
  },
  viewersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    paddingBottom: 12,
  },
  viewersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  viewersList: {
    gap: 16,
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  viewerUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  noViewersText: {
    textAlign: 'center',
    color: COLORS.text.tertiary,
    marginTop: 40,
    fontSize: 16,
  },
});

import { ptBR } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';

