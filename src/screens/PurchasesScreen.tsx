import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Header } from '../components/Header';
import { COLORS } from '../theme/colors';
import { userApi } from '../services/api';
import { showToast } from '../components/CustomToast';
import { getImageUrl } from '../utils/image';

interface Purchase {
  _id: string;
  productId: {
    _id: string;
    title: string;
    description: string;
    price: number;
    coverImage?: string;
    type: string;
    userId: {
      _id: string;
      username: string;
      avatar?: string;
    };
  } | null;
  subscriptionPlan?: {
    _id: string;
    name: string;
    description: string;
    price: number;
    coverImage?: string | null;
    userId: {
      _id: string;
      username: string;
      avatar?: string;
    };
  } | null;
  amount: number;
  createdAt: string;
  status: string;
  isExpired: boolean;
  expiresAt?: string | null;
  daysUntilExpiry?: number | null;
  canDownload: boolean;
  downloadUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  subscription?: {
    isActive: boolean;
    expiresAt?: string | null;
    renewalCount: number;
  } | null;
  isCancelled?: boolean;
}

export function PurchasesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchases = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await userApi.getMyPurchases();

      if (response.success) {
        setPurchases(response.data || []);
      } else {
        setError(response.message || 'Erro ao carregar compras');
        showToast.error('Erro', response.message || 'Não foi possível carregar suas compras');
      }
    } catch (err: any) {
      console.error('[PurchasesScreen] Erro ao buscar compras:', err);
      setError('Erro ao carregar suas compras');
      showToast.error('Erro', 'Não foi possível carregar suas compras');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPurchases();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPurchases(false);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getExpirationStatus = (purchase: Purchase) => {
    if (!purchase.subscription || !purchase.expiresAt) return null;

    if (purchase.isExpired) {
      return { text: 'Expirado', color: COLORS.states.error };
    }

    if (purchase.daysUntilExpiry !== null && purchase.daysUntilExpiry !== undefined) {
      if (purchase.daysUntilExpiry <= 7) {
        return { text: `Expira em ${purchase.daysUntilExpiry} dias`, color: COLORS.states.warning };
      } else {
        return { text: `Expira em ${purchase.daysUntilExpiry} dias`, color: COLORS.states.info };
      }
    }

    return null;
  };

  const handleProductPress = (purchase: Purchase) => {
    if (purchase.subscriptionPlan) {
      // Assinatura de plano - redirecionar para a loja do vendedor
      navigation.navigate('ProfileStack', {
        screen: 'MyShop',
        params: { username: purchase.subscriptionPlan.userId.username },
      });
    } else if (purchase.productId) {
      if (purchase.isExpired) {
        // Se expirado, redirecionar para a loja do vendedor
        navigation.navigate('ProfileStack', {
          screen: 'MyShop',
          params: { username: purchase.productId.userId.username },
        });
      } else {
        // TODO: Navegar para tela de visualização do produto
        showToast.info('Produto', `Abrindo ${purchase.productId.title}`);
      }
    }
  };

  const handleCancelSubscription = (purchase: Purchase) => {
    Alert.alert(
      'Cancelar Assinatura',
      `Tem certeza que deseja cancelar a assinatura "${purchase.subscriptionPlan?.name || purchase.productId?.title || 'Produto'}" de @${purchase.subscriptionPlan?.userId?.username || purchase.productId?.userId?.username || 'vendedor'}?`,
      [
        { text: 'Manter Assinatura', style: 'cancel' },
        {
          text: 'Cancelar Assinatura',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implementar cancelamento de assinatura
              showToast.info('Cancelamento', 'Funcionalidade em desenvolvimento');
            } catch (error) {
              showToast.error('Erro', 'Não foi possível cancelar a assinatura');
            }
          },
        },
      ]
    );
  };

  const renderStats = () => {
    const totalProducts = purchases.length;
    const totalInvested = purchases.reduce((total, purchase) => total + purchase.amount, 0);
    const activeSubscriptions = purchases.filter(
      (p) => p.subscription?.isActive && !p.isExpired && !p.isCancelled
    ).length;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalProducts}</Text>
          <Text style={styles.statLabel}>Produtos Comprados</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.states.success }]}>
            R$ {totalInvested.toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Total Investido</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.states.info }]}>
            {activeSubscriptions}
          </Text>
          <Text style={styles.statLabel}>Assinaturas Ativas</Text>
        </View>
      </View>
    );
  };

  const renderPurchaseCard = ({ item: purchase }: { item: Purchase }) => {
    const expirationStatus = getExpirationStatus(purchase);
    const isExpired = purchase.isExpired;

    const itemTitle =
      purchase.subscriptionPlan?.name ||
      purchase.productId?.title ||
      'Produto Removido';
    const sellerInfo =
      purchase.subscriptionPlan?.userId || purchase.productId?.userId;
    const rawCoverImage =
      purchase.subscriptionPlan?.coverImage ||
      purchase.productId?.coverImage ||
      null;
    
    const imageSource = rawCoverImage
      ? rawCoverImage.startsWith('http') || rawCoverImage.startsWith('/assets')
        ? { uri: rawCoverImage }
        : getImageUrl(rawCoverImage)
          ? { uri: getImageUrl(rawCoverImage)! }
          : require('../../assets/bgMelter.jpg')
      : require('../../assets/bgMelter.jpg');

    return (
      <TouchableOpacity
        style={[
          styles.purchaseCard,
          isExpired && styles.purchaseCardExpired,
        ]}
        onPress={() => !isExpired && handleProductPress(purchase)}
        activeOpacity={0.7}
        disabled={isExpired}
      >
        <Image source={imageSource} style={styles.purchaseImage} />
        <View style={styles.purchaseContent}>
          <View style={styles.purchaseHeader}>
            {purchase.subscriptionPlan ? (
              <View style={[styles.badge, { backgroundColor: COLORS.primary.main }]}>
                <Text style={styles.badgeText}>Plano de Assinatura</Text>
              </View>
            ) : (
              purchase.productId && (
                <View style={[styles.badge, { backgroundColor: COLORS.secondary.main }]}>
                  <Text style={styles.badgeText}>Pacote Digital</Text>
                </View>
              )
            )}
            {expirationStatus && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: expirationStatus.color },
                ]}
              >
                <Text style={styles.badgeText}>{expirationStatus.text}</Text>
              </View>
            )}
          </View>

          <Text style={styles.purchaseTitle} numberOfLines={2}>
            {itemTitle}
          </Text>

          {sellerInfo && (
            <View style={styles.sellerInfo}>
              <Ionicons
                name="person-outline"
                size={16}
                color={COLORS.text.secondary}
              />
              <Text style={styles.sellerText}>@{sellerInfo.username}</Text>
            </View>
          )}

          <View style={styles.purchaseInfo}>
            <View style={styles.priceInfo}>
              <Ionicons
                name="cash-outline"
                size={16}
                color={COLORS.states.success}
              />
              <Text style={styles.priceText}>
                R$ {purchase.amount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.dateInfo}>
              <Ionicons
                name="time-outline"
                size={16}
                color={COLORS.text.secondary}
              />
              <Text style={styles.dateText}>
                {formatDate(purchase.createdAt)}
              </Text>
            </View>
          </View>

          {purchase.subscription?.isActive &&
            !purchase.isExpired &&
            !purchase.isCancelled && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelSubscription(purchase)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={18} color={COLORS.states.error} />
                <Text style={styles.cancelButtonText}>Cancelar Assinatura</Text>
              </TouchableOpacity>
            )}

          {purchase.isCancelled && (
            <View style={[styles.badge, { backgroundColor: COLORS.states.warning }]}>
              <Text style={styles.badgeText}>Cancelado</Text>
            </View>
          )}

          {isExpired ? (
            <TouchableOpacity
              style={styles.renewButton}
              onPress={() => handleProductPress(purchase)}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={18} color="#ffffff" />
              <Text style={styles.renewButtonText}>Renovar Produto</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.accessText}>Toque para acessar</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bag-outline" size={64} color={COLORS.text.tertiary} />
        <Text style={styles.emptyTitle}>Nenhuma compra encontrada</Text>
        <Text style={styles.emptyText}>
          Você ainda não comprou nenhum produto. Explore as lojas para encontrar
          produtos interessantes!
        </Text>
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => {
            const tabNavigator = navigation.getParent();
            if (tabNavigator) {
              (tabNavigator as any).navigate('ShopsTab');
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="storefront-outline" size={18} color="#ffffff" />
          <Text style={styles.exploreButtonText}>Explorar Lojas</Text>
        </TouchableOpacity>
      </View>
    );
  };

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
        <Text style={styles.title}>Minhas Compras</Text>
        <Text style={styles.subtitle}>
          Gerencie seus produtos e assinaturas comprados
        </Text>

        {purchases.length > 0 && renderStats()}

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.secondary.main} />
            <Text style={styles.loadingText}>Carregando compras...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.states.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchPurchases()}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={purchases}
            renderItem={renderPurchaseCard}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.secondary.main}
              />
            }
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary.main,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  purchaseCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  purchaseCardExpired: {
    opacity: 0.7,
    borderColor: COLORS.states.error,
    borderWidth: 2,
  },
  purchaseImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  purchaseContent: {
    padding: 16,
  },
  purchaseHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  purchaseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sellerText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  purchaseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.states.success,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.states.error,
    marginBottom: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.states.error,
  },
  renewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.states.warning,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  renewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  accessText: {
    fontSize: 12,
    color: COLORS.primary.main,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.states.error,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.secondary.main,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.secondary.main,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  exploreButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

