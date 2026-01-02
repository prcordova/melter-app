import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Header } from '../components/Header';
import { UserCard } from '../components/UserCard';
import { userApi } from '../services/api';
import { COLORS } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface User {
  _id: string;
  username: string;
  avatar?: string;
  bio?: string;
  plan?: {
    type: 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS';
  };
  verifiedBadge?: {
    isVerified: boolean;
  };
  friendshipStatus?: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS';
  friendshipId?: string;
  friendRequestId?: string;
  followersCount?: number;
  friendsCount?: number;
  isFollowing?: boolean;
  followers?: string[];
}

type FilterType = 'popular' | 'recent' | 'most-viewed' | 'most-liked';

interface UsersSearchScreenProps {
  hideHeader?: boolean;
  hideTitle?: boolean;
}

export function UsersSearchScreen({ hideHeader = false, hideTitle = false }: UsersSearchScreenProps = {}) {
  const { user: currentUser } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('popular');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  // Verificar se o componente está montado
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    // Resetar página ao mudar filtro
    setPage(1);
    setHasMore(true);
    fetchUsers(1);
  }, [selectedFilter, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    // Debounce na busca
    const timer = setTimeout(() => {
      if (isMounted) {
        // Resetar página ao buscar
        setPage(1);
        setHasMore(true);
        fetchUsers(1);
      }
    }, searchQuery ? 500 : 0);

    return () => clearTimeout(timer);
  }, [searchQuery, isMounted]);

  const fetchUsers = async (pageNum = 1) => {
    // Verificar se o componente ainda está montado antes de fazer a requisição
    if (!isMounted) return;

    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await userApi.listUsers({
        page: pageNum,
        limit: 20,
        filter: selectedFilter,
        search: searchQuery.trim(),
      });

      // Verificar novamente se está montado antes de atualizar estado
      if (!isMounted) return;

      if (response && response.success) {
        let rawUsers = searchQuery
          ? (response.data?.searchResults || [])
          : (response.data?.featuredUsers || []);

        // Enriquecer dados com isFollowing
        const processedUsers = (rawUsers || []).map((u: any) => {
          if (!u || !u._id) return null;
          return {
            ...u,
            isFollowing: u.isFollowing || (u.followers?.includes(currentUser?.id)),
          };
        }).filter(Boolean) as User[];

        if (pageNum === 1) {
          setUsers(processedUsers);
        } else {
          // Evitar duplicatas
          setUsers((prev) => {
            if (!prev || prev.length === 0) return processedUsers;
            const existingIds = new Set(prev.map((u) => u._id));
            const uniqueNewUsers = processedUsers.filter(
              (u: User) => u && u._id && !existingIds.has(u._id)
            );
            return [...prev, ...uniqueNewUsers];
          });
        }

        setHasMore(processedUsers.length >= 20);
        setPage(pageNum);
      } else {
        // Se não houver resposta válida, definir lista vazia
        if (pageNum === 1 && isMounted) {
          setUsers([]);
        }
      }
    } catch (error) {
      console.error('[UsersSearchScreen] Erro ao buscar usuários:', error);
      // Não mostrar alert se o componente foi desmontado
      if (isMounted && pageNum === 1) {
        setUsers([]);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchUsers(page + 1);
    }
  };

  const handleUserPress = (user: User) => {
    navigation.navigate('UserProfile', { username: user.username });
  };

  const renderItem = ({ item }: { item: User }) => (
    <UserCard user={item} onPress={() => handleUserPress(item)} />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator
          size="small"
          color={COLORS.secondary.main}
          animating={true}
        />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyText}>
          {searchQuery ? 'Nenhum usuário encontrado' : 'Nenhum usuário disponível'}
        </Text>
        <Text style={styles.emptySubtext}>
          {searchQuery
            ? 'Tente buscar por outro nome'
            : 'Comece a buscar por usuários'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <Header 
          onLogoPress={() => {
            const parent = navigation.getParent();
            if (parent) {
              parent.navigate('FeedTab' as never);
            } else {
              navigation.navigate('FeedTab' as never);
            }
          }}
        />
      )}

      <View style={styles.content}>
        {/* Título */}
        {!hideTitle && <Text style={styles.title}>Buscar Pessoas</Text>}

        {/* Barra de Busca e Filtro na mesma linha */}
        <View style={styles.searchAndFilterRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.text.tertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nome..."
              placeholderTextColor={COLORS.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.filterContainer}>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedFilter}
                onValueChange={(value: FilterType) => setSelectedFilter(value)}
                style={styles.picker}
                dropdownIconColor={COLORS.text.secondary}
              >
                <Picker.Item label="Populares" value="popular" />
                <Picker.Item label="Recentes" value="recent" />
                <Picker.Item label="Mais Vistos" value="most-viewed" />
                <Picker.Item label="Mais Curtidos" value="most-liked" />
              </Picker>
            </View>
          </View>
        </View>

        {/* Lista de Usuários */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={COLORS.secondary.main}
              animating={true}
            />
            <Text style={styles.loadingText}>Carregando usuários...</Text>
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
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
    marginBottom: 12,
  },
  searchAndFilterRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16, // Adicionar margem superior para não ficar colado nas tabs
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    paddingHorizontal: 12,
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
  filterContainer: {
    width: 140,
  },
  pickerWrapper: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
    height: 48, // Altura fixa para igualar ao input
    justifyContent: 'center', // Centralizar verticalmente
  },
  picker: {
    color: COLORS.text.primary,
    height: 48, // Altura fixa para igualar ao input
    paddingVertical: 0, // Remover padding vertical padrão
    marginVertical: 0, // Remover margem vertical
    textAlignVertical: 'center', // Centralizar texto verticalmente (Android)
    includeFontPadding: false, // Remover padding extra de fonte (Android)
  },
  listContent: {
    paddingBottom: 16,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.tertiary,
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
});

