import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { Header } from '../components/Header';
import { ShopCard } from '../components/ShopCard';
import { shopsApi } from '../services/api';
import { COLORS } from '../theme/colors';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { showToast } from '../components/CustomToast';
import { useAuth } from '../contexts/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TouchableOpacity } from 'react-native';
import { DiscoveryModeTabs } from '../components/DiscoveryModeTabs';
import {
  discoveryModeToTabName,
  type DiscoveryViewMode,
} from '../utils/explorer-discovery-personalization';
import {
  marketplaceSortModeToQuery,
  MARKETPLACE_GENDER_LABELS,
  MARKETPLACE_SORT_LABELS,
  type MarketplaceGenderFilter,
  type MarketplaceSortMode,
} from '../utils/marketplace-filters';

interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  type: 'DIGITAL_PACK' | 'DIGITAL_PRODUCT' | 'COURSE' | 'SERVICE' | 'PHYSICAL_PRODUCT';
  coverImage?: string | null;
  userId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  categoryId?: {
    _id?: string;
    name: string;
    color?: string;
    emoji?: string;
  } | string;
  salesCount?: number;
  isActive?: boolean;
  isAdultContent?: boolean;
  paymentMode?: 'UNICO' | 'ASSINATURA';
  subscriptionPlanId?: string;
  subscriptionPlan?: {
    _id: string;
    name: string;
    price: number;
    intervalDays: number;
    isActive: boolean;
  };
}

const MARKETPLACE_SORT_MODES: MarketplaceSortMode[] = [
  'recent',
  'oldest',
  'price_high',
  'price_low',
  'best_sellers',
];

const MARKETPLACE_GENDER_FILTERS: MarketplaceGenderFilter[] = [
  'women',
  'men',
  'trans_women',
  'trans_men',
  'other',
  'all',
];

export function ShopsSearchScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortMode, setSortMode] = useState<MarketplaceSortMode>('recent');
  const [genderFilter, setGenderFilter] = useState<MarketplaceGenderFilter>('women');
  const [showAdultContent, setShowAdultContent] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const handleMyShopPress = () => {
    if (user?.username) {
      try {
        navigation.navigate('ProfileStack', {
          screen: 'MyShop',
          params: { username: user.username },
        });
      } catch (error) {
        console.error('[ShopsSearchScreen] Erro ao navegar para MyShop:', error);
        showToast.error('Erro', 'Não foi possível acessar sua loja. Tente acessar pelo menu do perfil.');
      }
    } else {
      showToast.error('Erro', 'Você precisa estar logado para acessar sua loja');
    }
  };

  useEffect(() => {
    fetchProducts(1);
  }, [selectedCategory, sortMode, showAdultContent, showAdultContent ? genderFilter : null]);

  useEffect(() => {
    // Debounce na busca
    const timer = setTimeout(() => {
      fetchProducts(1);
    }, searchQuery ? 500 : 0);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProducts = async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        if (!hasLoadedOnce) setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const { sortBy, sortOrder } = marketplaceSortModeToQuery(sortMode);

      const response = await shopsApi.getProducts({
        page: pageNum,
        limit: 20,
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery.trim(),
        sortBy,
        sortOrder,
        showAdultContent,
        genderFilter: showAdultContent ? genderFilter : undefined,
      });

      if (response.success) {
        // API atual: { success, data: Product[], pagination } — versões antigas / wrappers: data.products, data.data
        const raw = response.data as any
        const productsData = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.products)
            ? raw.products
            : Array.isArray(raw?.data)
              ? raw.data
              : [];
        
        const newProducts = productsData.map((p: any) => ({
          ...p,
          // Garantir que categoryId seja um objeto se for string
          categoryId: typeof p.categoryId === 'string' 
            ? { name: p.categoryId } 
            : p.categoryId,
        }));

        if (pageNum === 1) {
          setProducts(newProducts);
        } else {
          // Evitar duplicatas
          setProducts((prev) => {
            const existingIds = new Set(prev.map((p) => p._id));
            const uniqueNewProducts = newProducts.filter(
              (p: Product) => !existingIds.has(p._id)
            );
            return [...prev, ...uniqueNewProducts];
          });
        }

        // Paginação vem no mesmo nível que `data` na API /shops/products
        const pagination = (response as any).pagination ?? raw?.pagination;
        if (pagination) {
          setHasMore(pageNum < pagination.pages);
        } else {
          setHasMore(newProducts.length >= 20);
        }
        setPage(pageNum);
        if (pageNum === 1) setHasLoadedOnce(true);
      }
    } catch (error) {
      console.error('[ShopsSearchScreen] Erro ao buscar produtos:', error);
      showToast.error('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchProducts(page + 1);
    }
  };

  const handleProductPress = async (product: Product) => {
    if (!product.userId?.username) {
      showToast.error('Erro', 'Produto sem vendedor identificado');
      return;
    }

    try {
      // Na tab "Lojas", sempre redirecionar para a loja do vendedor
      // Seguindo o padrão do web: handleCardClick - sempre vai para a loja
      (navigation as any).navigate('ProfileStack', {
        screen: 'MyShop',
        params: {
          username: product.userId.username,
        },
      });
    } catch (navError) {
      console.error('[ShopsSearchScreen] Erro na navegação:', navError);
      showToast.error('Erro', 'Não foi possível abrir a loja');
    }
  };

  const renderItem = ({ item }: { item: Product }) => (
    <ShopCard product={item} onPress={() => handleProductPress(item)} />
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
        <Text style={styles.emptyIcon}>🛍️</Text>
        <Text style={styles.emptyText}>
          {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
        </Text>
        <Text style={styles.emptySubtext}>
          {searchQuery
            ? 'Tente buscar por outro termo'
            : 'Comece a buscar por produtos'}
        </Text>
      </View>
    );
  };

  const renderShopsSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonTopRow}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonMyShopBtn} />
      </View>
      <View style={styles.skeletonSearch} />
      <View style={styles.skeletonFiltersRow}>
        <View style={styles.skeletonFilter} />
        <View style={styles.skeletonFilter} />
      </View>
      <View style={styles.skeletonCard} />
      <View style={styles.skeletonCard} />
      <View style={styles.skeletonCard} />
    </View>
  );

  return (
    <View style={styles.container}>
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

      <View style={styles.content}>
        {/* Título e Botão Minha Loja */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Lojas</Text>
          {user?.username && (
            <TouchableOpacity
              style={styles.myShopButton}
              onPress={handleMyShopPress}
              activeOpacity={0.7}
            >
              <Ionicons name="storefront-outline" size={18} color="#ffffff" />
              <Text style={styles.myShopButtonText}>Minha Loja</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.discoveryModeRow}>
          <DiscoveryModeTabs
            activeMode="shops"
            onModeChange={(mode: DiscoveryViewMode) => {
              if (mode === 'shops') return;
              const parent = navigation.getParent();
              parent?.navigate(discoveryModeToTabName(mode) as never);
            }}
          />
        </View>

        {/* Barra de Busca e Toggle +18 */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar produtos..."
              placeholderTextColor={COLORS.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.adultToggleContainer}>
            <Text style={styles.adultToggleLabel}>+18</Text>
            <Switch
              value={showAdultContent}
              onValueChange={(value) => {
                setShowAdultContent(value);
                if (value) {
                  setGenderFilter('women');
                }
              }}
              trackColor={{ false: COLORS.border.medium, true: COLORS.secondary.main }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Filtros — ordenação (+ gênero quando +18) */}
        <View style={styles.filtersSection}>
          <View style={styles.sortRow}>
            <View style={[styles.filterGroup, !showAdultContent && styles.filterGroupFull]}>
              <Text style={styles.filterLabel}>Ordenar:</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={sortMode}
                  onValueChange={(value: MarketplaceSortMode) => setSortMode(value)}
                  style={styles.picker}
                  dropdownIconColor={COLORS.text.secondary}
                >
                  {MARKETPLACE_SORT_MODES.map((mode) => (
                    <Picker.Item
                      key={mode}
                      label={MARKETPLACE_SORT_LABELS[mode]}
                      value={mode}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {showAdultContent ? (
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Perfil:</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={genderFilter}
                    onValueChange={(value: MarketplaceGenderFilter) => setGenderFilter(value)}
                    style={styles.picker}
                    dropdownIconColor={COLORS.text.secondary}
                  >
                    {MARKETPLACE_GENDER_FILTERS.map((filter) => (
                      <Picker.Item
                        key={filter}
                        label={MARKETPLACE_GENDER_LABELS[filter]}
                        value={filter}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* Lista de Produtos */}
        {loading ? (
          renderShopsSkeleton()
        ) : (
          <FlatList
            data={products}
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  discoveryModeRow: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    flex: 1,
  },
  myShopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.secondary.main,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  myShopButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  adultToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  adultToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  filtersSection: {
    marginBottom: 16,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterGroup: {
    flex: 1,
    gap: 8,
  },
  filterGroupFull: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  pickerWrapper: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  picker: {
    color: COLORS.text.primary,
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
  skeletonContainer: {
    flex: 1,
    gap: 12,
  },
  skeletonTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  skeletonTitle: {
    width: 120,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#d1d5db',
  },
  skeletonMyShopBtn: {
    width: 110,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  skeletonSearch: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  skeletonFiltersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonFilter: {
    flex: 1,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  skeletonCard: {
    width: '100%',
    height: 230,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
});

