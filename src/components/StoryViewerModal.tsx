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
import { getAdminSessionToken } from '../lib/admin-session';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';
import { showToast } from './CustomToast';
import { StoryReactionButton } from './stories/StoryReactionButton';
import { StoryReactionButtonDrag } from './stories/StoryReactionButtonDrag';
import { StoryMessageInput } from './stories/StoryMessageInput';
import { ReportStoryModal } from './stories/ReportStoryModal';
import * as ScreenCapture from 'expo-screen-capture';
import * as Clipboard from 'expo-clipboard';
import { API_CONFIG } from '../config/api.config';
import { AppVideo } from './AppVideo';

const { width, height } = Dimensions.get('window');
const STORY_DURATION_FALLBACK_MS = 5000;
/** Presigned GET de stories expira em ~15 min — renovar antes (igual web). */
const STORY_SIGNED_URL_REFRESH_MS = 12 * 60 * 1000;

function resolveStoryDurationMs(story: Story | undefined): number {
  const seconds = Number(story?.duration);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(30, Math.max(3, seconds)) * 1000;
  }
  return STORY_DURATION_FALLBACK_MS;
}

function isRawStoryStorageKey(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:') || /^https?:\/\//i.test(trimmed)) return false;
  return trimmed.startsWith('stories/');
}

/** URL utilizável em Image/Video (presigned, http, data). Key crua `stories/...` não serve. */
function getBrowsableStoryMediaUrl(stored: string | null | undefined): string | undefined {
  if (!stored?.trim()) return undefined;
  const trimmed = stored.trim();
  if (trimmed.startsWith('data:') || /^https?:\/\//i.test(trimmed)) return trimmed;
  if (isRawStoryStorageKey(trimmed)) return undefined;
  return trimmed;
}

function mediaPathname(url: string): string {
  try {
    if (/^https?:\/\//i.test(url)) return new URL(url).pathname;
  } catch {
    // URL inválida — cair no split por query
  }
  return url.split('?')[0] || url;
}

function isStoryVideoMedia(typeOrMime: string | undefined, mediaUrl: string): boolean {
  const hint = typeOrMime?.toLowerCase() || '';
  if (hint === 'video' || hint.startsWith('video/')) return true;
  if (hint === 'image' || hint === 'gif' || hint.startsWith('image/')) return false;
  return /\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)$/i.test(mediaPathname(mediaUrl));
}

function mediaDebugPath(url: string): string {
  try {
    if (/^https?:\/\//i.test(url)) return new URL(url).pathname;
  } catch {
    // ignore
  }
  return (url.split('?')[0] || url).slice(0, 160);
}

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
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
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
  const [signedMediaUrl, setSignedMediaUrl] = useState<string | null>(null);
  const [signedMediaContentType, setSignedMediaContentType] = useState<string | null>(null);
  
  const progress = useRef(new Animated.Value(0)).current;
  const mediaSignRetryForStoryRef = useRef<string | null>(null);
  const currentGroup = storiesGroups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const rawStoryMediaUrl = currentStory?.content?.mediaUrl || '';
  const canvasData =
    currentStory?.content && 'canvasData' in currentStory.content
      ? (currentStory.content as { canvasData?: string }).canvasData
      : undefined;
  const activeMediaUrl =
    (canvasData && canvasData.startsWith('data:') ? canvasData : undefined) ||
    signedMediaUrl ||
    getBrowsableStoryMediaUrl(rawStoryMediaUrl) ||
    '';
  const activeMediaKindHint =
    signedMediaContentType ||
    currentStory?.content?.type ||
    undefined;
  const isOwnStory = currentStory?.userId?._id === currentUser?.id || 
                     (typeof currentStory?.userId === 'string' && currentStory?.userId === currentUser?.id) ||
                     (currentGroup?.user?._id === currentUser?.id);
  const isAdminModerator = currentUser?.accountType === 'admin';
  const canModerateStory = isOwnStory || Boolean(isAdminModerator);

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

  const applyStoryVisibility = async (v: 'public' | 'followers' | 'friends') => {
    if (!currentStory) return;
    try {
      const needsAdminSession = Boolean(isAdminModerator && !isOwnStory);
      let adminTok: string | null = null;
      if (needsAdminSession) {
        adminTok = await getAdminSessionToken();
        if (!adminTok) {
          showToast.error(
            'Sessão admin',
            'Confirme a senha de administrador no detalhe de um post (⋯) antes de alterar stories de outros.'
          );
          return;
        }
      }
      const res = await storiesApi.patchStoryVisibility(
        currentStory._id,
        v,
        needsAdminSession && adminTok ? { adminSessionToken: adminTok } : undefined
      );
      if (res.success) {
        showToast.success('Sucesso', 'Visibilidade do story atualizada');
      } else {
        showToast.error('Erro', res.message || 'Não foi possível atualizar');
      }
    } catch (e: any) {
      showToast.error('Erro', e?.response?.data?.message || 'Não foi possível atualizar');
    }
  };

  const openStoryVisibilityPicker = async () => {
    setShowMenu(false);
    if (!currentStory) return;
    const needsAdminSession = Boolean(isAdminModerator && !isOwnStory);
    if (needsAdminSession) {
      const tok = await getAdminSessionToken();
      if (!tok) {
        showToast.error(
          'Sessão admin',
          'Confirme a senha de administrador no detalhe de um post (⋯) antes de alterar stories de outros.'
        );
        return;
      }
    }
    Alert.alert('Visibilidade do story', 'Quem pode ver?', [
      { text: 'Público', onPress: () => void applyStoryVisibility('public') },
      { text: 'Seguidores', onPress: () => void applyStoryVisibility('followers') },
      { text: 'Amigos', onPress: () => void applyStoryVisibility('friends') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
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

    // Retoma só o tempo restante (se buffering pausou a barra no meio, não reinicia 5s cheios).
    let startValue = 0;
    progress.stopAnimation((value) => {
      startValue = typeof value === 'number' ? value : 0;
    });
    const totalMs = resolveStoryDurationMs(currentStory);
    const remainingMs = Math.max(120, (1 - Math.min(1, Math.max(0, startValue))) * totalMs);

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: remainingMs,
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

  // Assinar / renovar URL da mídia privada (paridade com web StoriesViewer)
  useEffect(() => {
    if (!visible || !currentStory?._id) {
      setSignedMediaUrl(null);
      setSignedMediaContentType(null);
      mediaSignRetryForStoryRef.current = null;
      return;
    }

    const storyId = currentStory._id;
    const initialUrl = currentStory.content?.mediaUrl || null;
    mediaSignRetryForStoryRef.current = null;
    setSignedMediaContentType(null);

    if (initialUrl && !isRawStoryStorageKey(initialUrl)) {
      setSignedMediaUrl(getBrowsableStoryMediaUrl(initialUrl) ?? null);
    } else {
      setSignedMediaUrl(null);
    }

    let cancelled = false;

    const refreshSignedUrl = async (isInitial = false) => {
      try {
        const response = await storiesApi.signMedia(storyId);
        if (cancelled) return;
        if (response.success && response.data?.mediaUrl) {
          setSignedMediaUrl(response.data.mediaUrl);
          if (response.data.contentType) {
            setSignedMediaContentType(response.data.contentType);
          }
          return;
        }
        if (isInitial && isRawStoryStorageKey(initialUrl || '')) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Erro ao renovar URL do story:', error);
        if (!cancelled && isInitial && isRawStoryStorageKey(initialUrl || '')) {
          setLoading(false);
        }
      }
    };

    void refreshSignedUrl(true);
    const intervalId = setInterval(() => void refreshSignedUrl(false), STORY_SIGNED_URL_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [visible, currentStory?._id]);

  const refreshStoryMediaOnError = useCallback(async () => {
    if (!currentStory?._id) {
      setLoading(false);
      return;
    }
    // Uma tentativa de reassinatura por story — evita loop se a mídia for inválida de verdade
    if (mediaSignRetryForStoryRef.current === currentStory._id) {
      setLoading(false);
      return;
    }
    mediaSignRetryForStoryRef.current = currentStory._id;
    setLoading(true);
    try {
      const response = await storiesApi.signMedia(currentStory._id);
      if (response.success && response.data?.mediaUrl) {
        setSignedMediaUrl(response.data.mediaUrl);
        if (response.data.contentType) {
          setSignedMediaContentType(response.data.contentType);
        }
        return;
      }
    } catch (error) {
      console.error('Erro ao reassinar mídia do story após falha de carga:', error);
    }
    setLoading(false);
  }, [currentStory?._id]);

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
                const authorId = currentStory.userId?._id;
                const needsAdminSession =
                  Boolean(currentUser?.accountType === 'admin' && authorId && currentUser?.id && String(authorId) !== String(currentUser.id));
                let adminTok: string | null = null;
                if (needsAdminSession) {
                  adminTok = await getAdminSessionToken();
                  if (!adminTok) {
                    showToast.error(
                      'Sessão admin',
                      'Confirme a senha de administrador no detalhe de um post (⋯) ou na web antes de eliminar stories de outros.'
                    );
                    setShowDeleteConfirm(false);
                    setDeleting(false);
                    return;
                  }
                }
                const response = await storiesApi.deleteStory(
                  currentStory._id,
                  needsAdminSession && adminTok ? { adminSessionToken: adminTok } : undefined
                );
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

  if (!currentGroup || !currentStory) return null;

  // Dividir tela em 3 colunas iguais para navegação
  const columnWidth = width / 3;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Background do Story */}
        <View style={styles.mediaContainer}>
          {(() => {
            const mediaUrl = activeMediaUrl;
            if (!mediaUrl) {
              return null;
            }
            const isVideoFile = isStoryVideoMedia(activeMediaKindHint, mediaUrl);

            return isVideoFile ? (
              <AppVideo
                key={`${currentStory._id}:${mediaDebugPath(mediaUrl)}`}
                uri={mediaUrl}
                style={styles.media}
                contentFit="cover"
                autoPlay
                paused={isPaused || loading}
                loop={false}
                onLoadStart={() => setLoading(true)}
                onLoad={() => {
                  setLoading(false);
                }}
                onEnd={() => {
                  // Para a barra antes — evita nextStory duplo (timer + fim do vídeo)
                  progress.stopAnimation();
                  if (!isPaused) nextStory();
                }}
                onError={(error) => {
                  console.error('Erro ao carregar vídeo do story:', {
                    storyId: currentStory._id,
                    path: mediaDebugPath(mediaUrl),
                    contentType: activeMediaKindHint,
                    error,
                  });
                  void refreshStoryMediaOnError();
                }}
              />
            ) : (
              <Image
                key={`${currentStory._id}:${mediaDebugPath(mediaUrl)}`}
                source={{ uri: mediaUrl }}
                style={styles.media}
                resizeMode="cover"
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onError={(error) => {
                  console.error('Erro ao carregar imagem do story:', {
                    storyId: currentStory._id,
                    path: mediaDebugPath(mediaUrl),
                    storyType: currentStory.content.type,
                    responseContentType: signedMediaContentType,
                    error: error.nativeEvent?.error || error,
                  });
                  void refreshStoryMediaOnError();
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
        
        {/* Camada para gestos de swipe (PanResponder) - abaixo das áreas clicáveis */}
        {/* 3 Colunas invisíveis para navegação */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Coluna esquerda - voltar story */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: columnWidth,
            }}
            activeOpacity={1}
            onPress={prevStory}
          />
          {/* Coluna centro - pausar enquanto segura */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              left: columnWidth,
              top: 0,
              bottom: 0,
              width: columnWidth,
            }}
            activeOpacity={1}
            onPressIn={() => setIsPaused(true)}
            onPressOut={() => setIsPaused(false)}
          />
          {/* Coluna direita - avançar story ou fechar */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: columnWidth,
            }}
            activeOpacity={1}
            onPress={() => {
              if (storyIndex < currentGroup.stories.length - 1) {
                nextStory();
              } else if (groupIndex < storiesGroups.length - 1) {
                nextStory();
              } else {
                onClose();
              }
            }}
          />
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

          {/* Linha 2: Visualizações (dono ou admin moderador) - bottom esquerdo */}
          {canModerateStory && (
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
                  <Ionicons name="share-outline" size={20} color={colors.primary.main} />
                  <Text style={[styles.menuItemText, { color: colors.primary.main }]}>
                    Compartilhar
                  </Text>
                </TouchableOpacity>

                {canModerateStory && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      void openStoryVisibilityPicker();
                    }}
                  >
                    <Ionicons name="eye-outline" size={20} color={colors.primary.main} />
                    <Text style={[styles.menuItemText, { color: colors.primary.main }]}>
                      Alterar visibilidade
                    </Text>
                  </TouchableOpacity>
                )}

                {canModerateStory ? (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowMenu(false);
                      setIsPaused(true); // Pausar story ao tentar excluir
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.states.error} />
                    <Text style={[styles.menuItemText, { color: colors.states.error }]}>
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
                    <Ionicons name="flag-outline" size={20} color={colors.states.warning} />
                    <Text style={[styles.menuItemText, { color: colors.states.warning }]}>
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
                    <Ionicons name="close" size={24} color={colors.text.primary} />
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

const createStyles = (c: AppPalette) => StyleSheet.create({
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
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
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
    backgroundColor: c.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: c.background.paper,
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
    borderBottomColor: c.border.light,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
    color: c.text.primary,
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
    backgroundColor: c.overlay,
    justifyContent: 'flex-end',
  },
  viewersContainer: {
    backgroundColor: c.background.paper,
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
    borderBottomColor: c.border.light,
    paddingBottom: 12,
  },
  viewersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: c.text.primary,
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
    color: c.text.primary,
  },
  noViewersText: {
    textAlign: 'center',
    color: c.text.tertiary,
    marginTop: 40,
    fontSize: 16,
  },
  navigationArea: {
    backgroundColor: 'transparent',
  },
});

import { ptBR } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';

