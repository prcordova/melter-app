import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageBackground,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistanceToNow, format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { messageApi, userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, getUserInitials, getImageUrl } from '../utils/image';
import { COLORS } from '../theme/colors';
import { showToast } from '../components/CustomToast';
import { StoryReplyPreview } from '../components/stories/StoryReplyPreview';

interface Message {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'image' | 'document';
  imageUrl?: string;
  documentUrl?: string;
  documentName?: string;
  storyReply?: {
    storyId: string;
    mediaUrl: string;
    mediaType: 'image' | 'video' | 'gif';
  } | null;
}

type ChatRouteParams = {
  userId: string;
  username: string;
  avatar?: string;
};

type ChatRouteProp = RouteProp<{ Chat: ChatRouteParams }, 'Chat'>;

export function ChatScreen() {
  const { user } = useAuth();
  const route = useRoute<ChatRouteProp>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  // Verificar se os parâmetros da rota existem para evitar crash
  if (!route.params) {
    console.error('[ChatScreen] Parâmetros da rota ausentes');
    navigation.goBack();
    return null;
  }

  const { userId, username, avatar } = route.params;

  const handleUserPress = () => {
    (navigation as any).navigate('UserProfile', { username });
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [previousDayDate, setPreviousDayDate] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState(true); // Assumimos que é amigo até carregar
  const [checkingFriendship, setCheckingFriendship] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    fetchMessages();
    checkFriendship();
  }, []);

  const checkFriendship = async () => {
    try {
      setCheckingFriendship(true);
      const response = await userApi.getUserProfile(username);
      if (response.success) {
        setUserData(response.data);
        // No backend do Melter, mensagens só para status FRIENDS
        // O backend agora retorna 'FRIENDS' para amizade aceita
        const isFriendly = response.data.friendshipStatus === 'FRIENDS';
        setIsFriend(isFriendly);
      }
    } catch (error) {
      console.error('[ChatScreen] Erro ao verificar amizade:', error);
      // Fallback: tentar ver se é amigo pela lista de mensagens se a rota de perfil falhar
      setIsFriend(false);
    } finally {
      setCheckingFriendship(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!userData?.friendshipId && !userData?._id) return;
    
    Alert.alert(
      'Remover Amigo',
      `Tem certeza que deseja remover @${username} dos seus amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              setShowMenu(false);
              const id = userData.friendshipId || userData._id;
              await userApi.removeFriend(id);
              setIsFriend(false);
              showToast.success('Sucesso', 'Amizade removida com sucesso');
            } catch (error) {
              showToast.error('Erro', 'Não foi possível remover a amizade');
            }
          },
        },
      ]
    );
  };

  const handleBlockUser = async () => {
    Alert.alert(
      'Bloquear Usuário',
      `Tem certeza que deseja bloquear @${username}? Vocês não poderão mais interagir.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            try {
              setShowMenu(false);
              await userApi.blockUser(username);
              showToast.success('Sucesso', 'Usuário bloqueado');
              navigation.goBack(); // Voltar para a lista de conversas
            } catch (error) {
              showToast.error('Erro', 'Não foi possível bloquear o usuário');
            }
          },
        },
      ]
    );
  };

  const fetchMessages = async (date?: string) => {
    if (!user?.id || !userId) return;

    try {
      if (date) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await messageApi.getMessages(user.id, userId, date);

      if (response && response.success) {
        const newMessages = response.data || [];
        // hasMore e previousDayDate vêm no nível superior da resposta
        const hasMore = (response as any).hasMore ?? false;
        const previousDayDate = (response as any).previousDayDate ?? null;
        
        console.log('[ChatScreen] Carregando mensagens:', {
          date,
          newMessagesCount: newMessages.length,
          hasMore,
          previousDayDate
        });
        
        if (date) {
          // Se carregando mensagens antigas, adicionar ao início
          setMessages((prev) => {
            const combined = [...newMessages, ...prev];
            console.log('[ChatScreen] Mensagens antigas adicionadas. Total:', combined.length);
            return combined;
          });
        } else {
          setMessages(newMessages);
          // Marcar como lido apenas no primeiro carregamento
          try {
            await messageApi.markAsRead(userId);
          } catch (e) {
            console.warn('[ChatScreen] Erro ao marcar como lido:', e);
          }
        }

        setHasMore(hasMore);
        setPreviousDayDate(previousDayDate);

        // Se hoje não tem mensagens e tem mais dias, buscar o dia anterior automaticamente
        if (!date && newMessages.length === 0 && hasMore && previousDayDate) {
          fetchMessages(previousDayDate);
        }
      }
    } catch (error) {
      console.error('[ChatScreen] Erro ao carregar mensagens:', error);
      const status = (error as any).response?.status;
      if (status !== 404) {
        showToast.error('Erro', 'Não foi possível carregar as mensagens');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = () => {
    if (hasMore && previousDayDate && !loadingMore) {
      fetchMessages(previousDayDate);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      setSending(true);

      // Mensagem otimista
      const optimisticMessage: Message = {
        _id: `temp-${Date.now()}`,
        senderId: user?.id || '',
        recipientId: userId,
        content: messageContent,
        timestamp: new Date().toISOString(),
        status: 'sent',
        type: 'text',
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      // Scroll para o final
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Enviar para API
      const response = await messageApi.sendMessage({
        recipientId: userId,
        content: messageContent,
        type: 'text',
      });

      if (response.success) {
        // Substituir mensagem otimista pela real
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === optimisticMessage._id ? response.data : msg
          )
        );
      }
    } catch (error) {
      console.error('[ChatScreen] Erro ao enviar mensagem:', error);
      showToast.error('Erro', 'Não foi possível enviar a mensagem');
      // Reverter mensagem otimista
      setMessages((prev) => prev.filter((msg) => !msg._id.startsWith('temp-')));
    } finally {
      setSending(false);
    }
  };

  const getTimeAgo = (timestamp: string) => {
    if (!timestamp) return '';
    try {
      const messageDate = new Date(timestamp);
      if (isNaN(messageDate.getTime())) return '';
      
      const now = new Date();

      if (isSameDay(messageDate, now)) {
        return format(messageDate, 'HH:mm');
      }
      return formatDistanceToNow(messageDate, {
        addSuffix: true,
        locale: ptBR,
      });
    } catch (error) {
      console.error('[ChatScreen] Erro ao formatar data:', error);
      return '';
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    try {
      const isSentByMe = item.senderId === user?.id;
      const prevMessage = index > 0 ? messages[index - 1] : null;
      
      // Validar data atual
      const currentDate = new Date(item.timestamp);
      const isCurrentDateValid = !isNaN(currentDate.getTime());

      let showDateSeparator = false;
      if (isCurrentDateValid) {
        if (!prevMessage) {
          showDateSeparator = true;
        } else {
          const prevDate = new Date(prevMessage.timestamp);
          if (!isNaN(prevDate.getTime())) {
            showDateSeparator = !isSameDay(currentDate, prevDate);
          } else {
            showDateSeparator = true;
          }
        }
      }

      return (
        <View key={item._id || index}>
          {showDateSeparator && isCurrentDateValid && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateText}>
                {format(currentDate, "dd 'de' MMMM", {
                  locale: ptBR,
                })}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.messageContainer,
              isSentByMe ? styles.myMessageContainer : styles.otherMessageContainer,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                isSentByMe ? styles.myMessageBubble : styles.otherMessageBubble,
              ]}
            >
              {/* Story Reply Preview */}
              {item.storyReply && (
                <StoryReplyPreview
                  storyId={item.storyReply.storyId}
                  mediaUrl={item.storyReply.mediaUrl}
                  mediaType={item.storyReply.mediaType}
                  compact={true}
                  isSentByMe={isSentByMe}
                  onPress={() => {
                    // TODO: Navegar para o story quando clicado
                    showToast.info('Story', 'Abrindo story...');
                  }}
                />
              )}

              {/* Imagem (se houver) */}
              {item.type === 'image' && item.imageUrl && (
                <Image
                  source={{ uri: getImageUrl(item.imageUrl) }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              )}

              {/* Conteúdo da mensagem */}
              {item.content && (
                <Text
                  style={[
                    styles.messageText,
                    isSentByMe ? styles.myMessageText : styles.otherMessageText,
                  ]}
                >
                  {item.content}
                </Text>
              )}

              <View style={styles.messageFooter}>
                <Text
                  style={[
                    styles.messageTime,
                    isSentByMe ? styles.myMessageTime : styles.otherMessageTime,
                  ]}
                >
                  {getTimeAgo(item.timestamp)}
                </Text>
                {isSentByMe && (
                  <Ionicons
                    name={
                      item.status === 'read'
                        ? 'checkmark-done'
                        : item.status === 'delivered'
                        ? 'checkmark-done-outline'
                        : 'checkmark'
                    }
                    size={14}
                    color={item.status === 'read' ? '#10b981' : '#ffffff'}
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>
            </View>
          </View>
        </View>
      );
    } catch (e) {
      console.error('[ChatScreen] Erro ao renderizar mensagem:', e);
      return null;
    }
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.emptyText}>Nenhuma mensagem ainda</Text>
        <Text style={styles.emptySubtext}>
          Envie a primeira mensagem para {username}
        </Text>
      </View>
    );
  };

  const avatarSource = getAvatarUrl(avatar);

  return (
    <ImageBackground
      source={require('../../public/assets/imgs/bgMelter.jpg')} // Background do Melter
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
      resizeMode="repeat"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerInfo} onPress={handleUserPress} activeOpacity={0.7}>
            {avatarSource ? (
              <Image source={{ uri: avatarSource }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {getUserInitials(username)}
                </Text>
              </View>
            )}
            <Text style={styles.headerUsername}>{username}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moreButton} onPress={() => setShowMenu(true)}>
            <Ionicons name="ellipsis-vertical" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Menu Dropdown Modal */}
        <Modal
          visible={showMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <Pressable 
            style={styles.modalOverlay} 
            onPress={() => setShowMenu(false)}
          >
            <View style={[styles.menuContainer, { top: insets.top + 50 }]}>
              {isFriend && (
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={handleRemoveFriend}
                >
                  <Ionicons name="person-remove-outline" size={20} color={COLORS.states.error} />
                  <Text style={[styles.menuItemText, { color: COLORS.states.error }]}>
                    Remover Amigo
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleBlockUser}
              >
                <Ionicons name="ban-outline" size={20} color={COLORS.text.primary} />
                <Text style={styles.menuItemText}>Bloquear Usuário</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.menuItem, styles.menuItemLast]} 
                onPress={() => {
                  setShowMenu(false);
                  handleUserPress();
                }}
              >
                <Ionicons name="person-outline" size={20} color={COLORS.text.primary} />
                <Text style={styles.menuItemText}>Ver Perfil</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Messages List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={COLORS.secondary.main}
              animating={true}
            />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={renderEmpty}
            ListHeaderComponent={() => (
              hasMore ? (
                <TouchableOpacity 
                  style={styles.loadMoreButton} 
                  onPress={loadMoreMessages}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color={COLORS.secondary.main} />
                  ) : (
                    <Text style={styles.loadMoreText}>Ver mensagens anteriores</Text>
                  )}
                </TouchableOpacity>
              ) : null
            )}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={(_, contentHeight) => {
              // Só scrollar para o final se NÃO estiver carregando mais (paginação)
              if (!loadingMore) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
          {!checkingFriendship && !isFriend ? (
            <View style={styles.notFriendsContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.tertiary} />
              <Text style={styles.notFriendsText}>
                Você só pode enviar mensagens para amigos.
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.attachButton}>
                <Ionicons name="add-circle-outline" size={28} color={COLORS.secondary.main} />
              </TouchableOpacity>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Mensagem..."
                  placeholderTextColor={COLORS.text.tertiary}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                  maxLength={1000}
                  editable={!sending}
                />
                <TouchableOpacity style={styles.emojiButton}>
                  <Ionicons name="happy-outline" size={24} color={COLORS.text.secondary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!newMessage.trim() || sending) && styles.sendButtonDisabled,
                ]}
                onPress={handleSendMessage}
                disabled={!newMessage.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#ffffff" animating={true} />
                ) : (
                  <Ionicons name="send" size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.08, // Aumentado para visibilidade
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.94)', // Overlay levemente mais transparente
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: COLORS.background.tertiary,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.secondary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  moreButton: {
    padding: 4,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    backgroundColor: COLORS.background.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  myMessageBubble: {
    backgroundColor: COLORS.secondary.main,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.background.paper,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: COLORS.text.primary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherMessageTime: {
    color: COLORS.text.tertiary,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  loadMoreText: {
    fontSize: 13,
    color: COLORS.secondary.main,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.background.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  attachButton: {
    marginBottom: 8,
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
    maxHeight: 100,
  },
  emojiButton: {
    marginLeft: 8,
    paddingBottom: 2,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  notFriendsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.tertiary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  notFriendsText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  menuContainer: {
    position: 'absolute',
    right: 16,
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 15,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
});

