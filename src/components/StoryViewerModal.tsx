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
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StoriesGroup, Story } from '../types/feed';
import { storiesApi, userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { COLORS } from '../theme/colors';
import { showToast } from './CustomToast';
import { StoryReactionButton } from './stories/StoryReactionButton';
import { StoryReactionButtonDrag } from './stories/StoryReactionButtonDrag';
import { StoryMessageInput } from './stories/StoryMessageInput';
import { ReportStoryModal } from './stories/ReportStoryModal';
import * as ScreenCapture from 'expo-screen-capture';
import * as Clipboard from 'expo-clipboard';
import { API_CONFIG } from '../config/api.config';
import { Video, ResizeMode } from 'expo-av';

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
  const navigation = useNavigation<any>();
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
  const [textExpanded, setTextExpanded] = useState(false);
  
  const progress = useRef(new Animated.Value(0)).current;
  const currentGroup = storiesGroups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const isOwnStory = currentStory?.userId?._id === currentUser?.id || 
                     (typeof currentStory?.userId === 'string' && currentStory?.userId === currentUser?.id) ||
                     (currentGroup?.user?._id === currentUser?.id);

  // Função para truncar texto em 2 linhas (aproximadamente 60 caracteres por linha)
  const getTruncatedText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated;
  };

  const shouldShowReadMore = (text: string) => {
    return text.length > 120; // Aproximadamente 2 linhas
  };

  const handleTextPress = () => {
    if (shouldShowReadMore(currentStory?.content?.text || '') && !textExpanded) {
      setIsPaused(true);
      setTextExpanded(true);
    }
  };

  const handleCloseExpandedText = () => {
    setTextExpanded(false);
    setIsPaused(false);
  };

  const togglePlayPause = () => {
    setIsPaused(!isPaused);
  };

  const handleShareStory = async () => {
    if (!currentStory) return;
    
    setIsPaused(true); // Pausar story ao compartilhar
    
    try {
      // Criar URL do story (similar ao web)
      // Nota: Quando alguém abrir este link, o backend valida:
      // - Se o story está expirado (retorna 410)
      // - Se o usuário tem permissão baseado na visibilidade (retorna 403 se não tiver)
      // A validação é feita automaticamente pela rota GET /api/stories/:id
      const shareUrl = `${API_CONFIG.APP_URL || 'https://melter.app'}/stories/${currentGroup.user.username}/${currentStory._id}`;
      
      await Clipboard.setStringAsync(shareUrl);
      showToast.success('Sucesso', 'Link copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao compartilhar story:', error);
      showToast.error('Erro', 'Não foi possível copiar o link');
    }
  };
  
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
    // Resetar índices somente quando o modal abrir (ou quando o índice inicial mudar)
    // NÃO depender de storyIndex aqui, senão ele reseta para 0 a cada avanço e fica em loop no primeiro story.
    if (visible) {
      setGroupIndex(initialGroupIndex);
      setStoryIndex(0);
      progress.setValue(0);
      setTextExpanded(false);
    }
  }, [visible, initialGroupIndex, progress]);


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

  // Desativar screenshots quando o modal estiver aberto
  useEffect(() => {
    if (visible) {
      // Desativar screenshots
      ScreenCapture.preventScreenCaptureAsync().catch((error) => {
        console.error('Erro ao desativar screenshots:', error);
      });

      // Reativar screenshots quando o modal fechar
      return () => {
        ScreenCapture.allowScreenCaptureAsync().catch((error) => {
          console.error('Erro ao reativar screenshots:', error);
        });
      };
    } else {
      // Garantir que screenshots estão reativados quando o modal não está visível
      ScreenCapture.allowScreenCaptureAsync().catch((error) => {
        console.error('Erro ao reativar screenshots:', error);
      });
    }
  }, [visible]);

  // Marcar como visto
  useEffect(() => {
    if (visible && currentStory && !loading) {
      storiesApi.viewStory(currentStory._id).then(() => {
        if (onStoryViewed) onStoryViewed(currentStory._id);
      }).catch(() => {});
    }
  }, [currentStory?._id, visible, loading]);

  // Resetar loading quando trocar de story (evita travar se o anterior ficou em loading)
  useEffect(() => {
    if (visible && currentStory?._id) {
      setLoading(true);
    }
  }, [visible, currentStory?._id]);

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
          {(() => {
            // Determinar se é vídeo: verificar tipo (case-insensitive) ou extensão da URL
            const contentType = currentStory.content.type?.toLowerCase() || '';
            const mediaUrl = currentStory.content.mediaUrl || '';
            const isVideoFile = 
              contentType === 'video' || 
              /\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)$/i.test(mediaUrl);
            
            return isVideoFile ? (
              <Video
                key={currentStory._id}
                source={{ uri: mediaUrl }}
                style={styles.media}
                resizeMode={ResizeMode.COVER}
                shouldPlay={!isPaused}
                isLooping
                onLoadStart={() => setLoading(true)}
                onLoad={() => {
                  setLoading(false);
                }}
                onError={(error) => {
                  console.error('Erro ao carregar vídeo do story:', error);
                  setLoading(false);
                }}
              />
            ) : (
              <Image
                key={currentStory._id}
                source={{ uri: mediaUrl }}
                style={styles.media}
                resizeMode="cover"
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onError={(error) => {
                  console.error('Erro ao carregar imagem do story:', {
                    storyId: currentStory._id,
                    mediaUrl,
                    contentType: currentStory.content.type,
                    error: error.nativeEvent?.error || error,
                  });
                  setLoading(false);
                }}
              />
            );
          })()}
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
              <TouchableOpacity 
                style={styles.userInfo}
                onPress={() => {
                  if (currentGroup.user.username) {
                    navigation.navigate('UserProfile', { username: currentGroup.user.username });
                  }
                }}
                activeOpacity={0.7}
              >
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
              </TouchableOpacity>
              <View style={styles.headerActions}>
                {/* Menu de 3 pontinhos */}
                <TouchableOpacity
                  onPress={() => {
                    setIsPaused(true); // Pausar story ao abrir menu
                    setShowMenu(true);
                  }}
                  style={styles.menuButton}
                >
                  <Ionicons name="ellipsis-horizontal" size={24} color="#ffffff" />
                </TouchableOpacity>
                {/* Botão play/pause - lado direito do menu */}
                <TouchableOpacity 
                  style={styles.playPauseButtonHeader}
                  onPress={togglePlayPause}
                >
                  <Ionicons 
                    name={isPaused ? "play" : "pause"} 
                    size={20} 
                    color="#ffffff" 
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={30} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Linha 1: Texto do story com botão reagir (apenas para amigos) */}
          {currentStory.content.text && !textExpanded && (
            <View style={[styles.storyTextContainer, { bottom: insets.bottom + (isOwnStory || !isFriend ? 60 : 100) }]}>
              <View style={styles.storyTextRow}>
                <TouchableOpacity
                  style={styles.textOverlay}
                  onPress={handleTextPress}
                  activeOpacity={shouldShowReadMore(currentStory.content.text) ? 0.7 : 1}
                >
                  <Text 
                    style={[
                      styles.storyText,
                      { textAlign: isOwnStory ? 'left' : 'center' }
                    ]} 
                    numberOfLines={2}
                  >
                    {shouldShowReadMore(currentStory.content.text) 
                      ? getTruncatedText(currentStory.content.text) + ' '
                      : currentStory.content.text.substring(0, 300)}
                    {shouldShowReadMore(currentStory.content.text) && (
                      <Text style={styles.readMoreText}>ver mais</Text>
                    )}
                  </Text>
                </TouchableOpacity>
                {/* Botão reagir ao lado direito do texto (apenas para amigos) */}
                {!isOwnStory && !loadingFriendship && isFriend && (
                  <StoryReactionButtonDrag
                    storyId={currentStory._id}
                    currentUserId={currentUser?.id}
                    onReactionAdded={() => {
                      // Atualizar visualizações se necessário
                    }}
                    onDragStart={() => setIsPaused(true)} // Pausar story ao abrir menu
                    onDragEnd={() => setIsPaused(false)} // Retomar story ao fechar menu
                  />
                )}
              </View>
            </View>
          )}
          
          {/* Linha 1: Apenas botão reagir se não houver texto (apenas para amigos) */}
          {(!currentStory.content.text || textExpanded) && !isOwnStory && !loadingFriendship && isFriend && (
            <View style={[styles.storyTextContainer, { bottom: insets.bottom + 100 }]}>
              <View style={styles.storyTextRow}>
                <View style={{ flex: 1 }} />
                <StoryReactionButtonDrag
                  storyId={currentStory._id}
                  currentUserId={currentUser?.id}
                  onReactionAdded={() => {
                    // Atualizar visualizações se necessário
                  }}
                  onDragStart={() => setIsPaused(true)} // Pausar story ao abrir menu
                  onDragEnd={() => setIsPaused(false)} // Retomar story ao fechar menu
                />
              </View>
            </View>
          )}

          {/* Linha 2: Input de conversa (apenas para amigos) - sempre aberto, ocupa todo espaço horizontal */}
          {!isOwnStory && !loadingFriendship && isFriend && (
            <View style={[styles.footerActions, { bottom: insets.bottom + 8 }]}>
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
                alwaysExpanded={true}
              />
            </View>
          )}

          {/* Linha 2: Visualizações (apenas para dono) - bottom esquerdo */}
          {isOwnStory && (
            <View style={[styles.bottomActionButtons, { bottom: insets.bottom + 8 }]}>
              <TouchableOpacity 
                style={styles.viewersIconButton}
                onPress={() => {
                  setIsPaused(true); // Pausar story ao ver visualizações
                  setShowViewers(true);
                }}
              >
                <Ionicons name="eye-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Linha 2: Reagir (para não-amigos) */}
          {!isOwnStory && !loadingFriendship && !isFriend && (
            <View style={[styles.bottomActionButtons, { bottom: insets.bottom + 8 }]}>
              <StoryReactionButtonDrag
                storyId={currentStory._id}
                currentUserId={currentUser?.id}
                onReactionAdded={() => {
                  // Atualizar visualizações se necessário
                }}
                onDragStart={() => setIsPaused(true)} // Pausar story ao abrir menu
                onDragEnd={() => setIsPaused(false)} // Retomar story ao fechar menu
              />
            </View>
          )}

          {/* Modal de texto expandido */}
          {currentStory.content.text && textExpanded && (
                <Modal
                  visible={textExpanded}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={handleCloseExpandedText}
                >
                  <TouchableOpacity
                    style={styles.expandedTextOverlay}
                    activeOpacity={1}
                    onPress={handleCloseExpandedText}
                  >
                    <TouchableOpacity
                      style={styles.expandedTextContainer}
                      activeOpacity={1}
                      onPress={(e) => e.stopPropagation()}
                    >
                      <View style={styles.expandedTextHeader}>
                        <Text style={styles.expandedTextTitle}>Texto do Story</Text>
                        <TouchableOpacity onPress={handleCloseExpandedText}>
                          <Ionicons name="close" size={24} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={styles.expandedTextScroll}>
                        <Text style={styles.expandedText}>
                          {currentStory.content.text.substring(0, 300)}
                        </Text>
                      </ScrollView>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>
          )}
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
                {/* Compartilhar (para todos) */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    handleShareStory(); // handleShareStory já pausa o story
                  }}
                >
                  <Ionicons name="share-outline" size={20} color={COLORS.primary.main} />
                  <Text style={[styles.menuItemText, { color: COLORS.primary.main }]}>
                    Compartilhar
                  </Text>
                </TouchableOpacity>

                {isOwnStory ? (
                  <TouchableOpacity
                    style={styles.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    setIsPaused(true); // Pausar story ao tentar excluir
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
                    setIsPaused(true); // Pausar story ao denunciar
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
                  onPress={() => {
                    setShowMenu(false);
                    setIsPaused(false); // Retomar story ao fechar menu
                  }}
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
          onClose={() => {
            setShowReportModal(false);
            setIsPaused(false); // Retomar story ao fechar modal de denúncia
          }}
          storyId={currentStory._id}
          storyOwnerUsername={currentGroup.user.username}
        />

        {/* Modal de Visualizadores (Simplified) */}
        {showViewers && (
          <Modal
            visible={showViewers}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
              setShowViewers(false);
              setIsPaused(false); // Retomar story ao fechar visualizações
            }}
          >
            <View style={styles.viewersOverlay}>
              <View style={styles.viewersContainer}>
                <View style={styles.viewersHeader}>
                  <Text style={styles.viewersTitle}>Visualizações</Text>
                  <TouchableOpacity onPress={() => {
                    setShowViewers(false);
                    setIsPaused(false); // Retomar story ao fechar visualizações
                  }}>
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
  storyTextContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 3,
  },
  storyTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomActionButtons: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    zIndex: 3,
  },
  textOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  storyText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'left',
    lineHeight: 22,
  },
  readMoreText: {
    color: '#4FC3F7',
    fontWeight: '600',
  },
  expandedTextOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedTextContainer: {
    width: '85%',
    maxWidth: 400,
    maxHeight: '70%',
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  expandedTextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  expandedTextTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  expandedTextScroll: {
    maxHeight: 400,
  },
  expandedText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  viewersIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  playPauseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  playPauseButtonHeader: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
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
  footerActions: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportButtonBottom: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  nonFriendReactions: {
    position: 'absolute',
    alignSelf: 'center',
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

