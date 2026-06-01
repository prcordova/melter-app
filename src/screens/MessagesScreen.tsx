import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../components/Header';
import { ConversationCard } from '../components/ConversationCard';
import { MessagesRequestsList } from '../components/messages/MessagesRequestsList';
import { ChatSettingsModal } from '../components/messages/ChatSettingsModal';
import { messageApi, userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../theme/colors';
import { showToast } from '../components/CustomToast';
import { CustomModal, useCustomModal } from '../components/CustomModal';
import { getAvatarUrl, getUserInitials } from '../utils/image';
import { useSocketIO } from '../hooks/useSocketIO';
import { useUnreadMessages } from '../contexts/UnreadMessagesContext';
import type { InboxRequestItem } from '../types/messages-inbox';
import {
  type ChatSettings,
  type UserChatStatus,
  DEFAULT_CHAT_SETTINGS,
  DEFAULT_USER_CHAT_STATUS,
  loadChatSettings,
  saveChatSettings,
  loadUserChatStatus,
  saveUserChatStatus,
} from '../lib/chat-settings';

const CONVERSATIONS_PAGE_SIZE = 20;

function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    try {
      const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
      const finalA = Number.isNaN(timeA) ? 0 : timeA;
      const finalB = Number.isNaN(timeB) ? 0 : timeB;
      return finalB - finalA;
    } catch {
      return 0;
    }
  });
}

interface Conversation {
  _id: string;
  user: {
    _id: string;
    username: string;
    avatar?: string;
  };
  lastMessage?: {
    _id: string;
    content: string;
    senderId: string;
    timestamp: string;
    type?: 'text' | 'image' | 'document';
  };
  unreadCount: number;
  isArchived?: boolean;
  isOnline?: boolean;
}

type MessagesStackParamList = {
  MessagesList: undefined;
  Chat: {
    userId: string;
    username: string;
    avatar?: string;
  };
};

type MessagesScreenNavigationProp = NativeStackNavigationProp<
  MessagesStackParamList,
  'MessagesList'
>;

interface FriendUser {
  _id: string;
  username: string;
  avatar?: string;
}

interface SearchResultConversation extends Conversation {
  matchedMessage?: {
    content: string;
    timestamp: string;
  };
}

export function MessagesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<MessagesScreenNavigationProp>();
  const [inboxConversations, setInboxConversations] = useState<Conversation[]>([]);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [inboxHasMore, setInboxHasMore] = useState(false);
  const [archivedHasMore, setArchivedHasMore] = useState(false);
  const [inboxCursor, setInboxCursor] = useState<string | null>(null);
  const [archivedCursor, setArchivedCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'archived' | 'requests'>('inbox');
  const [requestItems, setRequestItems] = useState<InboxRequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsActionId, setRequestsActionId] = useState<string | null>(null);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(DEFAULT_CHAT_SETTINGS);
  const [userChatStatus, setUserChatStatus] = useState<UserChatStatus>(DEFAULT_USER_CHAT_STATUS);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const { modalProps, showConfirm, hideModal } = useCustomModal();
  const { refreshUnreadCount } = useUnreadMessages();

  const allConversations = useMemo(
    () => [...inboxConversations, ...archivedConversations],
    [inboxConversations, archivedConversations]
  );

  const listConversations =
    activeTab === 'inbox'
      ? inboxConversations
      : activeTab === 'archived'
        ? archivedConversations
        : [];

  // Estados para busca
  const [searchResultsConversations, setSearchResultsConversations] = useState<SearchResultConversation[]>([]);
  const [searchResultsFriends, setSearchResultsFriends] = useState<FriendUser[]>([]);
  const [searchingMessages, setSearchingMessages] = useState(false);
  const [searchingFriends, setSearchingFriends] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Socket.IO para receber mensagens em tempo real
  const { socket } = useSocketIO();

  useEffect(() => {
    loadChatSettings().then(setChatSettings);
    loadUserChatStatus().then(setUserChatStatus);
  }, []);

  const fetchRequestsInbox = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const response = await messageApi.getRequestsInbox();
      if (response?.success && response.data?.items) {
        setRequestItems(response.data.items);
      } else {
        setRequestItems([]);
      }
    } catch (error) {
      console.error('[MessagesScreen] Erro ao carregar solicitações:', error);
      setRequestItems([]);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const loadConversationsList = useCallback(
    async (archived: boolean, reset: boolean) => {
      const setList = archived ? setArchivedConversations : setInboxConversations;
      const setHasMore = archived ? setArchivedHasMore : setInboxHasMore;
      const setCursor = archived ? setArchivedCursor : setInboxCursor;
      const currentCursor = archived ? archivedCursor : inboxCursor;

      try {
        if (!reset) setLoadingMore(true);

        const response = await messageApi.getConversations({
          limit: CONVERSATIONS_PAGE_SIZE,
          cursor: reset ? undefined : currentCursor ?? undefined,
          archived,
        });

        if (response?.success) {
          const page = response as {
            data: Conversation[];
            hasMore?: boolean;
            nextCursor?: string | null;
          };
          const data = Array.isArray(page.data) ? page.data : [];
          const sorted = sortConversations(data);
          setList((prev) => (reset ? sorted : [...prev, ...sorted]));
          setHasMore(Boolean(page.hasMore));
          setCursor(page.nextCursor ?? null);
        }
      } catch (error) {
        console.error('[MessagesScreen] Erro ao carregar conversas:', error);
        if (reset) setList([]);
      } finally {
        if (!reset) setLoadingMore(false);
      }
    },
    [archivedCursor, inboxCursor]
  );

  const refreshInbox = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadConversationsList(false, true), fetchRequestsInbox()]);
    setLoading(false);
  }, [loadConversationsList, fetchRequestsInbox]);

  useFocusEffect(
    React.useCallback(() => {
      refreshInbox();
      refreshUnreadCount();
    }, [refreshInbox, refreshUnreadCount])
  );

  useEffect(() => {
    if (activeTab === 'archived') {
      loadConversationsList(true, true);
    } else if (activeTab === 'requests') {
      fetchRequestsInbox();
    }
  }, [activeTab]);

  // Listener para novas mensagens / lidas (Pusher)
  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleNewMessage = () => {
      refreshInbox().catch((error) => {
        console.error('[MessagesScreen] Erro ao recarregar conversas:', error);
      });
      refreshUnreadCount();
    };

    const handleMessagesRead = () => {
      refreshUnreadCount();
    };

    socket.on('new-message', handleNewMessage);
    socket.on('messages-read', handleMessagesRead);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('messages-read', handleMessagesRead);
    };
  }, [socket, user?.id, refreshUnreadCount, refreshInbox]);

  // Buscar quando o usuário digitar
  useEffect(() => {
    // Limpar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length > 0) {
      // Debounce de 300ms
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery.trim());
      }, 300);
    } else {
      setSearchResultsConversations([]);
      setSearchResultsFriends([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!query || query.length === 0) return;

    try {
      setSearchingMessages(true);
      setSearchingFriends(true);

      const queryLower = query.toLowerCase();
      
      // Buscar mensagens nas conversas
      try {
        const results: SearchResultConversation[] = [];
        
          // Buscar em cada conversa
        const searchPool =
          activeTab === 'archived' ? archivedConversations : inboxConversations;

        for (const conv of searchPool) {

          // Verificar se o texto está no username
          const matchesUsername = conv.user.username.toLowerCase().includes(queryLower);
          
          // Verificar se o texto está na última mensagem
          let matchedMessage: { content: string; timestamp: string } | undefined;
          if (conv.lastMessage?.content) {
            const messageContent = conv.lastMessage.content.toLowerCase();
            if (messageContent.includes(queryLower)) {
              matchedMessage = {
                content: conv.lastMessage.content,
                timestamp: conv.lastMessage.timestamp,
              };
            }
          }

          // Se corresponder, adicionar aos resultados
          if (matchesUsername || matchedMessage) {
            results.push({
              ...conv,
              matchedMessage,
            });
          }
        }

        // Se temos API de busca, usar ela também para encontrar mensagens mais antigas
        try {
          const messagesResponse = await messageApi.searchMessages(query);
          if (messagesResponse && messagesResponse.success) {
            const foundMessages = messagesResponse.data || [];
            
            // Mapear mensagens encontradas para conversas
            const conversationMap = new Map<string, SearchResultConversation>();
            
            // Adicionar conversas já encontradas (da busca local)
            results.forEach(conv => {
              const key = conv._id || conv.user._id;
              conversationMap.set(key, conv);
            });

            // Processar mensagens da API
            foundMessages.forEach((msg: any) => {
              const convId = msg.conversationId || msg.userId || msg.senderId || msg.recipientId;
              if (!convId || !msg.content) return;
              
              const existing = conversationMap.get(convId);
              
              if (existing) {
                // Atualizar mensagem correspondente se não tiver ainda ou se esta for mais recente
                if (!existing.matchedMessage && msg.content) {
                  existing.matchedMessage = {
                    content: msg.content,
                    timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
                  };
                }
              } else {
                // Buscar conversa correspondente
                const conv = searchPool.find(
                  (c) => c._id === convId || c.user._id === convId
                );

                if (conv) {
                  conversationMap.set(convId, {
                    ...conv,
                    matchedMessage: {
                      content: msg.content,
                      timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
                    },
                  });
                }
              }
            });

            setSearchResultsConversations(Array.from(conversationMap.values()));
          } else {
            setSearchResultsConversations(results);
          }
        } catch (apiError) {
          // Se a API falhar, usar resultados locais
          console.log('[MessagesScreen] Erro na API de busca, usando resultados locais:', apiError);
          setSearchResultsConversations(results);
        }
      } catch (error) {
        console.error('[MessagesScreen] Erro ao buscar mensagens:', error);
        setSearchResultsConversations([]);
      } finally {
        setSearchingMessages(false);
      }

      // Buscar usuários amigos
      try {
        const friendsResponse = await userApi.getMyFriends({ search: query });
        if (friendsResponse && friendsResponse.success) {
          const friends = friendsResponse.data || [];
          // Filtrar apenas amigos que não estão nas conversas existentes
          const existingUserIds = new Set(allConversations.map((conv) => conv.user._id));
          const newFriends = friends.filter((friend: FriendUser) => 
            !existingUserIds.has(friend._id) && 
            friend.username.toLowerCase().includes(query.toLowerCase())
          );
          setSearchResultsFriends(newFriends);
        }
      } catch (error) {
        console.error('[MessagesScreen] Erro ao buscar amigos:', error);
        setSearchResultsFriends([]);
      } finally {
        setSearchingFriends(false);
      }
    } catch (error) {
      console.error('[MessagesScreen] Erro na busca:', error);
      setSearchingMessages(false);
      setSearchingFriends(false);
    }
  };

  const patchConversationInLists = (
    conversationId: string,
    patch: Partial<Conversation>
  ) => {
    const mapList = (list: Conversation[]) =>
      list.map((c) =>
        c._id === conversationId || c.user._id === conversationId ? { ...c, ...patch } : c
      );
    setInboxConversations(mapList);
    setArchivedConversations(mapList);
  };

  const removeConversationFromLists = (conversationId: string) => {
    const filterList = (list: Conversation[]) =>
      list.filter((c) => c._id !== conversationId && c.user._id !== conversationId);
    setInboxConversations(filterList);
    setArchivedConversations(filterList);
  };

  const handleLoadMore = () => {
    if (loadingMore || loading || searchQuery.trim()) return;
    if (activeTab === 'inbox' && inboxHasMore) {
      loadConversationsList(false, false);
    } else if (activeTab === 'archived' && archivedHasMore) {
      loadConversationsList(true, false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'requests') {
      fetchRequestsInbox();
      return;
    }
    if (activeTab === 'archived') {
      loadConversationsList(true, true);
      return;
    }
    refreshInbox();
  };

  const handleAcceptRequest = async (item: InboxRequestItem) => {
    setRequestsActionId(item.friendshipId);
    try {
      const response = await userApi.acceptFriendRequest(item.friendshipId);
      if (response?.success) {
        showToast.success('Sucesso', 'Solicitação aceita');
        await Promise.all([fetchRequestsInbox(), loadConversationsList(false, true)]);
        navigation.navigate('Chat', {
          userId: item.requesterId,
          username: item.requesterUsername,
          avatar: item.requesterAvatar,
        });
      } else {
        showToast.error('Erro', 'Não foi possível aceitar a solicitação');
      }
    } catch (error) {
      console.error('[MessagesScreen] Erro ao aceitar solicitação:', error);
      showToast.error('Erro', 'Não foi possível aceitar a solicitação');
    } finally {
      setRequestsActionId(null);
    }
  };

  const handleRejectRequest = async (item: InboxRequestItem) => {
    setRequestsActionId(item.friendshipId);
    try {
      const response = await userApi.rejectFriendRequest(item.friendshipId);
      if (response?.success) {
        showToast.success('Sucesso', 'Solicitação recusada');
        await fetchRequestsInbox();
      } else {
        showToast.error('Erro', 'Não foi possível recusar a solicitação');
      }
    } catch (error) {
      console.error('[MessagesScreen] Erro ao recusar solicitação:', error);
      showToast.error('Erro', 'Não foi possível recusar a solicitação');
    } finally {
      setRequestsActionId(null);
    }
  };

  const handleSaveChatSettings = async (
    settings: ChatSettings,
    status: UserChatStatus
  ) => {
    setChatSettings(settings);
    setUserChatStatus(status);
    await Promise.all([saveChatSettings(settings), saveUserChatStatus(status)]);
    showToast.success('Sucesso', 'Configurações salvas');
  };

  const handleConversationPress = async (conversation: Conversation) => {
    if (conversation.unreadCount > 0) {
      try {
        await messageApi.markAsRead(conversation.user._id);
        patchConversationInLists(conversation.user._id, { unreadCount: 0 });
        await refreshUnreadCount();
      } catch (error) {
        console.warn('[MessagesScreen] Erro ao marcar como lida ao abrir:', error);
      }
    }

    navigation.navigate('Chat', {
      userId: conversation.user._id,
      username: conversation.user.username,
      avatar: conversation.user.avatar,
    });
    setSearchQuery('');
  };

  const handleUserPress = (username: string) => {
    (navigation as any).navigate('UserProfile', { username });
  };


  const handleStartConversation = (friend: FriendUser) => {
    navigation.navigate('Chat', {
      userId: friend._id,
      username: friend.username,
      avatar: friend.avatar,
    });
    setSearchQuery('');
  };

  const handleOpenOptions = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowOptionsModal(true);
  };

  const handleArchiveConversation = async () => {
    if (!selectedConversation || isArchiving) {
      console.warn('[MessagesScreen] Nenhuma conversa selecionada ou já arquivando');
      return;
    }
    
    // Fechar modal imediatamente para evitar congelamento
    setShowOptionsModal(false);
    const conversationToArchive = selectedConversation;
    setSelectedConversation(null);
    
    setIsArchiving(true);
    
    try {
      // O conversationId é o _id do outro usuário
      // No backend, o _id da conversa é o ID do outro usuário
      const conversationId = conversationToArchive._id || conversationToArchive.user._id;
      
      // Timeout de 10 segundos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: Requisição demorou muito')), 10000)
      );
      
      const archivePromise = messageApi.archiveConversation(conversationId);
      const response = await Promise.race([archivePromise, timeoutPromise]) as any;
      
      if (response && response.success) {
        // Usar o valor retornado pela API para garantir consistência
        const newArchivedState = response.data?.isArchived ?? !conversationToArchive.isArchived;
        
        const updated = { ...conversationToArchive, isArchived: newArchivedState };
        if (newArchivedState) {
          setInboxConversations((prev) =>
            prev.filter((c) => c._id !== conversationToArchive._id)
          );
          setArchivedConversations((prev) => {
            const without = prev.filter((c) => c._id !== conversationToArchive._id);
            return sortConversations([updated, ...without]);
          });
        } else {
          setArchivedConversations((prev) =>
            prev.filter((c) => c._id !== conversationToArchive._id)
          );
          setInboxConversations((prev) => {
            const without = prev.filter((c) => c._id !== conversationToArchive._id);
            return sortConversations([updated, ...without]);
          });
        }

        showToast.success('Sucesso', newArchivedState ? 'Conversa arquivada' : 'Conversa desarquivada');

        setTimeout(async () => {
          await Promise.all([
            loadConversationsList(false, true),
            loadConversationsList(true, true),
          ]);
        }, 1000);
      } else {
        console.error('[MessagesScreen] Resposta não foi bem-sucedida:', response);
        showToast.error('Erro', 'Não foi possível processar o pedido');
      }
    } catch (error: any) {
      console.error('[MessagesScreen] Erro ao arquivar conversa:', error);
      
      // Se foi timeout, fazer atualização otimista
      if (error.message && error.message.includes('Timeout')) {
        const newArchivedState = !conversationToArchive.isArchived;
        patchConversationInLists(conversationToArchive._id, { isArchived: newArchivedState });
        showToast.info('Aviso', 'Ação realizada localmente. Verifique sua conexão.');
      } else {
        showToast.error('Erro', error.message || 'Não foi possível processar o pedido');
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation) return;

    showConfirm(
      'Deletar Conversa',
      `Tem certeza que deseja deletar a conversa com @${selectedConversation.user.username}? Isso apagará a conversa apenas para você.`,
      async () => {
        try {
          const response = await messageApi.deleteConversation(selectedConversation._id);
          if (response.success) {
            removeConversationFromLists(selectedConversation._id);
            setShowOptionsModal(false);
            showToast.success('Sucesso', 'Conversa deletada localmente.');
          }
        } catch (error) {
          console.error('[MessagesScreen] Erro ao deletar conversa:', error);
          showToast.error('Erro', 'Não foi possível deletar a conversa.');
        }
      },
      {
        confirmText: 'Deletar',
        cancelText: 'Cancelar',
        destructive: true,
      }
    );
  };

  const handleMarkAsRead = async () => {
    if (!selectedConversation || !selectedConversation.user._id) return;

    // Fechar modal imediatamente
    setShowOptionsModal(false);
    const conversationToMark = selectedConversation;
    setSelectedConversation(null);

    try {
      const response = await messageApi.markAsRead(conversationToMark.user._id);
      
      if (response && response.success) {
        // Atualizar estado local - zerar contador de não lidas
        patchConversationInLists(conversationToMark.user._id, { unreadCount: 0 });

        showToast.success('Sucesso', 'Mensagens marcadas como lidas');
        await refreshUnreadCount();
        setTimeout(() => {
          refreshInbox();
        }, 500);
      } else {
        showToast.error('Erro', 'Não foi possível marcar como lida');
      }
    } catch (error: any) {
      console.error('[MessagesScreen] Erro ao marcar como lida:', error);
      showToast.error('Erro', error.message || 'Não foi possível marcar como lida');
    }
  };

  const handleBlockUser = async () => {
    if (!selectedConversation) return;

    showConfirm(
      'Bloquear Usuário',
      `Tem certeza que deseja bloquear @${selectedConversation.user.username}?`,
      async () => {
        try {
          const response = await userApi.blockUser(selectedConversation.user.username);
          if (response.success) {
            setShowOptionsModal(false);
            showToast.success('Sucesso', 'Usuário bloqueado.');
          }
        } catch (error) {
          showToast.error('Erro', 'Não foi possível bloquear o usuário.');
        }
      },
      {
        confirmText: 'Bloquear',
        cancelText: 'Cancelar',
        destructive: true,
      }
    );
  };

  const renderItem = ({ item, index }: { item: Conversation; index: number }) => {
    if (!item || !item.user) return null;
    
    return (
      <ConversationCard
        key={item._id || `conv-${index}`}
        conversation={item}
        onPress={() => handleConversationPress(item)}
        onLongPress={() => handleOpenOptions(item)}
        onDeletePress={() => {
          setSelectedConversation(item);
          handleDeleteConversation();
        }}
        onOptionsPress={() => handleOpenOptions(item)}
        onUserPress={handleUserPress}
        currentUserId={user?.id || ''}
      />
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.emptyText}>
          {searchQuery
            ? 'Nenhuma conversa encontrada'
            : activeTab === 'archived'
              ? 'Nenhuma conversa arquivada'
              : 'Nenhuma conversa ainda'}
        </Text>
        <Text style={styles.emptySubtext}>
          {searchQuery ? 'Tente buscar por outro nome' : 'Inicie uma nova conversa!'}
        </Text>
      </View>
    );
  };

  const renderListFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadMoreFooter}>
        <ActivityIndicator size="small" color={COLORS.secondary.main} />
      </View>
    );
  };

  const renderFriendItem = ({ item }: { item: FriendUser }) => {
    const avatarSource = getAvatarUrl(item.avatar);
    
    return (
      <TouchableOpacity
        style={styles.friendItem}
        onPress={() => handleStartConversation(item)}
        activeOpacity={0.7}
      >
        {avatarSource ? (
          <Image source={{ uri: avatarSource }} style={styles.friendAvatar} />
        ) : (
          <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]}>
            <Text style={styles.friendAvatarText}>
              {getUserInitials(item.username)}
            </Text>
          </View>
        )}
        <View style={styles.friendInfo}>
          <Text style={styles.friendUsername}>@{item.username}</Text>
          <Text style={styles.friendSubtext}>Iniciar conversa</Text>
        </View>
        <Ionicons name="chatbubble-outline" size={20} color={COLORS.text.tertiary} />
      </TouchableOpacity>
    );
  };

  // Função para destacar texto em negrito (destaca todas as ocorrências)
  const highlightText = (text: string, query: string) => {
    if (!query || !text) return <Text>{text}</Text>;
    
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    const parts: Array<{ text: string; isMatch: boolean }> = [];
    let lastIndex = 0;
    let index = textLower.indexOf(queryLower, lastIndex);
    
    while (index !== -1) {
      // Adicionar texto antes do match
      if (index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, index), isMatch: false });
      }
      // Adicionar o match
      parts.push({ text: text.substring(index, index + query.length), isMatch: true });
      lastIndex = index + query.length;
      index = textLower.indexOf(queryLower, lastIndex);
    }
    
    // Adicionar texto restante
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), isMatch: false });
    }
    
    // Se não encontrou nenhum match, retornar texto normal
    if (parts.length === 0) {
      return <Text>{text}</Text>;
    }
    
    return (
      <Text>
        {parts.map((part, i) => (
          <Text key={i} style={part.isMatch ? { fontWeight: 'bold' } : {}}>
            {part.text}
          </Text>
        ))}
      </Text>
    );
  };

  // Renderizar item de resultado de busca
  const renderSearchResultItem = ({ item }: { item: SearchResultConversation }) => {
    if (!item || !item.user) return null;
    
    const avatarSource = getAvatarUrl(item.user.avatar);
    const query = searchQuery.trim();
    
    return (
      <TouchableOpacity
        style={styles.searchResultItem}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        {avatarSource ? (
          <Image source={{ uri: avatarSource }} style={styles.searchResultAvatar} />
        ) : (
          <View style={[styles.searchResultAvatar, styles.searchResultAvatarPlaceholder]}>
            <Text style={styles.searchResultAvatarText}>
              {getUserInitials(item.user.username)}
            </Text>
          </View>
        )}
        <View style={styles.searchResultInfo}>
          <Text style={styles.searchResultUsername}>
            {highlightText(`@${item.user.username}`, query)}
          </Text>
          {item.matchedMessage && (
            <Text style={styles.searchResultMessage} numberOfLines={2}>
              {highlightText(item.matchedMessage.content, query)}
            </Text>
          )}
          {!item.matchedMessage && item.lastMessage?.content && (
            <Text style={styles.searchResultMessage} numberOfLines={2}>
              {item.lastMessage.content}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderConversationsSkeleton = () => (
    <View style={styles.skeletonList}>
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={`conversation-skeleton-${index}`} style={styles.skeletonItem}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonLinePrimary} />
            <View style={styles.skeletonLineSecondary} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <ImageBackground
      source={require('../../public/assets/imgs/bgMelter.jpg')}
      style={styles.backgroundImage}
      imageStyle={styles.backgroundImageStyle}
      resizeMode="repeat"
    >
      <View style={styles.container}>
        <Header 
          onLogoPress={() => {
            try {
              const parent = navigation.getParent();
              if (parent) {
                parent.navigate('FeedTab' as never);
              } else {
                navigation.navigate('FeedTab' as never);
              }
            } catch (e) {
              console.error('Erro ao navegar para Feed:', e);
            }
          }}
        />

      {/* Sub-Header com Busca */}
      <View style={styles.subHeader}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={COLORS.text.tertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversas..."
            placeholderTextColor={COLORS.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearching(true)}
            onBlur={() => setIsSearching(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons
                name="close-circle"
                size={20}
                color={COLORS.text.tertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Configurações + abas — apenas sem busca */}
      {!searchQuery.trim() && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowChatSettings(true)}
            accessibilityLabel="Configurações do chat"
          >
            <Ionicons name="settings-outline" size={22} color={COLORS.text.secondary} />
          </TouchableOpacity>
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'inbox' && styles.activeTab]}
              onPress={() => setActiveTab('inbox')}
            >
              <Text style={[styles.tabText, activeTab === 'inbox' && styles.activeTabText]}>
                Entrada
                {inboxConversations.length > 0 ? ` (${inboxConversations.length})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'archived' && styles.activeTab]}
              onPress={() => setActiveTab('archived')}
            >
              <Text style={[styles.tabText, activeTab === 'archived' && styles.activeTabText]}>
                Arquivadas
                {archivedConversations.length > 0 ? ` (${archivedConversations.length})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
              onPress={() => setActiveTab('requests')}
            >
              <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
                Solicitações
                {requestItems.length > 0 ? ` (${requestItems.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quando está pesquisando, dividir em duas metades */}
      {searchQuery.trim() ? (
        <View style={styles.searchContainerWrapper}>
          {/* Metade Superior: Conversas com mensagens que contêm o texto */}
          <View style={styles.searchSection}>
            <View style={styles.searchSectionHeader}>
              <Text style={styles.searchSectionTitle}>Conversas</Text>
              {searchingMessages && <Text style={styles.searchingLabel}>Buscando...</Text>}
            </View>
            {searchingMessages ? (
              <View style={styles.searchLoading}>
                <View style={styles.searchSkeletonItem}>
                  <View style={styles.searchSkeletonAvatar} />
                  <View style={styles.searchSkeletonContent}>
                    <View style={styles.searchSkeletonLinePrimary} />
                    <View style={styles.searchSkeletonLineSecondary} />
                  </View>
                </View>
                <View style={styles.searchSkeletonItem}>
                  <View style={styles.searchSkeletonAvatar} />
                  <View style={styles.searchSkeletonContent}>
                    <View style={styles.searchSkeletonLinePrimary} />
                    <View style={styles.searchSkeletonLineSecondary} />
                  </View>
                </View>
              </View>
            ) : searchResultsConversations.length > 0 ? (
              <FlatList
                data={searchResultsConversations}
                renderItem={renderSearchResultItem}
                keyExtractor={(item, index) => (item && item._id) ? item._id : `search-conv-${index}`}
                contentContainerStyle={styles.searchListContent}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.searchEmpty}>
                <Text style={styles.searchEmptyText}>Nenhuma conversa encontrada</Text>
              </View>
            )}
          </View>

          {/* Divisor */}
          <View style={styles.searchDivider} />

          {/* Metade Inferior: Usuários amigos para iniciar conversa */}
          <View style={styles.searchSection}>
            <View style={styles.searchSectionHeader}>
              <Text style={styles.searchSectionTitle}>Novos Contatos</Text>
              {searchingFriends && <Text style={styles.searchingLabel}>Buscando...</Text>}
            </View>
            {searchingFriends ? (
              <View style={styles.searchLoading}>
                <View style={styles.searchSkeletonItem}>
                  <View style={styles.searchSkeletonAvatar} />
                  <View style={styles.searchSkeletonContent}>
                    <View style={styles.searchSkeletonLinePrimary} />
                    <View style={styles.searchSkeletonLineSecondary} />
                  </View>
                </View>
                <View style={styles.searchSkeletonItem}>
                  <View style={styles.searchSkeletonAvatar} />
                  <View style={styles.searchSkeletonContent}>
                    <View style={styles.searchSkeletonLinePrimary} />
                    <View style={styles.searchSkeletonLineSecondary} />
                  </View>
                </View>
              </View>
            ) : searchResultsFriends.length > 0 ? (
              <FlatList
                data={searchResultsFriends}
                renderItem={renderFriendItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.searchListContent}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.searchEmpty}>
                <Text style={styles.searchEmptyText}>Nenhum contato encontrado</Text>
              </View>
            )}
          </View>
        </View>
      ) : activeTab === 'requests' ? (
        <MessagesRequestsList
          items={requestItems}
          loading={requestsLoading}
          actionLoadingId={requestsActionId}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
        />
      ) : loading && listConversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          {renderConversationsSkeleton()}
          <Text style={styles.loadingText}>Carregando conversas...</Text>
        </View>
      ) : (
        <FlatList
          data={listConversations}
          renderItem={renderItem}
          keyExtractor={(item, index) => (item && item._id) ? item._id : `conv-${index}`}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderListFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading && !loadingMore}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
        />
      )}

      {/* Modal de Opções */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowOptionsModal(false)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Opções da Conversa</Text>
              <Text style={styles.modalSubtitle}>@{selectedConversation?.user.username}</Text>
            </View>

            {/* Marcar como lida - apenas se houver mensagens não lidas */}
            {selectedConversation && selectedConversation.unreadCount > 0 && (
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={handleMarkAsRead}
              >
                <Ionicons name="checkmark-done-outline" size={22} color={COLORS.secondary.main} />
                <Text style={[styles.modalOptionText, { color: COLORS.secondary.main }]}>
                  Marcar como lida
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.modalOption, isArchiving && styles.modalOptionDisabled]}
              onPress={handleArchiveConversation}
              disabled={isArchiving}
            >
              {isArchiving ? (
                <ActivityIndicator size="small" color={COLORS.text.primary} />
              ) : (
                <Ionicons 
                  name={selectedConversation?.isArchived ? "archive" : "archive-outline"} 
                  size={22} 
                  color={COLORS.text.primary} 
                />
              )}
              <Text style={styles.modalOptionText}>
                {isArchiving 
                  ? 'Processando...' 
                  : selectedConversation?.isArchived 
                    ? 'Desarquivar conversa' 
                    : 'Arquivar conversa'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption}
              onPress={handleDeleteConversation}
            >
              <Ionicons name="trash-outline" size={22} color={COLORS.states.error} />
              <Text style={[styles.modalOptionText, { color: COLORS.states.error }]}>Excluir conversa</Text>
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity 
              style={styles.modalOption}
              onPress={handleBlockUser}
            >
              <Ionicons name="ban-outline" size={22} color={COLORS.states.error} />
              <Text style={[styles.modalOptionText, { color: COLORS.states.error }]}>Bloquear usuário</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancel}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <CustomModal {...modalProps} onClose={hideModal} />

      <ChatSettingsModal
        visible={showChatSettings}
        settings={chatSettings}
        userStatus={userChatStatus}
        onClose={() => setShowChatSettings(false)}
        onSave={handleSaveChatSettings}
      />
    </View>
  </ImageBackground>
);
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.08,
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background.paper,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    gap: 8,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.background.tertiary,
  },
  loadMoreFooter: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.secondary.main,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: '#fff',
  },
  listContent: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    paddingTop: 8,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  skeletonList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background.tertiary,
  },
  skeletonContent: {
    flex: 1,
    gap: 8,
  },
  skeletonLinePrimary: {
    width: '52%',
    height: 12,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
  },
  skeletonLineSecondary: {
    width: '78%',
    height: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    gap: 12,
  },
  modalOptionDisabled: {
    opacity: 0.5,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  modalDivider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: 8,
  },
  modalCancel: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 16,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary.main,
  },
  searchContainerWrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  searchSection: {
    flex: 1,
    backgroundColor: COLORS.background.paper,
  },
  searchSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  searchSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  searchingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary.main,
  },
  searchDivider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: 8,
  },
  searchListContent: {
    paddingVertical: 8,
  },
  searchLoading: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  searchSkeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.background.paper,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  searchSkeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.tertiary,
  },
  searchSkeletonContent: {
    flex: 1,
    gap: 7,
  },
  searchSkeletonLinePrimary: {
    width: '45%',
    height: 10,
    borderRadius: 6,
    backgroundColor: COLORS.background.tertiary,
  },
  searchSkeletonLineSecondary: {
    width: '70%',
    height: 8,
    borderRadius: 6,
    backgroundColor: COLORS.background.tertiary,
  },
  searchEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  searchEmptyText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background.tertiary,
    marginRight: 12,
  },
  friendAvatarPlaceholder: {
    backgroundColor: COLORS.secondary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  friendInfo: {
    flex: 1,
  },
  friendUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  friendSubtext: {
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  searchResultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background.tertiary,
    marginRight: 12,
  },
  searchResultAvatarPlaceholder: {
    backgroundColor: COLORS.secondary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  searchResultMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
});


