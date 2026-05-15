import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { COLORS } from '../theme/colors';
import { showToast } from '../components/CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import { shopApi, sellerVerificationApi, userApi, productsApi, categoriesApi } from '../services/api';
import { SellerVerificationStatusCard } from '../components/shop/SellerVerificationStatusCard';
import { AppealModal } from '../components/shop/AppealModal';
import {
  SellerVerificationFormModal,
  type SellerVerificationFormData,
} from '../components/shop/SellerVerificationFormModal';
import { SellerGrowthPromoCard } from '../components/shop/SellerGrowthPromoCard';
import type { SellerGrowthPromoNavigateAction } from '../components/shop/SellerGrowthPromoCard';
import { ProductCreationWizard } from '../components/shop/ProductCreationWizard';
import { ShopCard } from '../components/ShopCard';
import { SubscriptionPlansContent } from '../components/shop/SubscriptionPlansContent';
import { ShopSettingsModal } from '../components/shop/ShopSettingsModal';
import { ShopAnalyticsContent } from '../components/shop/ShopAnalyticsContent';
import { ShopCommunityContent } from '../components/shop/ShopCommunityContent';
import { ShopSubscriptionPlansSection } from '../components/shop/ShopSubscriptionPlansSection';
import { ProductCheckoutModal, type CheckoutProduct } from '../components/shop/ProductCheckoutModal';
import { PlanLocker } from '../components/PlanLocker';
import { BackArrow } from '../components/BackArrow';
import { getFeatureLimit, hasFeatureAccess } from '../config/plan-features';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';
import axios from 'axios';

type ShopVisibility = 'public' | 'preview' | 'friends' | 'followers';
type ActiveTab = 'products' | 'analytics' | 'community' | 'plans';

interface SellerVerification {
  _id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'disabled' | 'needs_review' | 'appeal' | null;
  submittedAt?: string;
  cpf?: string;
  birthDate?: string;
  ageConfirmed?: boolean;
  contentOwnershipConfirmed?: boolean;
  adultContentAware?: boolean;
  contentType?: string;
  isAdultContent?: boolean;
  documentFront?: string;
  documentBack?: string;
  selfieWithDocument?: string;
  rejectionReason?: string | null;
  needsReviewReason?: string;
  needsReviewReasons?: string[];
  fieldsToReview?: string[];
  appealReason?: string;
  appealSubmittedAt?: string;
  appealBlockedUntil?: string;
}

interface ShopSettings {
  isEnabled: boolean;
  visibility: ShopVisibility;
  saleNotifications: boolean;
  sellerVerification?: SellerVerification | null;
}

interface RouteParams {
  username?: string;
  preview?: string;
  tab?: string;
  openProduct?: string;
  openPlan?: string;
}

export function MyShopScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

  // Estados principais
  const [loading, setLoading] = useState(true);
  const [shopOwner, setShopOwner] = useState<any>(null);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('products');
  const [isPreview, setIsPreview] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [checkoutProduct, setCheckoutProduct] = useState<CheckoutProduct | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [planAutoOpenConsumed, setPlanAutoOpenConsumed] = useState(false);
  const [pendingOpenPlanId, setPendingOpenPlanId] = useState<string | null>(null);
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [verificationFormData, setVerificationFormData] = useState<
    SellerVerificationFormData | undefined
  >(undefined);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingProductsCount, setPendingProductsCount] = useState(0);

  // Extrair parâmetros da rota
  const username = route.params?.username || user?.username || '';
  const isOwner = user?.username === username;
  const isAdmin = user?.accountType === 'admin';

  // Verificar se é preview
  useEffect(() => {
    const previewParam = route.params?.preview;
    setIsPreview(previewParam === 'true');
  }, [route.params?.preview]);

  // Verificar tab inicial
  useEffect(() => {
    const tabParam = route.params?.tab;
    if (tabParam === 'analytics' || tabParam === 'plans' || tabParam === 'community') {
      setActiveTab(tabParam as ActiveTab);
    }
  }, [route.params?.tab]);

  // Carregar dados da loja (recarrega ao mudar username / dono)
  useEffect(() => {
    if (authLoading || !username) return;

    let cancelled = false;

    (async () => {
      await fetchShopData();
      if (cancelled) return;
      if (isOwner) {
        await fetchShopSettings();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, username, isOwner]);

  // Deep link: abrir checkout do produto quando a lista já carregou
  useEffect(() => {
    if (loading || loadingProducts || !products.length) return;
    const openProductId = route.params?.openProduct;
    if (!openProductId || isOwner) return;
    const product = products.find((p: any) => p._id === openProductId);
    if (!product) return;
    const subId = product.subscriptionPlanId || product.subscriptionPlan?._id;
    if (product.paymentMode === 'ASSINATURA' && subId) {
      setPlanAutoOpenConsumed(false);
      return;
    }
    setCheckoutProduct(product as CheckoutProduct);
    setShowCheckoutModal(true);
  }, [loading, loadingProducts, products, route.params?.openProduct, isOwner]);

  useEffect(() => {
    setPlanAutoOpenConsumed(false);
  }, [route.params?.openPlan, username]);

  // Buscar configurações da loja (apenas para dono)
  const fetchShopSettings = async () => {
    try {
      const response = await shopApi.getSettings();

      if (response.success && response.data) {
        setShopSettings(response.data);
        fetchProducts();
      } else {
        setShopSettings(null);
      }
    } catch (error) {
      console.error('[MyShopScreen] Erro ao carregar configurações:', error);
      setShopSettings(null);
    }
  };

  // Buscar produtos da loja
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      
      // Se for dono, não passar username para buscar produtos próprios (incluindo pendentes)
      // Se não for dono, passar username para buscar produtos públicos (apenas aprovados)
      const response = await productsApi.getProducts(
        isOwner 
          ? { isActive: undefined } // Busca própria: retorna todos os status (PENDING, APPROVED, etc)
          : { username: username, isActive: true } // Busca pública: apenas produtos aprovados e ativos
      );

      if (response.success) {
        let productsData = Array.isArray(response.data) ? response.data : [];
        
        // Para visitantes, garantir que apenas produtos aprovados sejam mostrados
        if (!isOwner) {
          productsData = productsData.filter((p: any) => p.status === 'APPROVED');
        }
        // Para dono, incluir produtos aprovados, pendentes e que requerem mudanças
        else {
          productsData = productsData.filter((p: any) => 
            p.status === 'APPROVED' || 
            p.status === 'PENDING' || 
            p.status === 'REQUIRES_CHANGES'
          );
        }
        
        if (user) {
          productsData = await Promise.all(
            productsData.map(async (p: any) => {
              try {
                const st = await productsApi.getPurchaseStatus(p._id);
                if (st.success && st.data) {
                  return { ...p, purchaseStatus: st.data };
                }
              } catch {
                /* ignore */
              }
              return p;
            })
          );
        }

        setProducts(productsData);

        // Contar produtos pendentes (apenas para dono)
        if (isOwner) {
          const pendingCount = productsData.filter((p: any) => p.status === 'PENDING').length;
          setPendingProductsCount(pendingCount);
        } else {
          setPendingProductsCount(0);
        }
      } else {
        setProducts([]);
        setPendingProductsCount(0);
      }
    } catch (error) {
      console.error('[MyShopScreen] Erro ao buscar produtos:', error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Buscar dados da loja
  const fetchShopData = async () => {
    try {
      setLoading(true);

      // Buscar dados do dono da loja
      const userResponse = await userApi.getUserProfile(username);

      if (!userResponse.success) {
        showToast.error('Erro', 'Usuário não encontrado');
        navigation.goBack();
        return;
      }

      const owner = userResponse.data;
      setShopOwner(owner);

      try {
        const catRes = await categoriesApi.getCategories(username);
        if (catRes.success && Array.isArray(catRes.data)) {
          setCategories(catRes.data.filter((c: any) => (c.productsCount ?? 0) > 0));
        } else {
          setCategories([]);
        }
      } catch {
        setCategories([]);
      }

      // Verificações de acesso (apenas para visitantes)
      if (!isOwner && !isAdmin) {
        // 1. Verificar se loja está habilitada
        if (!owner.shop?.isEnabled) {
          showToast.error('Erro', 'Esta loja não está disponível no momento');
          navigation.goBack();
          return;
        }

        // 2. Verificar visibilidade
        const shopVisibility = owner.shop?.visibility || 'preview';

        if (shopVisibility === 'preview') {
          showToast.error('Erro', 'Esta loja está em modo preview');
          navigation.goBack();
          return;
        }

        if (shopVisibility === 'followers') {
          try {
            const statusResponse = await userApi.getFollowStatus(username);
            if (statusResponse.success && !statusResponse.data?.isFollowing) {
              showToast.error('Erro', 'Esta loja é restrita apenas para seguidores');
              navigation.goBack();
              return;
            }
          } catch (error) {
            console.error('[MyShopScreen] Erro ao verificar seguidores:', error);
            showToast.error('Erro', 'Erro ao verificar permissões de acesso');
            navigation.goBack();
            return;
          }
        }

        if (shopVisibility === 'friends') {
          // Mesmo critério do web: status de amizade no GET /api/users/:username
          const fs = owner.friendshipStatus as string | undefined;
          const isFriend = fs === 'FRIENDS' || fs === 'FRIENDLY';
          if (!isFriend) {
            showToast.error('Erro', 'Esta loja é restrita apenas para amigos');
            navigation.goBack();
            return;
          }
        }
      }

      // Se não é dono e passou nas verificações, buscar produtos da loja
      if (!isOwner) {
        fetchProducts();
      }
    } catch (error) {
      console.error('[MyShopScreen] Erro ao carregar loja:', error);
      showToast.error('Erro', 'Erro ao carregar dados da loja');
    } finally {
      setLoading(false);
    }
  };

  // Buscar dados completos de verificação
  const fetchVerificationData = async () => {
    try {
      const response = await sellerVerificationApi.getVerification();
      if (response.success && response.data) {
        // Atualizar shopSettings com os novos dados
        setShopSettings((prev) => {
          if (prev) {
            return {
              ...prev,
              sellerVerification: response.data,
            };
          }
          return prev;
        });
        return response.data;
      }
    } catch (error) {
      console.error('[MyShopScreen] Erro ao buscar dados de verificação:', error);
    }
    return null;
  };

  // Handler para abrir configurações
  const handleSettingsPress = () => {
    setShowSettingsModal(true);
  };

  // Handler para quando as configurações forem atualizadas
  const handleSettingsUpdated = async () => {
    await fetchShopSettings();
    // Se a loja foi desativada ou excluída, recarregar dados
    await fetchShopData();
  };

  // Handler para mudar tab
  const handleTabChange = (tab: ActiveTab) => {
    // Verificar acesso à tab Analytics
    if (tab === 'analytics') {
      const userPlan = (user?.plan?.type || 'FREE') as 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS';
      const hasAccess = isAdmin || hasFeatureAccess(userPlan, 'hasShopAnalytics');
      
      if (!hasAccess) {
        showToast.info('Analytics', 'Analytics disponível apenas para plano PRO');
        navigation.navigate('Plans' as never);
        return;
      }
    }

    setActiveTab(tab);
  };

  const sellerVerification = shopSettings?.sellerVerification;

  // Verificar se pode criar mais produtos (incluindo produtos pendentes no limite)
  const getProductLimits = () => {
    const planType = (user?.plan?.type || 'FREE') as 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS';
    const maxProducts = getFeatureLimit(planType, 'maxProducts');
    // Incluir produtos pendentes no limite (eles já "gastam" o recurso)
    const currentProducts = products.length; // products já inclui todos (ativos + pendentes) para o dono
    return { max: maxProducts, current: currentProducts };
  };

  const canCreateProduct = () => {
    const limits = getProductLimits();
    // Não pode criar se já atingiu o limite (incluindo produtos pendentes)
    return limits.current < limits.max;
  };

  // Determinar qual plano é necessário quando o limite é atingido
  const getRequiredPlan = (): 'STARTER' | 'PRO' | 'PRO_PLUS' => {
    const planType = (user?.plan?.type || 'FREE') as 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS';
    if (planType === 'FREE') return 'STARTER';
    if (planType === 'STARTER') return 'PRO';
    if (planType === 'PRO') return 'PRO_PLUS';
    return 'PRO_PLUS'; // Se já é PRO_PLUS, não há upgrade
  };

  const ownerApproved = sellerVerification?.status === 'approved';
  const showTabs = isAdmin || (isOwner && ownerApproved);

  const mapVerificationToFormData = (
    data: SellerVerification | null | undefined
  ): SellerVerificationFormData | undefined => {
    if (!data) return undefined;
    return {
      cpf: data.cpf,
      birthDate: data.birthDate,
      ageConfirmed: data.ageConfirmed,
      contentOwnershipConfirmed: data.contentOwnershipConfirmed,
      adultContentAware: data.adultContentAware,
      contentType: data.contentType,
      isAdultContent: data.isAdultContent,
      documentFront: data.documentFront,
      documentBack: data.documentBack,
      selfieWithDocument: data.selfieWithDocument,
      status: data.status ?? undefined,
      needsReviewReasons: data.needsReviewReasons,
      needsReviewReason: data.needsReviewReason,
      rejectionReason: data.rejectionReason,
      fieldsToReview: data.fieldsToReview || [],
    };
  };

  const openVerificationForm = async () => {
    const fresh = await fetchVerificationData();
    setVerificationFormData(mapVerificationToFormData(fresh ?? sellerVerification));
    setShowVerificationForm(true);
  };

  const handleGrowthPromoAction = (action: SellerGrowthPromoNavigateAction) => {
    if (action === 'openVerificationForm') {
      void openVerificationForm();
      return;
    }
    if (action === 'links') {
      navigation.navigate('ProfileStack' as never, { screen: 'LinksSettings' } as never);
      return;
    }
    if (action === 'appearance') {
      navigation.navigate('ProfileStack' as never, { screen: 'AppearanceSettings' } as never);
      return;
    }
    if (action === 'feed') {
      navigation.navigate('FeedTab' as never);
      return;
    }
    if (action === 'explorer') {
      navigation.navigate('ShopsSearch' as never);
    }
  };

  const handleVerificationSuccess = (updated: SellerVerificationFormData) => {
    setShopSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sellerVerification: {
          ...(prev.sellerVerification || { status: null }),
          ...updated,
          status: (updated.status as SellerVerification['status']) ?? 'pending',
        },
      };
    });
    setShowVerificationForm(false);
    void fetchShopSettings();
  };

  const filteredProducts = useMemo(() => {
    let list =
      selectedCategory === 'all'
        ? products.filter((p: any) => {
            if (!isOwner) return p.status === 'APPROVED';
            return (
              p.status === 'APPROVED' ||
              p.status === 'PENDING' ||
              p.status === 'REQUIRES_CHANGES'
            );
          })
        : products.filter((p: any) => {
            const catId =
              typeof p.categoryId === 'object' && p.categoryId ? p.categoryId._id : p.categoryId;
            const match = catId === selectedCategory;
            if (!isOwner) return match && p.status === 'APPROVED';
            return (
              match &&
              (p.status === 'APPROVED' || p.status === 'PENDING' || p.status === 'REQUIRES_CHANGES')
            );
          });
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p: any) => (p.title || '').toLowerCase().includes(q));
    }
    return [...list].sort((a: any, b: any) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return sortOrder === 'newest' ? tb - ta : ta - tb;
    });
  }, [products, selectedCategory, searchQuery, sortOrder, isOwner]);

  const openPlanIdParam =
    (route.params?.openPlan && !planAutoOpenConsumed ? route.params.openPlan : null) ||
    pendingOpenPlanId;

  const handleProductPrimaryAction = async (product: any, mode: 'visitor' | 'owner') => {
    const isVisitorMode = mode === 'visitor';
    const hasPurchased = product.purchaseStatus?.hasPurchased === true;
    const hasAccessViaPlan = product.purchaseStatus?.accessVia === 'SUBSCRIPTION_PLAN';

    if (!isVisitorMode && isOwner) {
      try {
        const res = await productsApi.getProduct(product._id);
        if (res.success && res.data) {
          setEditingProduct(res.data);
          setShowCreateProductModal(true);
        } else {
          showToast.error('Produto', res.message || 'Não foi possível abrir para edição');
        }
      } catch (e: any) {
        showToast.error(
          'Produto',
          e?.response?.data?.message || e?.message || 'Erro ao carregar o produto'
        );
      }
      return;
    }

    if (hasPurchased) {
      if (product.type === 'DIGITAL_PACK' && product.purchaseStatus?.isActive) {
        navigation.navigate('Product', { productId: product._id });
      } else {
        navigation.navigate('Purchases');
      }
      return;
    }
    if (hasAccessViaPlan) {
      navigation.navigate('Product', { productId: product._id });
      return;
    }
    if (!user) {
      showToast.info('Login', 'Entre na sua conta para comprar ou assinar.');
      return;
    }
    const subscriptionPlanId = product.subscriptionPlanId || product.subscriptionPlan?._id;
    if (product.paymentMode === 'ASSINATURA' && subscriptionPlanId) {
      setPlanAutoOpenConsumed(false);
      setPendingOpenPlanId(subscriptionPlanId);
      return;
    }
    setCheckoutProduct(product as CheckoutProduct);
    setShowCheckoutModal(true);
  };

  const handleProductCardPress = (product: any, mode: 'visitor' | 'owner') => {
    const hasPurchased = product.purchaseStatus?.hasPurchased === true;
    const hasAccessViaPlan = product.purchaseStatus?.accessVia === 'SUBSCRIPTION_PLAN';
    const canAccess =
      (mode === 'owner' && isOwner) || isAdmin || hasPurchased || hasAccessViaPlan;
    if (canAccess) {
      navigation.navigate('Product', { productId: product._id });
    }
  };

  const primaryLabel = (product: any, mode: 'visitor' | 'owner') => {
    if (mode === 'owner' && isOwner) return 'Editar';
    const hasPurchased = product.purchaseStatus?.hasPurchased === true;
    const hasAccessViaPlan = product.purchaseStatus?.accessVia === 'SUBSCRIPTION_PLAN';
    if (hasPurchased || hasAccessViaPlan) return 'Entrar';
    if (product.paymentMode === 'ASSINATURA') return 'Assinar';
    return 'Comprar';
  };

  const purchaseStatusChip = (product: any) => {
    if (!product.purchaseStatus?.hasPurchased) return undefined;
    const label = product.purchaseStatus?.isActive ? 'Ativo' : 'Comprado';
    return { label };
  };

  if (loading || authLoading) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.secondary.main} />
          <Text style={styles.loadingText}>Carregando loja...</Text>
        </View>
      </View>
    );
  }

  const handleBackToProfile = () => {
    // Navegar para o perfil do dono da loja
    // UserProfile está no TabNavigator, então precisa navegar via parent
    // Estrutura: TabNavigator > ProfileStack (tab) > ProfileStackNavigator > MyShop
    try {
      // Primeiro, resetar a stack do ProfileStackNavigator para limpar a navegação da loja
      const profileStackNavigator = navigation.getParent();
      if (profileStackNavigator) {
        (profileStackNavigator as any).dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'ProfileMain' }],
          })
        );
      }
      
      // Depois, navegar para UserProfile no TabNavigator
      const tabNavigator = navigation.getParent()?.getParent();
      if (tabNavigator) {
        // Usar setTimeout para garantir que o reset foi processado antes de navegar
        setTimeout(() => {
          (tabNavigator as any).navigate('UserProfile', {
            username: username,
          });
        }, 100);
      } else {
        // Fallback: tentar pegar o parent direto
        const parent = navigation.getParent();
        if (parent) {
          (parent as any).navigate('UserProfile', {
            username: username,
          });
        } else {
          navigation.navigate('UserProfile', {
            username: username,
          });
        }
      }
    } catch (error) {
      console.error('[MyShopScreen] Erro ao navegar para perfil:', error);
      // Fallback: tentar navegar diretamente
      try {
        const parent = navigation.getParent();
        if (parent) {
          (parent as any).navigate('UserProfile', {
            username: username,
          });
        } else {
          navigation.navigate('UserProfile', {
            username: username,
          });
        }
      } catch (fallbackError) {
        console.error('[MyShopScreen] Erro no fallback de navegação:', fallbackError);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Header
        onLogoPress={() => {
          const parent = navigation.getParent();
          if (parent) {
            parent.navigate('FeedTab');
          } else {
            navigation.navigate('FeedTab');
          }
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner de Preview (apenas para dono em modo preview) */}
        {isPreview && isOwner && (
          <View style={styles.previewBanner}>
            <View style={styles.previewBannerContent}>
              <Text style={styles.previewBannerTitle}>👁️ Modo Preview</Text>
              <Text style={styles.previewBannerText}>
                Esta é uma prévia da sua loja.
                {!shopOwner?.shop?.isEnabled && ' Sua loja está DESATIVADA - apenas você pode ver.'}
              </Text>
              <View style={styles.previewBannerInfo}>
                <Ionicons name="information-circle" size={16} color="#ffffff" />
                <Text style={styles.previewBannerInfoText}>
                  Ao editar produtos ou configurações, atualize esta página para ver as mudanças.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.previewBannerButton}
              onPress={() => {
                fetchShopData();
                if (isOwner) {
                  fetchShopSettings();
                }
              }}
            >
              <Ionicons name="refresh" size={16} color="#ffffff" />
              <Text style={styles.previewBannerButtonText}>Atualizar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {/* Back Button - sempre visível */}
            <BackArrow onPress={handleBackToProfile} />
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Loja de </Text>
              <TouchableOpacity onPress={handleBackToProfile} activeOpacity={0.7}>
                <Text style={styles.titleUsername}>{username}</Text>
              </TouchableOpacity>
            </View>
            {isOwner && (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={handleSettingsPress}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={24} color={COLORS.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sistema de Tabs (apenas para dono aprovado ou admin) */}
        {showTabs && (
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'products' && styles.tabActive]}
                onPress={() => handleTabChange('products')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'products' && styles.tabTextActive,
                  ]}
                >
                  Produtos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'analytics' && styles.tabActive]}
                onPress={() => handleTabChange('analytics')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'analytics' && styles.tabTextActive,
                  ]}
                >
                  Analytics
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'community' && styles.tabActive]}
                onPress={() => handleTabChange('community')}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'community' && styles.tabTextActive,
                  ]}
                >
                  Comunidade
                </Text>
              </TouchableOpacity>

              {isOwner && sellerVerification?.status === 'approved' && (
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'plans' && styles.tabActive]}
                  onPress={() => handleTabChange('plans')}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'plans' && styles.tabTextActive,
                    ]}
                  >
                    Planos
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}

        {/* Conteúdo: com abas (dono aprovado ou admin) ou loja pública / dono em análise */}
        {showTabs ? (
          <View style={styles.tabContent}>
            {activeTab === 'products' && (
              <View style={styles.productsContent}>
                {isOwner && ownerApproved && shopSettings && !shopSettings.isEnabled && (
                  <View style={styles.shopDisabledBanner}>
                    <Ionicons name="storefront-outline" size={22} color={COLORS.states.warning} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shopDisabledTitle}>Loja desativada</Text>
                      <Text style={styles.shopDisabledText}>
                        Visitantes não veem sua vitrine. Ative nas configurações para vender.
                      </Text>
                    </View>
                    <TouchableOpacity onPress={handleSettingsPress} style={styles.shopDisabledBtn}>
                      <Text style={styles.shopDisabledBtnText}>Configurar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isOwner && ownerApproved && pendingProductsCount > 0 && (
                  <View style={styles.pendingAlert}>
                    <View style={styles.pendingAlertContent}>
                      <Ionicons name="information-circle" size={20} color={COLORS.primary.main} />
                      <View style={styles.pendingAlertText}>
                        <Text style={styles.pendingAlertTitle}>
                          Você tem {pendingProductsCount} produto
                          {pendingProductsCount > 1 ? 's' : ''} pendente
                          {pendingProductsCount > 1 ? 's' : ''}
                        </Text>
                        <Text style={styles.pendingAlertDescription}>
                          Em análise; em breve ficam ativos na loja.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {loadingProducts ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.secondary.main} />
                    <Text style={styles.loadingText}>Carregando produtos...</Text>
                  </View>
                ) : products.length === 0 ? (
                  <View style={styles.emptyProductsContainer}>
                    <View style={styles.emptyProductsIcon}>
                      <Text style={styles.emptyProductsEmoji}>📦</Text>
                    </View>
                    <Text style={styles.emptyProductsTitle}>Esta loja ainda não tem produtos</Text>
                    <Text style={styles.emptyProductsText}>
                      {isOwner
                        ? 'Comece criando seu primeiro produto!'
                        : 'O dono desta loja ainda não adicionou itens.'}
                    </Text>
                    {isOwner && (
                      !canCreateProduct() ? (
                        <PlanLocker
                          requiredPlan={getRequiredPlan()}
                          currentPlan={(user?.plan?.type || 'FREE') as 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS'}
                        >
                          <TouchableOpacity
                            style={[styles.createProductButton, styles.createProductButtonDisabled]}
                            disabled
                            activeOpacity={0.7}
                          >
                            <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                            <Text style={styles.createProductButtonText}>Criar Primeiro Produto</Text>
                          </TouchableOpacity>
                        </PlanLocker>
                      ) : (
                        <TouchableOpacity
                          style={styles.createProductButton}
                          onPress={() => {
                            setEditingProduct(null);
                            setShowCreateProductModal(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                          <Text style={styles.createProductButtonText}>Criar Primeiro Produto</Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                ) : (
                  <>
                    {isOwner && products.length > 0 && (
                      <View style={styles.productsHeader}>
                        <Text style={styles.productsCount}>
                          {products.length} {products.length === 1 ? 'produto' : 'produtos'}
                          {pendingProductsCount > 0 &&
                            ` (${pendingProductsCount} pendente${pendingProductsCount > 1 ? 's' : ''})`}
                        </Text>
                        {!canCreateProduct() ? (
                          <PlanLocker
                            requiredPlan={getRequiredPlan()}
                            currentPlan={(user?.plan?.type || 'FREE') as 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS'}
                          >
                            <TouchableOpacity
                              style={[styles.newProductButton, styles.newProductButtonDisabled]}
                              disabled
                              activeOpacity={0.7}
                            >
                              <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                              <Text style={styles.newProductButtonText}>
                                Novo ({getProductLimits().current}/{getProductLimits().max})
                              </Text>
                            </TouchableOpacity>
                          </PlanLocker>
                        ) : (
                          <TouchableOpacity
                            style={styles.newProductButton}
                            onPress={() => {
                              setEditingProduct(null);
                              setShowCreateProductModal(true);
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                            <Text style={styles.newProductButtonText}>
                              Novo ({getProductLimits().current}/{getProductLimits().max})
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {!isOwner && (
                      <ShopSubscriptionPlansSection
                        username={username}
                        planIdToOpen={openPlanIdParam}
                        onPlanOpened={() => {
                          setPlanAutoOpenConsumed(true);
                          setPendingOpenPlanId(null);
                        }}
                      />
                    )}

                    {products.length > 0 && (
                      <View style={styles.filtersRow}>
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Pesquisar..."
                          placeholderTextColor={COLORS.text.tertiary}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                        />
                        <TouchableOpacity
                          style={styles.sortChip}
                          onPress={() =>
                            setSortOrder((s) => (s === 'newest' ? 'oldest' : 'newest'))
                          }
                        >
                          <Ionicons name="swap-vertical" size={16} color={COLORS.secondary.main} />
                          <Text style={styles.sortChipText}>
                            {sortOrder === 'newest' ? 'Recentes' : 'Antigos'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {categories.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.categoriesScroll}
                        contentContainerStyle={styles.categoriesContent}
                      >
                        <TouchableOpacity
                          style={[
                            styles.catChip,
                            selectedCategory === 'all' && styles.catChipActive,
                          ]}
                          onPress={() => setSelectedCategory('all')}
                        >
                          <Text
                            style={[
                              styles.catChipText,
                              selectedCategory === 'all' && styles.catChipTextActive,
                            ]}
                          >
                            Todos
                          </Text>
                        </TouchableOpacity>
                        {categories.map((cat: any) => (
                          <TouchableOpacity
                            key={cat._id}
                            style={[
                              styles.catChip,
                              selectedCategory === cat._id && styles.catChipActive,
                            ]}
                            onPress={() => setSelectedCategory(cat._id)}
                          >
                            <Text
                              style={[
                                styles.catChipText,
                                selectedCategory === cat._id && styles.catChipTextActive,
                              ]}
                            >
                              {cat.name} ({cat.productsCount ?? 0})
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    {filteredProducts.length === 0 ? (
                      <View style={styles.emptyProductsContainer}>
                        <Text style={styles.emptyProductsTitle}>
                          Nenhum produto nesta categoria ou busca
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.productsList}>
                        {filteredProducts.map((product: any) => {
                          const mode = isOwner ? 'owner' : 'visitor';
                          const hasPurchased = product.purchaseStatus?.hasPurchased === true;
                          const hasAccessViaPlan =
                            product.purchaseStatus?.accessVia === 'SUBSCRIPTION_PLAN';
                          const canAccess =
                            (mode === 'owner' && isOwner) ||
                            isAdmin ||
                            hasPurchased ||
                            hasAccessViaPlan;
                          return (
                            <ShopCard
                              key={product._id}
                              product={product}
                              showPendingBadge={isOwner}
                              showRequiresChangesBadge={isOwner}
                              statusChip={
                                mode === 'visitor' ? purchaseStatusChip(product) : undefined
                              }
                              onPress={
                                canAccess ? () => handleProductCardPress(product, mode) : undefined
                              }
                              footerAction={{
                                label: primaryLabel(product, mode),
                                onPress: () => handleProductPrimaryAction(product, mode),
                              }}
                            />
                          );
                        })}
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {activeTab === 'analytics' && (
              <PlanLocker
                requiredPlan="PRO"
                currentPlan={(user?.plan?.type || 'FREE') as 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS'}
                isAdmin={isAdmin}
              >
                <ShopAnalyticsContent />
              </PlanLocker>
            )}

            {activeTab === 'community' && <ShopCommunityContent />}

            {activeTab === 'plans' && isOwner && (
              <SubscriptionPlansContent userPlan={user?.plan?.type as any} />
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            {isOwner && (
              <>
                <SellerVerificationStatusCard
                  sellerVerification={sellerVerification || null}
                  onOpenForm={() => {
                    void openVerificationForm();
                  }}
                  onOpenAppeal={() => setShowAppealModal(true)}
                  onRefresh={fetchShopSettings}
                />
                <SellerGrowthPromoCard
                  variant="large"
                  placement="shop"
                  sellerStatus={sellerVerification?.status ?? null}
                  onAction={handleGrowthPromoAction}
                />
              </>
            )}

            <ShopSubscriptionPlansSection
              username={username}
              planIdToOpen={openPlanIdParam}
              onPlanOpened={() => {
                setPlanAutoOpenConsumed(true);
                setPendingOpenPlanId(null);
              }}
            />

            {loadingProducts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.secondary.main} />
                <Text style={styles.loadingText}>Carregando produtos...</Text>
              </View>
            ) : products.length === 0 ? (
              <View style={styles.emptyProductsContainer}>
                <Text style={styles.emptyProductsTitle}>Esta loja ainda não tem produtos</Text>
                <Text style={styles.emptyProductsText}>
                  {isOwner
                    ? 'Crie seu primeiro produto após a aprovação do cadastro de vendedor.'
                    : 'O dono desta loja ainda não adicionou itens.'}
                </Text>
              </View>
            ) : (
              <>
                {products.length > 0 && (
                  <View style={styles.filtersRow}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Pesquisar..."
                      placeholderTextColor={COLORS.text.tertiary}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity
                      style={styles.sortChip}
                      onPress={() => setSortOrder((s) => (s === 'newest' ? 'oldest' : 'newest'))}
                    >
                      <Ionicons name="swap-vertical" size={16} color={COLORS.secondary.main} />
                      <Text style={styles.sortChipText}>
                        {sortOrder === 'newest' ? 'Recentes' : 'Antigos'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {categories.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoriesScroll}
                    contentContainerStyle={styles.categoriesContent}
                  >
                    <TouchableOpacity
                      style={[styles.catChip, selectedCategory === 'all' && styles.catChipActive]}
                      onPress={() => setSelectedCategory('all')}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          selectedCategory === 'all' && styles.catChipTextActive,
                        ]}
                      >
                        Todos
                      </Text>
                    </TouchableOpacity>
                    {categories.map((cat: any) => (
                      <TouchableOpacity
                        key={cat._id}
                        style={[
                          styles.catChip,
                          selectedCategory === cat._id && styles.catChipActive,
                        ]}
                        onPress={() => setSelectedCategory(cat._id)}
                      >
                        <Text
                          style={[
                            styles.catChipText,
                            selectedCategory === cat._id && styles.catChipTextActive,
                          ]}
                        >
                          {cat.name} ({cat.productsCount ?? 0})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                {filteredProducts.length === 0 ? (
                  <View style={styles.emptyProductsContainer}>
                    <Text style={styles.emptyProductsTitle}>
                      Nenhum produto nesta categoria ou busca
                    </Text>
                  </View>
                ) : (
                  <View style={styles.productsList}>
                    {filteredProducts.map((product: any) => {
                      const mode = isOwner ? 'owner' : 'visitor';
                      const hasPurchased = product.purchaseStatus?.hasPurchased === true;
                      const hasAccessViaPlan =
                        product.purchaseStatus?.accessVia === 'SUBSCRIPTION_PLAN';
                      const canAccess =
                        (mode === 'owner' && isOwner) ||
                        isAdmin ||
                        hasPurchased ||
                        hasAccessViaPlan;
                      return (
                        <ShopCard
                          key={product._id}
                          product={product}
                          showPendingBadge={isOwner}
                          showRequiresChangesBadge={isOwner}
                          statusChip={!isOwner ? purchaseStatusChip(product) : undefined}
                          onPress={
                            canAccess ? () => handleProductCardPress(product, mode) : undefined
                          }
                          footerAction={{
                            label: primaryLabel(product, mode),
                            onPress: () => handleProductPrimaryAction(product, mode),
                          }}
                        />
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal de Appeal */}
      <AppealModal
        visible={showAppealModal}
        onClose={() => setShowAppealModal(false)}
        onSuccess={() => {
          fetchShopSettings();
        }}
      />

      <SellerVerificationFormModal
        key={
          verificationFormData
            ? `${verificationFormData.status}-${(verificationFormData.fieldsToReview ?? []).join(',')}`
            : 'new'
        }
        visible={showVerificationForm}
        onClose={() => setShowVerificationForm(false)}
        onSuccess={handleVerificationSuccess}
        existingData={verificationFormData}
      />

      {/* Modal de Configurações da Loja */}
      <ShopSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSettingsUpdated={handleSettingsUpdated}
        initialSettings={shopSettings}
        onNavigateToPlans={() => {
          setActiveTab('plans');
        }}
      />

      <ProductCheckoutModal
        visible={showCheckoutModal}
        product={checkoutProduct}
        walletBalance={user?.wallet?.balance ?? 0}
        onClose={() => {
          setShowCheckoutModal(false);
          setCheckoutProduct(null);
        }}
        onSuccess={async () => {
          await refreshUser();
          fetchProducts();
        }}
      />

      {/* Wizard de Criação de Produto */}
      <ProductCreationWizard
        key={editingProduct?._id || 'new-product'}
        visible={showCreateProductModal}
        onClose={() => {
          setShowCreateProductModal(false);
          setEditingProduct(null);
        }}
        onSave={async (wizardData) => {
          try {
            // Preparar dados para o backend
            // Buscar o primeiro link válido (com URL preenchida e com mais de 3 caracteres)
            const validLink = wizardData.links && wizardData.links.length > 0
              ? wizardData.links.find((link: any) => 
                  link.url && 
                  typeof link.url === 'string' && 
                  link.url.trim() !== '' &&
                  link.url.trim().length > 3
                )
              : null;
            
            const downloadUrl = validLink ? validLink.url.trim() : '';
            const fileName = validLink ? (validLink.title || '').trim() : '';

            const productData = {
              ...wizardData,
              type: 'DIGITAL_PACK',
              subscriptionPlanId:
                wizardData.paymentMode === 'ASSINATURA' ? wizardData.subscriptionPlanId : undefined,
              subscriptionScope: wizardData.paymentMode === 'ASSINATURA' ? 'LOJA' : undefined,
              price: wizardData.paymentMode === 'ASSINATURA' ? 0 : wizardData.price,
              digital: {
                downloadUrl,
                fileName,
                allowDownload: wizardData.allowDownload,
                fileSize: 0,
                files: wizardData.files || [],
              },
            };

            const normalizeCategoryId = (v: any) => {
              if (v == null || v === '') return '';
              if (typeof v === 'object' && v !== null && '_id' in v) {
                return String((v as { _id: string })._id);
              }
              return String(v);
            };

            /** PATCH valida com schema parcial: não enviar campos só do wizard nem type inválido no enum legado. */
            const toUpdatePayload = (data: typeof productData) => {
              const {
                links: _l,
                modules: _m,
                files: _f,
                contentValidations: _c,
                type: _t,
                ...rest
              } = data as any;
              return rest;
            };

            // Se há arquivos, criar produto primeiro para obter ID
            let productId = editingProduct?._id;

            if (wizardData.files && wizardData.files.length > 0 && !productId) {
              // Criar produto temporário
              const tempPayload = {
                ...productData,
                digital: {
                  ...productData.digital,
                  files: [],
                },
              };

              const createResponse = await productsApi.createProduct(tempPayload);
              if (createResponse.success && createResponse.data) {
                productId = createResponse.data._id;
              } else {
                throw new Error('Erro ao criar produto');
              }

              // Upload dos arquivos - sempre usando presigned URL e upload direto ao S3
              for (let i = 0; i < wizardData.files.length; i++) {
                const fileData = wizardData.files[i];
                if (fileData.file || fileData.uri) {
                  const fileUri = fileData.uri || fileData.file.uri;
                  const fileType = fileData.type || fileData.file.mimeType || 'application/octet-stream';
                  const fileName = fileData.name || fileData.file.fileName || 'arquivo';
                  const fileSize = fileData.size || fileData.file.size || 0;

                  try {
                    // 1. Obter presigned URL (backend valida tudo aqui)
                    const presignedResponse = await productsApi.getPresignedUploadUrl(
                      productId,
                      fileName,
                      fileType,
                      fileSize,
                      i
                    );

                    if (!presignedResponse.success || !presignedResponse.data) {
                      throw new Error(presignedResponse.message || 'Erro ao obter URL de upload');
                    }

                    // 2. Fazer upload direto para S3 usando a presigned URL
                    const fileBlob = await fetch(fileUri).then(res => res.blob());
                    
                    await axios.put(presignedResponse.data.presignedUrl, fileBlob, {
                      headers: {
                        'Content-Type': fileType,
                      },
                      timeout: 600000, // 10 minutos para uploads grandes
                      onUploadProgress: (progressEvent) => {
                        // Progresso silencioso (sem logs)
                      },
                    });

                    // 3. Registrar o arquivo no backend após upload bem-sucedido
                    await productsApi.registerFile(
                      productId,
                      presignedResponse.data.fileUrl,
                      fileName,
                      fileType,
                      fileSize,
                      fileData.customFileName,
                      fileData.description,
                      i
                    );
                  } catch (uploadError: any) {
                    console.error('[MyShopScreen] Erro no upload do arquivo:', uploadError);
                    const errorMessage = uploadError.response?.data?.message || uploadError.message || 'Erro ao fazer upload do arquivo';
                    showToast.error('Erro', errorMessage);
                    throw uploadError;
                  }
                }
              }
            } else if (!productId) {
              // Criar produto sem arquivos
              await productsApi.createProduct(productData);
            } else {
              const pm = editingProduct?.paymentMode || 'UNICO';
              let patch = toUpdatePayload(productData);
              patch = {
                ...patch,
                paymentMode: pm,
                subscriptionPlanId:
                  pm === 'ASSINATURA' ? editingProduct?.subscriptionPlanId : undefined,
                subscriptionScope:
                  pm === 'ASSINATURA'
                    ? editingProduct?.subscriptionScope || 'LOJA'
                    : undefined,
                price: pm === 'ASSINATURA' ? 0 : wizardData.price,
              };
              if (editingProduct?.status === 'APPROVED') {
                patch = {
                  ...patch,
                  categoryId: normalizeCategoryId(editingProduct.categoryId),
                };
              }
              await productsApi.updateProduct(productId, patch);
            }

            showToast.success(
              'Sucesso',
              editingProduct?._id ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!'
            );
            fetchProducts();
            setShowCreateProductModal(false);
            setEditingProduct(null);
          } catch (error: any) {
            console.error('[MyShopScreen] Erro ao salvar produto:', error);
            showToast.error(
              'Erro',
              error.response?.data?.message || 'Erro ao salvar produto'
            );
          }
        }}
        product={editingProduct}
      />
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
  previewBanner: {
    backgroundColor: COLORS.states.info,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  previewBannerContent: {
    gap: 8,
  },
  previewBannerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  previewBannerText: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  previewBannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  previewBannerInfoText: {
    fontSize: 12,
    color: '#ffffff',
    flex: 1,
  },
  previewBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  previewBannerButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    minHeight: 32, // Altura mínima para alinhar com o ícone
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    lineHeight: 32,
  },
  titleUsername: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary.main,
    lineHeight: 32,
  },
  settingsButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    paddingHorizontal: 16,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.secondary.main,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  tabTextActive: {
    color: COLORS.secondary.main,
  },
  tabContent: {
    padding: 16,
  },
  productsContent: {
    gap: 16,
  },
  emptyProductsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyProductsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyProductsEmoji: {
    fontSize: 40,
  },
  emptyProductsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyProductsText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  createProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.secondary.main,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createProductButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  newProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.secondary.main,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  newProductButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  newProductButtonDisabled: {
    opacity: 0.5,
  },
  createProductButtonDisabled: {
    opacity: 0.5,
  },
  productsList: {
    paddingBottom: 24,
  },
  shopDisabledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.states.warning + '18',
    borderWidth: 1,
    borderColor: COLORS.states.warning + '55',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  shopDisabledTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  shopDisabledText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  shopDisabledBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  shopDisabledBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondary.main,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text.primary,
    backgroundColor: COLORS.background.paper,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  categoriesScroll: {
    marginBottom: 12,
  },
  categoriesContent: {
    gap: 8,
    paddingRight: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background.tertiary,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: COLORS.secondary.main,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  catChipTextActive: {
    color: '#ffffff',
  },
  placeholderContent: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  pendingAlert: {
    backgroundColor: COLORS.primary.main + '15',
    borderWidth: 1,
    borderColor: COLORS.primary.main + '40',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  pendingAlertContent: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  pendingAlertText: {
    flex: 1,
    gap: 4,
  },
  pendingAlertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary.main,
  },
  pendingAlertDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
});

