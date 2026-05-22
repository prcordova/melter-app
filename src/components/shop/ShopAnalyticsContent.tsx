import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '../../theme/colors';
import { shopAnalyticsApi } from '../../services/shops/analytics';
import { showToast } from '../CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../contexts/AuthContext';
import { hasFeatureAccess } from '../../config/plan-features';
import { ShopAnalyticsLockedPanel } from './ShopAnalyticsLockedPanel';

interface AnalyticsData {
  summary: {
    totalSales: number;
    totalRevenue: number;
    totalFees: number;
    netProfit: number;
    currentFeePercentage: number;
    activeSubscribers: number;
    subscriptionPlansSold?: number;
    shopVisits: number;
    productsCreated: number;
    productsDeleted: number;
    checkoutClicksWithoutPurchase: number;
    totalCheckoutClicks: number;
    totalBilling: number;
    shopCreatedAt: string | Date;
  };
  last30Days: {
    salesCount: number;
    totalRevenue: number;
    totalFees: number;
  };
  salesByProduct: Array<{
    productTitle: string;
    salesCount: number;
    totalRevenue: number;
    totalFees: number;
  }>;
  productViewsByProduct: Array<{
    productId: string;
    productTitle: string;
    viewsCount: number;
    uniqueViewersCount: number;
  }>;
  productsList: Array<{
    productId: string;
    productTitle: string;
    status: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    deletedAt: string | Date | null;
    price: number;
    salesCount: number;
    revenue: number;
    fees: number;
    netProfit: number;
    viewsCount: number;
    uniqueViewersCount: number;
    checkoutClicks: number;
    checkoutClicksWithoutPurchase: number;
  }>;
  recentSales: Array<{
    id: string;
    date: string;
    productTitle: string;
    grossAmount: number;
    platformFee: number;
    netAmount: number;
    buyerUsername: string;
  }>;
  monthlyGrowth: Array<{
    month: string;
    sales: number;
    productSales: number;
    subscriptionSales: number;
    revenue: number;
    productRevenue: number;
    subscriptionRevenue: number;
    fees: number;
    topSeller: {
      title: string;
      sales: number;
      type: 'PRODUCT' | 'PLAN';
    } | null;
  }>;
  feeStructure: {
    platformFeePercentage: number;
    description: string;
  };
  demographics: {
    averageAge: number | null;
    topCountry: string | null;
    topState: string | null;
    topLanguage: string | null;
  };
  message?: string;
}

export function ShopAnalyticsContent() {
  const { user } = useAuth();
  const userPlan = (user?.plan?.type || 'FREE') as 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS';
  const hasAnalyticsAccess =
    user?.accountType === 'admin' || hasFeatureAccess(userPlan, 'hasShopAnalytics');

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = startOfMonth(now);
    const lastDay = endOfMonth(now);
    return {
      start: format(firstDay, 'yyyy-MM-dd'),
      end: format(lastDay, 'yyyy-MM-dd'),
    };
  };

  const [dateRange, setDateRange] = useState(getCurrentMonthRange());

  useEffect(() => {
    if (!user || !hasAnalyticsAccess) return;
    fetchAnalytics();
  }, [user, hasAnalyticsAccess, selectedMonth, selectedProduct, dateRange]);

  if (!hasAnalyticsAccess) {
    return <ShopAnalyticsLockedPanel />;
  }

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      let params: any = {};
      
      if (selectedMonth !== 'all') {
        const monthDate = new Date(selectedMonth);
        params.startDate = startOfMonth(monthDate).toISOString();
        params.endDate = endOfMonth(monthDate).toISOString();
      } else if (dateRange.start && dateRange.end) {
        params.startDate = new Date(dateRange.start).toISOString();
        params.endDate = new Date(dateRange.end + 'T23:59:59').toISOString();
      }
      
      if (selectedProduct !== 'all') {
        params.productId = selectedProduct;
      }

      const response = await shopAnalyticsApi.getAnalytics(params);

      if (response.success) {
        setAnalytics(response.data);
      } else {
        setError(response.message || 'Erro ao carregar dados');
        if (response.message?.includes('PRO')) {
          // Mostrar PlanLocker se não tiver plano PRO
        }
      }
    } catch (error: any) {
      console.error('[ShopAnalyticsContent] Erro ao buscar analytics:', error);
      setError('Erro ao conectar com o servidor');
      if (error.response?.status === 403) {
        // Mostrar PlanLocker se não tiver acesso
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const generateMonthOptions = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      months.push({
        value: date.toISOString().slice(0, 7),
        label: format(date, 'MMMM yyyy', { locale: ptBR }),
      });
    }
    return months;
  };

  const clearFilters = () => {
    setSelectedMonth('all');
    setSelectedProduct('all');
    setDateRange(getCurrentMonthRange());
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary.main} />
        <Text style={styles.loadingText}>Carregando analytics...</Text>
      </View>
    );
  }

  if (error && !analytics) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.states.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAnalytics}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!analytics) return null;

  const hasNoData = analytics.summary.totalSales === 0 && 
                    analytics.summary.shopVisits === 0 && 
                    analytics.summary.productsCreated === 0;

  if (hasNoData) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={64} color={COLORS.text.secondary} />
          <Text style={styles.emptyTitle}>Analytics da Loja</Text>
          <Text style={styles.emptyText}>
            {analytics.message || "Use o analytics para entender seu público e melhorar suas vendas. Aqui você verá visitas, visualizações de produtos, cliques em comprar e muito mais."}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Período:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedMonth}
              onValueChange={(value) => setSelectedMonth(value)}
              style={styles.picker}
            >
              <Picker.Item label="Mês Atual" value="all" />
              {generateMonthOptions().map((month) => (
                <Picker.Item key={month.value} label={month.label} value={month.value} />
              ))}
            </Picker>
          </View>
        </View>

        {analytics.productsList && analytics.productsList.length > 0 && (
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Produto:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedProduct}
                onValueChange={(value) => setSelectedProduct(value)}
                style={styles.picker}
              >
                <Picker.Item label="Todos" value="all" />
                {analytics.productsList.map((product) => (
                  <Picker.Item key={product.productId} label={product.productTitle} value={product.productId} />
                ))}
              </Picker>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
          <Ionicons name="refresh-outline" size={16} color={COLORS.primary.main} />
          <Text style={styles.clearButtonText}>Limpar Filtros</Text>
        </TouchableOpacity>
      </View>

      {/* Resumo Financeiro */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumo Financeiro</Text>
        <View style={styles.financialGrid}>
          <View style={styles.financialCard}>
            <Text style={styles.financialValueSuccess}>
              {formatCurrency(analytics.summary.totalBilling || analytics.summary.totalRevenue)}
            </Text>
            <Text style={styles.financialLabel}>Faturamento Total</Text>
          </View>
          <View style={styles.financialCard}>
            <Text style={styles.financialValueError}>
              -{formatCurrency(analytics.summary.totalFees)}
            </Text>
            <Text style={styles.financialLabel}>Taxas e Descontos</Text>
          </View>
          <View style={styles.financialCard}>
            <Text style={styles.financialValuePrimary}>
              {formatCurrency(analytics.summary.netProfit)}
            </Text>
            <Text style={styles.financialLabel}>Lucro Líquido</Text>
          </View>
        </View>
      </View>

      {/* Cards de Estatísticas */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="cart-outline" size={24} color={COLORS.secondary.main} />
          <Text style={styles.statValue}>{analytics.summary.totalSales}</Text>
          <Text style={styles.statLabel}>Total de Vendas</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="people-outline" size={24} color={COLORS.secondary.main} />
          <Text style={styles.statValue}>{analytics.summary.activeSubscribers || 0}</Text>
          <Text style={styles.statLabel}>Assinantes Ativos</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="storefront-outline" size={24} color={COLORS.secondary.main} />
          <Text style={styles.statValue}>{analytics.summary.shopVisits || 0}</Text>
          <Text style={styles.statLabel}>Visitas à Loja</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.secondary.main} />
          <Text style={styles.statValue}>{analytics.summary.productsCreated || 0}</Text>
          <Text style={styles.statLabel}>Produtos Criados</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="trash-outline" size={24} color={COLORS.secondary.main} />
          <Text style={styles.statValue}>{analytics.summary.productsDeleted || 0}</Text>
          <Text style={styles.statLabel}>Produtos Deletados</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="hand-left-outline" size={24} color={COLORS.secondary.main} />
          <Text style={styles.statValue}>{analytics.summary.checkoutClicksWithoutPurchase || 0}</Text>
          <Text style={styles.statLabel}>Cliques sem Compra</Text>
        </View>
      </View>

      {/* Demografia (se houver vendas) */}
      {analytics.summary.totalSales > 0 && analytics.demographics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demografia do Público</Text>
          <View style={styles.demographicsGrid}>
            <View style={styles.demographicCard}>
              <Ionicons name="people-outline" size={20} color={COLORS.primary.main} />
              <Text style={styles.demographicValue}>
                {analytics.demographics.averageAge ? `${analytics.demographics.averageAge} anos` : 'N/A'}
              </Text>
              <Text style={styles.demographicLabel}>Idade Média</Text>
            </View>
            <View style={styles.demographicCard}>
              <Ionicons name="globe-outline" size={20} color={COLORS.primary.main} />
              <Text style={styles.demographicValue}>
                {analytics.demographics.topCountry || 'Não disponível'}
              </Text>
              <Text style={styles.demographicLabel}>País Principal</Text>
            </View>
            <View style={styles.demographicCard}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary.main} />
              <Text style={styles.demographicValue}>
                {analytics.demographics.topState || 'Não disponível'}
              </Text>
              <Text style={styles.demographicLabel}>Estado Principal</Text>
            </View>
            <View style={styles.demographicCard}>
              <Ionicons name="language-outline" size={20} color={COLORS.primary.main} />
              <Text style={styles.demographicValue}>
                {analytics.demographics.topLanguage || 'Não disponível'}
              </Text>
              <Text style={styles.demographicLabel}>Idioma Mais Comum</Text>
            </View>
          </View>
        </View>
      )}

      {/* Vendas por Produto */}
      {analytics.salesByProduct && analytics.salesByProduct.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vendas por Produto</Text>
          {analytics.salesByProduct.map((product, index) => (
            <View key={index} style={styles.productCard}>
              <Text style={styles.productTitle}>{product.productTitle}</Text>
              <View style={styles.productStats}>
                <View style={styles.productStatItem}>
                  <Text style={styles.productStatValue}>{product.salesCount}</Text>
                  <Text style={styles.productStatLabel}>Vendas</Text>
                </View>
                <View style={styles.productStatItem}>
                  <Text style={styles.productStatValue}>{formatCurrency(product.totalRevenue)}</Text>
                  <Text style={styles.productStatLabel}>Receita</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Vendas Recentes */}
      {analytics.recentSales && analytics.recentSales.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vendas Recentes</Text>
          {analytics.recentSales.slice(0, 10).map((sale) => (
            <View key={sale.id} style={styles.saleCard}>
              <View style={styles.saleHeader}>
                <Text style={styles.saleProduct}>{sale.productTitle}</Text>
                <Text style={styles.saleDate}>
                  {format(new Date(sale.date), 'dd/MM/yyyy', { locale: ptBR })}
                </Text>
              </View>
              <View style={styles.saleDetails}>
                <Text style={styles.saleBuyer}>Comprador: @{sale.buyerUsername}</Text>
                <Text style={styles.saleAmount}>{formatCurrency(sale.netAmount)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Informações sobre Taxa */}
      <View style={styles.section}>
        <View style={styles.feeCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary.main} />
          <View style={styles.feeInfo}>
            <Text style={styles.feeTitle}>Taxa da Plataforma</Text>
            <Text style={styles.feeValue}>{analytics.feeStructure.platformFeePercentage}%</Text>
            <Text style={styles.feeDescription}>{analytics.feeStructure.description}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.states.error,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary.main,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
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
    lineHeight: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  filtersContainer: {
    backgroundColor: COLORS.background.paper,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  filterRow: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  pickerContainer: {
    backgroundColor: COLORS.background.default,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.background.tertiary,
    overflow: 'hidden',
  },
  picker: {
    color: COLORS.text.primary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    fontSize: 14,
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  section: {
    backgroundColor: COLORS.background.paper,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  financialGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  financialCard: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background.default,
    borderRadius: 8,
  },
  financialValueSuccess: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.states.success,
    marginBottom: 4,
  },
  financialValueError: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.states.error,
    marginBottom: 4,
  },
  financialValuePrimary: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary.main,
    marginBottom: 4,
  },
  financialLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.background.paper,
    marginBottom: 12,
  },
  statCard: {
    width: '47%',
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
  demographicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  demographicCard: {
    width: '47%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background.default,
    borderRadius: 8,
    gap: 6,
  },
  demographicValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  demographicLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  productCard: {
    padding: 16,
    backgroundColor: COLORS.background.default,
    borderRadius: 8,
    marginBottom: 12,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  productStats: {
    flexDirection: 'row',
    gap: 16,
  },
  productStatItem: {
    flex: 1,
  },
  productStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  productStatLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  saleCard: {
    padding: 16,
    backgroundColor: COLORS.background.default,
    borderRadius: 8,
    marginBottom: 12,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saleProduct: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  saleDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  saleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleBuyer: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.states.success,
  },
  feeCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.background.default,
    borderRadius: 8,
  },
  feeInfo: {
    flex: 1,
  },
  feeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  feeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary.main,
    marginBottom: 4,
  },
  feeDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
});

