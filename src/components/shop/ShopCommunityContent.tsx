import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { COLORS } from '../../theme/colors';
import { shopCommunityApi } from '../../services/api';
import { showToast } from '../CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar } from '../Avatar';
import { useCustomModal } from '../CustomModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/api.config';

interface Comment {
  _id: string;
  content: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  videoTimestamp?: number;
  fileId: string;
  fileName: string;
  productTitle: string;
  productId: string;
  userId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  createdAt: string;
}

interface ProductLike {
  fileId: string;
  fileName: string;
  likesCount: number;
  likes: Array<{
    _id: string;
    userId: {
      _id: string;
      username: string;
      avatar?: string;
    };
    createdAt: string;
  }>;
}

interface ProductLikes {
  productId: string;
  productTitle: string;
  totalLikes: number;
  likesByFile: ProductLike[];
}

export function ShopCommunityContent() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [likesByProduct, setLikesByProduct] = useState<ProductLikes[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [likesLoading, setLikesLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'approved'>('pending');
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { showConfirm } = useCustomModal();

  useEffect(() => {
    fetchComments();
    fetchLikes();
  }, []);

  const fetchComments = async () => {
    try {
      setCommentsLoading(true);
      const response = await shopCommunityApi.getComments();
      if (response.success && response.data) {
        setComments(response.data.comments || []);
      } else {
        showToast.error('Erro', 'Erro ao carregar comentários');
      }
    } catch (error: any) {
      console.error('[ShopCommunityContent] Erro ao carregar comentários:', error);
      showToast.error('Erro', 'Erro ao carregar comentários');
    } finally {
      setCommentsLoading(false);
    }
  };

  const fetchLikes = async () => {
    try {
      setLikesLoading(true);
      const response = await shopCommunityApi.getLikes();
      if (response.success && response.data) {
        setLikesByProduct(response.data.likesByProduct || []);
      } else {
        showToast.error('Erro', 'Erro ao carregar likes');
      }
    } catch (error: any) {
      console.error('[ShopCommunityContent] Erro ao carregar likes:', error);
      showToast.error('Erro', 'Erro ao carregar likes');
    } finally {
      setLikesLoading(false);
    }
  };

  const handleApprove = async (commentId: string) => {
    try {
      setActionLoading(true);
      const comment = comments.find(c => c._id === commentId);
      if (!comment) return;

      const response = await shopCommunityApi.approveComment(comment.productId, commentId);

      if (response.success) {
        setComments(prev => prev.map(c => 
          c._id === commentId ? { ...c, status: 'APPROVED' } : c
        ));
        setDetailOpen(false);
        showToast.success('Sucesso', 'Comentário aprovado');
        fetchComments();
      } else {
        showToast.error('Erro', response.message || 'Erro ao aprovar comentário');
      }
    } catch (error: any) {
      console.error('[ShopCommunityContent] Erro ao aprovar comentário:', error);
      showToast.error('Erro', error.response?.data?.message || 'Erro ao aprovar comentário');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (commentId: string) => {
    try {
      setActionLoading(true);
      const comment = comments.find(c => c._id === commentId);
      if (!comment) return;

      const response = await shopCommunityApi.rejectComment(comment.productId, commentId);

      if (response.success) {
        setComments(prev => prev.map(c => 
          c._id === commentId ? { ...c, status: 'REJECTED' } : c
        ));
        setDetailOpen(false);
        showToast.success('Sucesso', 'Comentário rejeitado');
        fetchComments();
      } else {
        showToast.error('Erro', response.message || 'Erro ao rejeitar comentário');
      }
    } catch (error: any) {
      console.error('[ShopCommunityContent] Erro ao rejeitar comentário:', error);
      showToast.error('Erro', error.response?.data?.message || 'Erro ao rejeitar comentário');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    showConfirm(
      'Confirmar Exclusão',
      'Tem certeza que deseja remover este comentário? Esta ação não pode ser desfeita.',
      async () => {
        try {
          setActionLoading(true);
          const comment = comments.find(c => c._id === commentId);
          if (!comment) return;

          const response = await shopCommunityApi.deleteComment(comment.productId, comment.fileId, commentId);

          if (response.success) {
            setComments(prev => prev.filter(c => c._id !== commentId));
            setDetailOpen(false);
            showToast.success('Sucesso', 'Comentário removido');
            fetchComments();
          } else {
            showToast.error('Erro', response.message || 'Erro ao remover comentário');
          }
        } catch (error: any) {
          console.error('[ShopCommunityContent] Erro ao remover comentário:', error);
          showToast.error('Erro', error.response?.data?.message || 'Erro ao remover comentário');
        } finally {
          setActionLoading(false);
        }
      },
      {
        confirmText: 'Remover',
        cancelText: 'Cancelar',
        destructive: true,
      }
    );
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'APPROVED': return 'Aprovado';
      case 'REJECTED': return 'Rejeitado';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return COLORS.states.success;
      case 'PENDING': return COLORS.states.warning;
      case 'REJECTED': return COLORS.states.error;
      default: return COLORS.text.secondary;
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return null;
    const mins = Math.floor(timestamp / 60);
    const secs = Math.floor(timestamp % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredComments = comments.filter(comment => {
    if (selectedTab === 'pending') return comment.status === 'PENDING';
    if (selectedTab === 'approved') return comment.status === 'APPROVED';
    return true;
  });

  const sortedComments = selectedTab === 'approved'
    ? [...filteredComments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : filteredComments;

  const pendingCount = comments.filter(c => c.status === 'PENDING').length;
  const approvedCount = comments.filter(c => c.status === 'APPROVED').length;
  const totalLikes = likesByProduct.reduce((sum, p) => sum + p.totalLikes, 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Estatísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="chatbubbles-outline" size={24} color={COLORS.secondary.main} />
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pendentes</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.states.success} />
          <Text style={styles.statValue}>{approvedCount}</Text>
          <Text style={styles.statLabel}>Aprovados</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="heart-outline" size={24} color={COLORS.states.error} />
          <Text style={styles.statValue}>{totalLikes}</Text>
          <Text style={styles.statLabel}>Total Likes</Text>
        </View>
      </View>

      {/* Tabs de Comentários */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comentários</Text>
        
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'pending' && styles.tabActive]}
            onPress={() => setSelectedTab('pending')}
          >
            <Text style={[styles.tabText, selectedTab === 'pending' && styles.tabTextActive]}>
              Pendentes ({pendingCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'approved' && styles.tabActive]}
            onPress={() => setSelectedTab('approved')}
          >
            <Text style={[styles.tabText, selectedTab === 'approved' && styles.tabTextActive]}>
              Aprovados ({approvedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {commentsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.secondary.main} />
            <Text style={styles.loadingText}>Carregando comentários...</Text>
          </View>
        ) : sortedComments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.text.secondary} />
            <Text style={styles.emptyText}>Nenhum comentário encontrado nesta categoria.</Text>
          </View>
        ) : (
          <View style={styles.commentsList}>
            {sortedComments.map((comment) => (
              <View key={comment._id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentUserInfo}>
                    <Avatar
                      user={{
                        username: comment.userId.username,
                        avatar: comment.userId.avatar,
                      }}
                      size={32}
                      disableNavigation
                    />
                    <View style={styles.commentUserDetails}>
                      <Text style={styles.commentUsername}>@{comment.userId.username}</Text>
                      <View style={styles.commentMeta}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(comment.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(comment.status) }]}>
                            {getStatusLabel(comment.status)}
                          </Text>
                        </View>
                        {comment.videoTimestamp && (
                          <View style={styles.timestampBadge}>
                            <Ionicons name="videocam-outline" size={12} color={COLORS.text.secondary} />
                            <Text style={styles.timestampText}>{formatTimestamp(comment.videoTimestamp)}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.commentActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setSelectedComment(comment);
                        setDetailOpen(true);
                      }}
                    >
                      <Ionicons name="eye-outline" size={20} color={COLORS.text.secondary} />
                    </TouchableOpacity>
                    {comment.status === 'PENDING' && (
                      <>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleApprove(comment._id)}
                          disabled={actionLoading}
                        >
                          <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.states.success} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleReject(comment._id)}
                          disabled={actionLoading}
                        >
                          <Ionicons name="close-circle-outline" size={20} color={COLORS.states.error} />
                        </TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(comment._id)}
                      disabled={actionLoading}
                    >
                      <Ionicons name="trash-outline" size={20} color={COLORS.states.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={styles.commentProduct}>
                  <Text style={styles.commentLabel}>Produto:</Text> {comment.productTitle}
                </Text>
                <Text style={styles.commentFile}>
                  <Text style={styles.commentLabel}>Arquivo:</Text> {comment.fileName}
                </Text>
                
                <Text style={styles.commentContent}>{comment.content}</Text>
                
                <Text style={styles.commentDate}>
                  {format(new Date(comment.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Seção de Likes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="heart-outline" size={24} color={COLORS.secondary.main} />
          <Text style={styles.sectionTitle}>Likes por Produto</Text>
        </View>

        {likesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.secondary.main} />
            <Text style={styles.loadingText}>Carregando likes...</Text>
          </View>
        ) : likesByProduct.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={48} color={COLORS.text.secondary} />
            <Text style={styles.emptyText}>Nenhum like encontrado nos seus produtos.</Text>
          </View>
        ) : (
          <View style={styles.likesList}>
            {likesByProduct.map((product) => (
              <View key={product.productId} style={styles.productLikeCard}>
                <View style={styles.productLikeHeader}>
                  <Text style={styles.productLikeTitle}>{product.productTitle}</Text>
                  <View style={styles.likesCountBadge}>
                    <Text style={styles.likesCountText}>{product.totalLikes} likes</Text>
                  </View>
                </View>
                
                {product.likesByFile && product.likesByFile.length > 0 && (
                  <View style={styles.likesByFileContainer}>
                    {product.likesByFile.map((file) => (
                      <View key={file.fileId} style={styles.fileLikeItem}>
                        <Text style={styles.fileLikeName}>
                          {file.fileName} - {file.likesCount} likes
                        </Text>
                        {file.likes && file.likes.length > 0 && (
                          <View style={styles.likesUsersContainer}>
                            {file.likes.slice(0, 10).map((like) => (
                              <View key={like._id} style={styles.likeUserChip}>
                                <Avatar
                                  user={{
                                    username: like.userId.username,
                                    avatar: like.userId.avatar,
                                  }}
                                  size={20}
                                  disableNavigation
                                />
                                <Text style={styles.likeUsername}>@{like.userId.username}</Text>
                              </View>
                            ))}
                            {file.likes.length > 10 && (
                              <View style={styles.moreLikesChip}>
                                <Text style={styles.moreLikesText}>+{file.likes.length - 10} mais</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Modal de Detalhes */}
      <Modal
        visible={detailOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalhes do Comentário</Text>
            <TouchableOpacity onPress={() => setDetailOpen(false)}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          {selectedComment && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalUserInfo}>
                <Avatar
                  user={{
                    username: selectedComment.userId.username,
                    avatar: selectedComment.userId.avatar,
                  }}
                  size={40}
                  disableNavigation
                />
                <View style={styles.modalUserDetails}>
                  <Text style={styles.modalUsername}>@{selectedComment.userId.username}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedComment.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedComment.status) }]}>
                      {getStatusLabel(selectedComment.status)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalDivider} />

              <Text style={styles.modalDetail}>
                <Text style={styles.modalDetailLabel}>Produto:</Text> {selectedComment.productTitle}
              </Text>
              <Text style={styles.modalDetail}>
                <Text style={styles.modalDetailLabel}>Arquivo:</Text> {selectedComment.fileName}
              </Text>
              {selectedComment.videoTimestamp && (
                <Text style={styles.modalDetail}>
                  <Text style={styles.modalDetailLabel}>Tempo no vídeo:</Text> {formatTimestamp(selectedComment.videoTimestamp)}
                </Text>
              )}
              <Text style={styles.modalDetail}>
                <Text style={styles.modalDetailLabel}>Data:</Text> {format(new Date(selectedComment.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </Text>

              <View style={styles.modalContentBox}>
                <Text style={styles.modalContentText}>{selectedComment.content}</Text>
              </View>
            </ScrollView>
          )}

          <View style={styles.modalActions}>
            {selectedComment?.status === 'PENDING' && (
              <>
                <TouchableOpacity
                  style={[styles.modalButton, styles.rejectButton]}
                  onPress={() => handleReject(selectedComment._id)}
                  disabled={actionLoading}
                >
                  <Text style={styles.rejectButtonText}>Rejeitar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.approveButton]}
                  onPress={() => handleApprove(selectedComment._id)}
                  disabled={actionLoading}
                >
                  <Text style={styles.approveButtonText}>Aprovar</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButton]}
              onPress={() => selectedComment && handleDelete(selectedComment._id)}
              disabled={actionLoading}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.states.error} />
              <Text style={styles.deleteButtonText}>Remover</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.closeButton]}
              onPress={() => setDetailOpen(false)}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.background.paper,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background.default,
    borderRadius: 8,
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  section: {
    backgroundColor: COLORS.background.paper,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background.tertiary,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.secondary.main,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  tabTextActive: {
    color: COLORS.secondary.main,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  commentsList: {
    gap: 12,
  },
  commentCard: {
    padding: 16,
    backgroundColor: COLORS.background.default,
    borderRadius: 8,
    gap: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  commentUserDetails: {
    flex: 1,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  commentMeta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timestampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 4,
  },
  timestampText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  commentProduct: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  commentFile: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  commentLabel: {
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  commentContent: {
    fontSize: 16,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  commentDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  likesList: {
    gap: 12,
  },
  productLikeCard: {
    padding: 16,
    backgroundColor: COLORS.background.default,
    borderRadius: 8,
  },
  productLikeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productLikeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    flex: 1,
  },
  likesCountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
  },
  likesCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  likesByFileContainer: {
    gap: 12,
    paddingLeft: 12,
  },
  fileLikeItem: {
    gap: 8,
  },
  fileLikeName: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  likesUsersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  likeUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
  },
  likeUsername: {
    fontSize: 12,
    color: COLORS.text.primary,
  },
  moreLikesChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
  },
  moreLikesText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background.tertiary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalUserDetails: {
    flex: 1,
  },
  modalUsername: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  modalDivider: {
    height: 1,
    backgroundColor: COLORS.background.tertiary,
    marginVertical: 16,
  },
  modalDetail: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  modalDetailLabel: {
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  modalContentBox: {
    padding: 16,
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    marginTop: 8,
  },
  modalContentText: {
    fontSize: 16,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.background.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.background.tertiary,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
  },
  rejectButton: {
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.states.error,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.states.error,
  },
  approveButton: {
    backgroundColor: COLORS.states.success,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.states.error,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.states.error,
  },
  closeButton: {
    backgroundColor: COLORS.background.tertiary,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
});

