import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Header } from '../components/Header';
import { ConversationCard } from '../components/ConversationCard';
import { messageApi, userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../theme/colors';
import { showToast } from '../components/CustomToast';
import { CustomModal, useCustomModal } from '../components/CustomModal';

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

export function MessagesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<MessagesScreenNavigationProp>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'archived'>('inbox');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const { modalProps, showConfirm, hideModal } = useCustomModal();

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    // Filtrar conversas quando a busca ou aba muda
    let result = conversations;

    // Filtro por aba
    if (activeTab === 'inbox') {
      result = result.filter(conv => !conv.isArchived);
    } else {
      result = result.filter(conv => conv.isArchived);
    }

    // Filtro por busca
    if (searchQuery.trim()) {
      result = result.filter((conv) =>
        conv.user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredConversations(result);
  }, [searchQuery, conversations, activeTab]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await messageApi.getConversations();
      
      if (response && response.success) {
        // Garantir que temos um array
        const data = Array.isArray(response.data) ? response.data : [];
        
        // Ordenar por última mensagem (mais recente primeiro)
        const sorted = [...data].sort((a: Conversation, b: Conversation) => {
          try {
            const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
            const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
            
            // Lidar com datas inválidas (NaN)
            const finalA = isNaN(timeA) ? 0 : timeA;
            const finalB = isNaN(timeB) ? 0 : timeB;
            
            return finalB - finalA;
          } catch (e) {
            return 0;
          }
        });
        setConversations(sorted);
      }
    } catch (error) {
      console.error('[MessagesScreen] Erro ao carregar conversas:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationPress = (conversation: Conversation) => {
    navigation.navigate('Chat', {
      userId: conversation.user._id,
      username: conversation.user.username,
      avatar: conversation.user.avatar,
    });
  };

  const handleUserPress = (username: string) => {
    (navigation as any).navigate('UserProfile', { username });
  };

  const handleNewMessage = () => {
    showToast.info('Nova Conversa', 'Seleção de contatos será implementada');
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
        
        // Atualizar estado local imediatamente com o valor retornado pela API
        // O _id da conversa é o ID do outro usuário (mesmo que user._id)
        setConversations(prev => prev.map(c => {
          // Usar _id que é o ID do outro usuário
          if (c._id === conversationToArchive._id) {
            return { ...c, isArchived: newArchivedState };
          }
          return c;
        }));
        
        // Mostrar toast de sucesso
        showToast.success('Sucesso', newArchivedState ? 'Conversa arquivada' : 'Conversa desarquivada');
        
        // Recarregar conversas após um delay para garantir que o backend processou
        // Isso garante que o estado está sincronizado com o servidor
        setTimeout(async () => {
          await fetchConversations();
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
        setConversations(prev => prev.map(c => 
          c._id === conversationToArchive._id 
            ? { ...c, isArchived: newArchivedState } 
            : c
        ));
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
            setConversations((prev) => prev.filter((c) => c._id !== selectedConversation._id));
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
          {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
        </Text>
        <Text style={styles.emptySubtext}>
          {searchQuery
            ? 'Tente buscar por outro nome'
            : 'Inicie uma nova conversa!'}
        </Text>
      </View>
    );
  };

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

        <TouchableOpacity
          style={styles.newMessageButton}
          onPress={handleNewMessage}
        >
          <Ionicons name="create-outline" size={24} color={COLORS.secondary.main} />
        </TouchableOpacity>
      </View>

      {/* Tabs Inbox / Archived */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'inbox' && styles.activeTab]}
          onPress={() => setActiveTab('inbox')}
        >
          <Text style={[styles.tabText, activeTab === 'inbox' && styles.activeTabText]}>
            Entrada {conversations.filter(c => !c.isArchived).length > 0 && `(${conversations.filter(c => !c.isArchived).length})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'archived' && styles.activeTab]}
          onPress={() => setActiveTab('archived')}
        >
          <Text style={[styles.tabText, activeTab === 'archived' && styles.activeTabText]}>
            Arquivadas {conversations.filter(c => c.isArchived).length > 0 && `(${conversations.filter(c => c.isArchived).length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Conversas */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={COLORS.secondary.main}
            animating={true}
          />
          <Text style={styles.loadingText}>Carregando conversas...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderItem}
          keyExtractor={(item, index) => (item && item._id) ? item._id : `conv-${index}`}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchConversations}
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

      {/* Custom Modal para confirmações */}
      <CustomModal
        {...modalProps}
        onClose={hideModal}
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
    gap: 12,
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
  newMessageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.paper,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: COLORS.background.tertiary,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.secondary,
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
});


