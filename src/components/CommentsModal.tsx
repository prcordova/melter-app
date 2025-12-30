import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { postsApi, userApi } from '../services/api';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { COLORS } from '../theme/colors';
import { Comment } from '../types/feed';

import { Avatar } from './Avatar';

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
}

export function CommentsModal({ visible, onClose, postId }: CommentsModalProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  
  // Estados para autocomplete de menções
  const [userSuggestions, setUserSuggestions] = useState<Array<{ _id: string; username: string; avatar?: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const response = await postsApi.getComments(postId);
      if (response.success) {
        // O backend do Melter pode retornar os comentários já estruturados ou flat
        // Vamos assumir que recebemos uma lista e organizamos por parentId se necessário
        const allComments = response.data.comments || response.data || [];
        setComments(allComments);
      }
    } catch (error) {
      console.error('[CommentsModal] Erro ao carregar comentários:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (visible && postId) {
      fetchComments();
    }
  }, [visible, postId, fetchComments]);

  // Buscar usuários para autocomplete de menções
  const searchUsers = async (query: string) => {
    if (!query || query.length < 1) {
      setUserSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setLoadingSuggestions(true);
      const response = await userApi.searchMentions(query);
      if (response.success && response.data) {
        setUserSuggestions(response.data);
        setShowSuggestions(response.data.length > 0);
        setSelectedSuggestionIndex(0);
      } else {
        setUserSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('[CommentsModal] Erro ao buscar usuários:', error);
      setUserSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Detectar menções no texto
  useEffect(() => {
    const text = commentText;
    const lastAtIndex = text.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = text.substring(lastAtIndex + 1);
      
      // Verificar se não há espaço após o @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearchQuery(textAfterAt);
        searchUsers(textAfterAt);
        return;
      }
    }
    
    // Se não houver @ ou houver espaço, fechar sugestões
    setShowSuggestions(false);
    setMentionSearchQuery('');
  }, [commentText]);

  // Selecionar usuário das sugestões
  const selectMention = (username: string) => {
    const text = commentText;
    const lastAtIndex = text.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Substituir @query por @username + espaço
      const beforeAt = text.substring(0, lastAtIndex);
      const afterQuery = text.substring(lastAtIndex).split(' ').slice(1).join(' ');
      const newText = `${beforeAt}@${username} ${afterQuery}`;
      
      setCommentText(newText);
      setShowSuggestions(false);
      setMentionSearchQuery('');
      setSelectedSuggestionIndex(0);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || sending) return;

    try {
      setSending(true);
      console.log('[CommentsModal] Enviando comentário para postId:', postId);
      
      let response;
      
      // Se for uma resposta, anexamos a menção no texto, pois o backend 
      // do Melter ainda não suporta nested comments nativamente (parentId)
      // O backend detecta menções (@username) automaticamente.
      response = await postsApi.commentOnPost(postId, commentText.trim());

      if (response.success) {
        setCommentText('');
        setReplyingTo(null);
        fetchComments();
      }
    } catch (error) {
      console.error('[CommentsModal] Erro ao enviar:', error);
      if ((error as any).response?.status === 404) {
        Alert.alert('Erro', 'Post não encontrado ou endpoint inválido (404)');
      } else {
        Alert.alert('Erro', 'Não foi possível enviar o comentário');
      }
    } finally {
      setSending(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      // Atualização otimista
      setComments(prev => prev.map(c => {
        if (c._id === commentId) {
          const isLiked = c.userReaction === 'LIKE';
          return {
            ...c,
            userReaction: isLiked ? null : 'LIKE',
            reactionsCount: {
              ...c.reactionsCount,
              LIKE: (c.reactionsCount?.LIKE || 0) + (isLiked ? -1 : 1),
              total: (c.reactionsCount?.total || 0) + (isLiked ? -1 : 1),
            }
          } as Comment;
        }
        return c;
      }));

      await postsApi.reactToComment(postId, commentId);
    } catch (error) {
      console.error('[CommentsModal] Erro ao curtir comentário:', error);
      fetchComments(); // Reverter se der erro
    }
  };

  const handleUserProfilePress = (username: string) => {
    onClose();
    navigation.navigate('UserProfile', { username });
  };

  const getTimeAgo = (date: string | Date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return 'Agora';
    }
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isLiked = comment.userReaction === 'LIKE';

    return (
      <View key={comment._id} style={[styles.commentWrapper, isReply && styles.replyWrapper]}>
        <View style={styles.commentContainer}>
          {/* Avatar usando componente padrão */}
          <Avatar 
            user={{ username: comment.userId.username, avatar: comment.userId.avatar }} 
            size={isReply ? 32 : 40}
            onPress={() => handleUserProfilePress(comment.userId.username)}
          />

          {/* Conteúdo */}
          <View style={styles.commentContent}>
            <View style={styles.commentBubble}>
              <TouchableOpacity onPress={() => handleUserProfilePress(comment.userId.username)}>
                <Text style={styles.username}>{comment.userId.username}</Text>
              </TouchableOpacity>
              <Text style={styles.text}>{comment.content}</Text>
            </View>

            {/* Ações do Comentário */}
            <View style={styles.commentActions}>
              <Text style={styles.time}>{getTimeAgo(comment.createdAt)}</Text>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleLikeComment(comment._id)}
              >
                <Text style={[styles.actionText, isLiked && styles.likedText]}>
                  {isLiked ? 'Curtiu' : 'Curtir'}
                  {(comment.reactionsCount?.total || 0) > 0 && ` (${comment.reactionsCount?.total})`}
                </Text>
              </TouchableOpacity>

              {!isReply && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    setReplyingTo(comment);
                    setCommentText(`@${comment.userId.username} `);
                  }}
                >
                  <Text style={styles.actionText}>Responder</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Renderizar Respostas (se houver) */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesList}>
            {comment.replies.map(reply => renderComment(reply, true))}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.overlay}>
          <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIndicator} />
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle}>Comentários</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Lista */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={COLORS.secondary.main} />
                </View>
              ) : comments.length === 0 ? (
                <View style={styles.centerContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color={COLORS.text.tertiary} />
                  <Text style={styles.emptyText}>Nenhum comentário ainda.</Text>
                  <Text style={styles.emptySubtext}>Seja o primeiro a participar!</Text>
                </View>
              ) : (
                comments.map(comment => renderComment(comment))
              )}
            </ScrollView>

            {/* Barra de Resposta/Comentário */}
            {replyingTo && (
              <View style={styles.replyingToBar}>
                <Text style={styles.replyingToText}>
                  Respondendo a <Text style={{ fontWeight: 'bold' }}>@{replyingTo.userId.username}</Text>
                </Text>
                <TouchableOpacity onPress={() => {
                  setReplyingTo(null);
                  setCommentText('');
                }}>
                  <Ionicons name="close-circle" size={20} color={COLORS.text.secondary} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputArea}>
              {/* Sugestões de menções */}
              {showSuggestions && userSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView 
                    style={styles.suggestionsList}
                    keyboardShouldPersistTaps="handled"
                  >
                    {userSuggestions.map((user, index) => (
                      <TouchableOpacity
                        key={user._id}
                        style={[
                          styles.suggestionItem,
                          index === selectedSuggestionIndex && styles.suggestionItemSelected,
                        ]}
                        onPress={() => selectMention(user.username)}
                      >
                        <Avatar
                          user={{ username: user.username, avatar: user.avatar }}
                          size={32}
                          disableNavigation={true}
                        />
                        <Text style={styles.suggestionText}>@{user.username}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={replyingTo ? "Escreva sua resposta..." : "Escreva um comentário..."}
                  placeholderTextColor={COLORS.text.tertiary}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!commentText.trim() || sending) && styles.sendButtonDisabled]}
                  onPress={handleSendComment}
                  disabled={!commentText.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerIndicator: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border.medium,
    borderRadius: 2,
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  commentWrapper: {
    marginBottom: 20,
  },
  replyWrapper: {
    marginTop: 12,
    marginBottom: 0,
  },
  commentContainer: {
    flexDirection: 'row',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.secondary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
  },
  commentBubble: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 16,
    padding: 12,
  },
  username: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  text: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 4,
  },
  time: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginRight: 16,
  },
  actionButton: {
    marginRight: 16,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  likedText: {
    color: COLORS.secondary.main,
  },
  repliesList: {
    marginLeft: 44,
    marginTop: 4,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border.light,
    paddingLeft: 12,
  },
  replyingToBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.tertiary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  replyingToText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  inputArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  suggestionsContainer: {
    maxHeight: 150,
    backgroundColor: COLORS.background.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  suggestionsList: {
    maxHeight: 150,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background.paper,
  },
  suggestionItemSelected: {
    backgroundColor: COLORS.background.tertiary,
  },
  suggestionText: {
    fontSize: 15,
    color: COLORS.text.primary,
    marginLeft: 12,
    fontWeight: '500',
  },
});
