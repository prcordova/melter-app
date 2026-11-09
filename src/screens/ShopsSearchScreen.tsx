import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Header } from '../components/Header';
import { ShopCard } from '../components/ShopCard';
import { MarketplaceBeyondSearchDivider } from '../components/shop/MarketplaceBeyondSearchDivider';
import { MarketplacePromotedShopsSlider } from '../components/shop/marketplace-slider/MarketplacePromotedShopsSlider';
import { shopsApi } from '../services/api';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { showToast } from '../components/CustomToast';
import { useAuth } from '../contexts/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TouchableOpacity } from 'react-native';
import { SelectRow } from '../components/SelectRow';
import {
  marketplaceSortModeToQuery,
  MARKETPLACE_GENDER_LABELS,
  MARKETPLACE_SORT_LABELS,
  type MarketplaceGenderFilter,
  type MarketplaceSortMode,
} from '../utils/marketplace-filters';
import {
  DEFAULT_SHOP_PRODUCTS_LIST_META,
  normalizeShopProductsListMeta,
  type ShopProductsListMeta,
} from '../constants/shop-products-list-meta';

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
  isAiContent?: boolean;
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

const MARKETPLACE_SORT_OPTIONS = MARKETPLACE_SORT_MODES.map((mode) => ({
  value: mode,
  label: MARKETPLACE_SORT_LABELS[mode],
}));

const MARKETPLACE_GENDER_OPTIONS = MARKETPLACE_GENDER_FILTERS.map((filter) => ({
  value: filter,
  label: MARKETPLACE_GENDER_LABELS[filter],
}));

export function ShopsSearchScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const listRef = useRef<FlatList<Product>>(null);
  useScrollToTop(listRef);
  const { width } = useWindowDimensions();
  const isNarrow = width < 400;
  const [searchOpen, setSearchOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [beyondProducts, setBeyondProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortMode, setSortMode] = useState<MarketplaceSortMode>('recent');
  const [genderFilter, setGenderFilter] = useState<MarketplaceGenderFilter>('all');
  const [showAdultContent, setShowAdultContent] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [shopListMeta, setShopListMeta] = useState<ShopProductsListMeta>(
    DEFAULT_SHOP_PRODUCTS_LIST_META
  );

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

  const productFiltersKey = useMemo(
    () =>
      JSON.stringify({
        selectedCategory,
        sortMode,
        searchQuery,
        showAdultContent,
        genderFilter: showAdultContent ? genderFilter : null,
      }),
    [selectedCategory, sortMode, searchQuery, showAdultContent, genderFilter]
  );

  const fetchProducts = useCallback(async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        if (!hasLoadedOnce) setLoading(true);
        setBeyondProducts([]);
        setHasMore(true);
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
        if (response.meta) {
          setShopListMeta(normalizeShopProductsListMeta(response.meta));
        }

        const raw = response.data as any;
        const productsData = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.products)
            ? raw.products
            : Array.isArray(raw?.data)
              ? raw.data
              : [];

        const beyondRaw = response.beyondSearch;
        const beyondData = Array.isArray(beyondRaw) ? beyondRaw : [];

        const normalizeProduct = (p: any) => ({
          ...p,
          categoryId:
            typeof p.categoryId === 'string' ? { name: p.categoryId } : p.categoryId,
        });

        const newProducts = productsData.map(normalizeProduct);
        const newBeyond = beyondData.map(normalizeProduct);

        const pagination = (response as any).pagination ?? raw?.pagination;
        const isLastPage = pagination
          ? pageNum >= pagination.pages
          : newProducts.length < 20;

        if (pageNum === 1) {
          setProducts(newProducts);
        } else {
          setProducts((prev) => {
            const existingIds = new Set(prev.map((p) => p._id));
            const uniqueNewProducts = newProducts.filter(
              (p: Product) => !existingIds.has(p._id)
            );
            return [...prev, ...uniqueNewProducts];
          });
        }

        setBeyondProducts(isLastPage ? newBeyond : []);

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
      if (pageNum === 1) {
        setProducts([]);
        setBeyondProducts([]);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, sortMode, searchQuery, showAdultContent, genderFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1);
    }, searchQuery ? 500 : 0);

    return () => clearTimeout(timer);
  }, [productFiltersKey, fetchProducts, searchQuery]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchProducts(page + 1);
    }
  }, [loadingMore, hasMore, loading, page, fetchProducts]);

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
    <ShopCard
      product={item}
      avatarFallbackEnabled={shopListMeta.productCoverAvatarFallbackEnabled}
      onPress={() => handleProductPress(item)}
    />
  );

  const renderListFooter = () => {
    if (loadingMore && hasMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.secondary.main} animating />
        </View>
      );
    }

    if (beyondProducts.length === 0) return null;

    return (
      <View style={styles.beyondSection}>
        {products.length === 0 ? (
          <Text style={styles.noExactMatch}>Nenhum resultado exato para os filtros atuais.</Text>
        ) : null}
        <MarketplaceBeyondSearchDivider />
        {beyondProducts.map((product) => (
          <View key={`beyond-${product._id}`} style={styles.beyondCardWrap}>
            <ShopCard
              product={product}
              avatarFallbackEnabled={shopListMeta.productCoverAvatarFallbackEnabled}
              onPress={() => handleProductPress(product)}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderFooter = () => renderListFooter();

  const renderEmpty = () => {
    if (loading) return null;
    if (beyondProducts.length > 0) return null;
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

  const renderSearchInput = (autoFocus: boolean) => (
    <TextInput
      style={styles.searchInput}
      placeholder="Buscar produtos..."
      placeholderTextColor={colors.text.tertiary}
      value={searchQuery}
      onChangeText={setSearchQuery}
      autoCapitalize="none"
      autoCorrect={false}
      autoFocus={autoFocus}
      returnKeyType="search"
      onSubmitEditing={() => setSearchOpen(false)}
    />
  );

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
              <Ionicons name="storefront-outline" size={16} color="#ffffff" />
              <Text style={styles.myShopButtonText}>Minha Loja</Text>
            </TouchableOpacity>
          )}
        </View>

        <MarketplacePromotedShopsSlider showAdultContent={showAdultContent} />

        {/* Busca + +18 + ordenar + perfil numa linha (< 400px: busca vira lupa com dropdown) */}
        <View style={styles.searchRowWrap}>
          <View style={styles.searchRow}>
            {isNarrow ? (
              <TouchableOpacity
                style={[styles.searchIconButton, (searchOpen || searchQuery) && styles.searchIconButtonActive]}
                onPress={() => setSearchOpen((open) => !open)}
                accessibilityLabel={searchOpen ? 'Fechar busca' : 'Buscar produtos'}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={searchOpen ? 'close' : 'search'}
                  size={18}
                  color={searchOpen || searchQuery ? colors.secondary.main : colors.text.secondary}
                />
                {!searchOpen && searchQuery ? <View style={styles.searchActiveDot} /> : null}
              </TouchableOpacity>
            ) : (
              <View style={styles.searchContainer}>{renderSearchInput(false)}</View>
            )}
            <TouchableOpacity
              style={[styles.adultToggle, showAdultContent && styles.adultToggleActive]}
              onPress={() => {
                const next = !showAdultContent;
                setShowAdultContent(next);
                if (next) setGenderFilter('women');
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: showAdultContent }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showAdultContent ? 'checkbox' : 'square-outline'}
                size={16}
                color={showAdultContent ? colors.secondary.main : colors.text.secondary}
              />
              <Text style={[styles.adultToggleLabel, showAdultContent && styles.adultToggleLabelActive]}>
                +18
              </Text>
            </TouchableOpacity>
            {isNarrow ? <View style={styles.searchRowSpacer} /> : null}
            <SelectRow
              label="Ordenar por"
              icon="swap-vertical"
              iconActive={sortMode !== 'recent'}
              value={sortMode}
              options={MARKETPLACE_SORT_OPTIONS}
              onChange={(value) => setSortMode(value as MarketplaceSortMode)}
            />
            {showAdultContent ? (
              <SelectRow
                label="Perfil buscado"
                icon="person-circle-outline"
                iconActive={genderFilter !== 'all'}
                value={genderFilter}
                options={MARKETPLACE_GENDER_OPTIONS}
                onChange={(value) => setGenderFilter(value as MarketplaceGenderFilter)}
              />
            ) : null}
          </View>
          {isNarrow && searchOpen ? (
            <View style={styles.searchDropdown}>{renderSearchInput(true)}</View>
          ) : null}
        </View>

        {/* Lista de Produtos */}
        {loading ? (
          renderShopsSkeleton()
        ) : (
          <FlatList
            ref={listRef}
            data={products}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            onEndReached={hasMore ? loadMore : undefined}
            onEndReachedThreshold={0.4}
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

const createStyles = (c: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background.default,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: c.text.primary,
    flex: 1,
  },
  myShopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.secondary.main,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  myShopButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  searchRowWrap: {
    position: 'relative',
    zIndex: 10,
    elevation: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchContainer: {
    flex: 1,
    minWidth: 0,
  },
  searchRowSpacer: {
    flex: 1,
  },
  searchIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.background.paper,
    borderWidth: 1,
    borderColor: c.border.light,
  },
  searchIconButtonActive: {
    borderColor: c.secondary.main,
  },
  searchActiveDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.secondary.main,
  },
  searchDropdown: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    padding: 8,
    borderRadius: 10,
    backgroundColor: c.background.paper,
    borderWidth: 1,
    borderColor: c.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  searchInput: {
    backgroundColor: c.background.paper,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    fontSize: 14,
    color: c.text.primary,
    borderWidth: 1,
    borderColor: c.border.light,
    minHeight: 36,
  },
  adultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border.light,
    backgroundColor: c.background.paper,
  },
  adultToggleActive: {
    borderColor: c.secondary.main,
  },
  adultToggleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text.secondary,
  },
  adultToggleLabelActive: {
    color: c.secondary.main,
  },
  listContent: {
    paddingBottom: 16,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  beyondSection: {
    paddingBottom: 16,
  },
  beyondCardWrap: {
    marginBottom: 12,
  },
  noExactMatch: {
    textAlign: 'center',
    color: c.text.secondary,
    fontSize: 14,
    marginBottom: 4,
    paddingHorizontal: 8,
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
    color: c.text.secondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: c.text.tertiary,
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
    color: c.text.secondary,
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
    backgroundColor: c.border.dark,
  },
  skeletonMyShopBtn: {
    width: 110,
    height: 34,
    borderRadius: 8,
    backgroundColor: c.border.medium,
  },
  skeletonSearch: {
    width: '100%',
    height: 36,
    borderRadius: 8,
    backgroundColor: c.border.medium,
  },
  skeletonFiltersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonFilter: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    backgroundColor: c.border.medium,
  },
  skeletonCard: {
    width: '100%',
    height: 230,
    borderRadius: 12,
    backgroundColor: c.border.medium,
  },
});

