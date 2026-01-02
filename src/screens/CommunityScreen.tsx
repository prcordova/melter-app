import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Header } from '../components/Header';
import { UserCard } from '../components/UserCard';
import { userApi } from '../services/api';
import { COLORS } from '../theme/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { UsersSearchScreen } from './UsersSearchScreen';

type TabType = 'explore' | 'friends' | 'received' | 'sent';

export function CommunityScreen() {
  const { user: currentUser } = useAuth();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabType>('explore');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const [friendsRes, receivedRes, sentRes] = await Promise.all([
        userApi.getMyFriends({ search: searchQuery }),
        userApi.getFriendRequestsReceived(),
        userApi.getFriendRequestsSent(),
      ]);

      if (friendsRes.success) setFriends(friendsRes.data);
      if (receivedRes.success) setReceivedRequests(receivedRes.data);
      if (sentRes.success) setSentRequests(sentRes.data);
    } catch (error) {
      console.error('[CommunityScreen] Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'explore') {
      loadData();
    }
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'friends') {
        loadData(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [activeTab, searchQuery]);

  const getListData = () => {
    switch (activeTab) {
      case 'friends': return friends;
      case 'received': return receivedRequests;
      case 'sent': return sentRequests;
      default: return [];
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    // Ajustar o objeto para o UserCard
    // O backend retorna formatos diferentes dependendo da rota:
    // Aba Amigos: { _id, username, ..., friendshipId, isFollowing }
    // Abas Pedidos: { id: requestId, user: { _id, username, ... }, createdAt }
    
    const isFriendsTab = activeTab === 'friends';
    const baseUser = isFriendsTab ? item : item.user;
    
    const userData = {
      ...baseUser,
      friendshipStatus: isFriendsTab ? 'FRIENDS' : (activeTab === 'received' ? 'PENDING_RECEIVED' : 'PENDING_SENT'),
      friendshipId: isFriendsTab ? item.friendshipId : item.id,
      friendRequestId: isFriendsTab ? null : item.id,
      friendsSince: item.friendsSince || item.createdAt || item.updatedAt,
      // Preservar isFollowing se vier da API (aba amigos)
      isFollowing: isFriendsTab ? (item.isFollowing ?? false) : (baseUser?.isFollowing ?? false),
    };

    return (
      <UserCard 
        user={userData} 
        showFriendsSince={isFriendsTab}
      />
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    let message = 'Nenhum amigo encontrado';
    let icon = 'people-outline';

    if (activeTab === 'received') {
      message = 'Nenhuma solicitação recebida';
      icon = 'download-outline';
    } else if (activeTab === 'sent') {
      message = 'Nenhuma solicitação enviada';
      icon = 'send-outline';
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={icon as any} size={64} color={COLORS.text.tertiary} />
        <Text style={styles.emptyText}>{message}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header 
        onLogoPress={() => {
          navigation.navigate('FeedTab');
        }}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>Comunidade</Text>

        {/* Tabs de Navegação */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'explore' && styles.activeTab]}
            onPress={() => setActiveTab('explore')}
          >
            <Text style={[styles.tabText, activeTab === 'explore' && styles.activeTabText]}>
              Explorar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
              Amigos ({friends.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'received' && styles.activeTab]}
            onPress={() => setActiveTab('received')}
          >
            <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
              Pedidos ({receivedRequests.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
            onPress={() => setActiveTab('sent')}
          >
            <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
              Enviados ({sentRequests.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conteúdo da aba Explorar */}
        {activeTab === 'explore' && (
          <View style={styles.exploreContainer}>
            <UsersSearchScreen hideHeader hideTitle />
          </View>
        )}

        {/* Conteúdo das outras abas */}
        {activeTab !== 'explore' && (
          <>
            {/* Barra de Busca (apenas na aba amigos) */}
            {activeTab === 'friends' && (
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.text.tertiary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Procurar amigo pelo nome..."
                  placeholderTextColor={COLORS.text.tertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            )}

            {loading && !refreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.secondary.main} />
              </View>
            ) : (
              <FlatList
                data={getListData()}
                renderItem={renderItem}
                keyExtractor={(item) => item.id || item._id}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary.main} />
                }
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.secondary.main,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: '#ffffff',
  },
  exploreContainer: {
    flex: 1,
    marginTop: -16, // Compensar o padding do content
    marginHorizontal: -16, // Compensar o padding do content
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
});

