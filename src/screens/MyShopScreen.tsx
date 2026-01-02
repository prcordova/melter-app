import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { COLORS } from '../theme/colors';
import { showToast } from '../components/CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import { shopApi, sellerVerificationApi, userApi, productsApi } from '../services/api';
import { SellerVerificationStatusCard } from '../components/shop/SellerVerificationStatusCard';
import { AppealModal } from '../components/shop/AppealModal';
import { ProductCreationWizard } from '../components/shop/ProductCreationWizard';
import { ShopCard } from '../components/ShopCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';
import axios from 'axios';

type ShopVisibility = 'public' | 'preview' | 'friends' | 'followers';
type ActiveTab = 'products' | 'analytics' | 'community' | 'plans';

interface SellerVerification {
  _id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'disabled' | 'needs_review' | 'appeal' | null;
  submittedAt?: string;
  rejectionReason?: string;
  needsReviewReason?: string;
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
  const { user, loading: authLoading } = useAuth();

  // Estados principais
  const [loading, setLoading] = useState(true);
  const [shopOwner, setShopOwner] = useState<any>(null);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('products');
  const [isPreview, setIsPreview] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

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

  // Carregar dados da loja
  useEffect(() => {
    if (authLoading || !username) return;

    if (!dataLoaded) {
      setDataLoaded(true);
      fetchShopData();
      if (isOwner) {
        fetchShopSettings();
      } else {
        // Se não é dono, buscar produtos da loja para exibir
        fetchProducts();
      }
    }
  }, [authLoading, username, isOwner, dataLoaded]);

  // Verificar se deve abrir modais de produto ou plano (quando não é dono)
  useEffect(() => {
    if (!dataLoaded || loading || !products.length) return;

    const openProductId = route.params?.openProduct;
    const openPlanId = route.params?.openPlan;

    if (openProductId) {
      // Buscar o produto e abrir modal de compra
      const product = products.find((p: any) => p._id === openProductId);
      if (product) {
        // TODO: Abrir modal de compra
        showToast.info('Produto', `Abrindo modal de compra para ${product.title}`);
      }
    } else if (openPlanId) {
      // TODO: Abrir modal de assinatura do plano
      showToast.info('Plano', `Abrindo modal de assinatura do plano ${openPlanId}`);
    }
  }, [dataLoaded, loading, products, route.params?.openProduct, route.params?.openPlan]);

  // Buscar configurações da loja (apenas para dono)
  const fetchShopSettings = async () => {
    try {
      const response = await shopApi.getSettings();

      if (response.success && response.data) {
        setShopSettings(response.data);
        // Se a loja está aprovada, buscar produtos
        if (response.data.sellerVerification?.status === 'approved') {
          fetchProducts();
        }
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
      const response = await productsApi.getProducts({
        username: username,
        // Se for dono, buscar todos (ativos e inativos). Se não for, apenas ativos
        isActive: isOwner ? undefined : true,
      });

      if (response.success) {
        const productsData = Array.isArray(response.data) ? response.data : [];
        setProducts(productsData);
      } else {
        setProducts([]);
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
          // Verificar se o usuário segue o dono da loja
          try {
            const followersResponse = await userApi.getFollowers(username);
            if (followersResponse.success) {
              const followers = followersResponse.data || [];
              const isFollower = followers.some(
                (follower: any) => (follower?._id === user?.id) || (follower?.id === user?.id)
              );

              if (!isFollower) {
                showToast.error('Erro', 'Esta loja é restrita apenas para seguidores');
                navigation.goBack();
                return;
              }
            }
          } catch (error) {
            console.error('[MyShopScreen] Erro ao verificar seguidores:', error);
            showToast.error('Erro', 'Erro ao verificar permissões de acesso');
            navigation.goBack();
            return;
          }
        }

        if (shopVisibility === 'friends') {
          // Verificar se o usuário é amigo do dono da loja
          try {
            const friendsResponse = await userApi.getMyFriends();

            if (friendsResponse.success) {
              // A API retorna um array direto ou um objeto com friends
              const friends = Array.isArray(friendsResponse.data)
                ? friendsResponse.data
                : friendsResponse.data?.friends || [];
              
              const isFriend = friends.some(
                (friend: any) =>
                  (friend?._id === owner?.id) ||
                  (friend?._id === owner?._id) ||
                  (friend?.id === owner?.id) ||
                  (friend?.id === owner?._id)
              );

              if (!isFriend) {
                showToast.error('Erro', 'Esta loja é restrita apenas para amigos');
                navigation.goBack();
                return;
              }
            }
          } catch (error) {
            console.error('[MyShopScreen] Erro ao verificar amigos:', error);
            showToast.error('Erro', 'Erro ao verificar permissões de acesso');
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
    // TODO: Implementar modal de configurações
    showToast.info('Configurações', 'Modal de configurações em desenvolvimento');
  };

  // Handler para mudar tab
  const handleTabChange = (tab: ActiveTab) => {
    // Verificar acesso à tab Analytics
    if (tab === 'analytics') {
      // TODO: Verificar se tem plano PRO
      // Por enquanto, apenas permitir se for admin
      if (!isAdmin) {
        showToast.info('Analytics', 'Analytics disponível apenas para plano PRO');
        // TODO: Navegar para tela de planos
        return;
      }
    }

    setActiveTab(tab);
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

  const sellerVerification = shopSettings?.sellerVerification;
  // Se não é dono, tentar verificar se a loja está aprovada através dos produtos ou buscar settings
  const [visitorShopApproved, setVisitorShopApproved] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (!isOwner && shopOwner) {
      // Tentar verificar se a loja está aprovada buscando settings
      shopApi.getSettings().then((response) => {
        if (response.success && response.data) {
          const verification = response.data.sellerVerification;
          setVisitorShopApproved(verification?.status === 'approved');
        }
      }).catch(() => {
        // Se falhar, assumir que não está aprovada se não houver produtos
        setVisitorShopApproved(products.length > 0);
      });
    }
  }, [isOwner, shopOwner, products.length]);

  const isShopApproved = isOwner 
    ? sellerVerification?.status === 'approved' 
    : visitorShopApproved !== null 
      ? visitorShopApproved 
      : products.length > 0; // Se não souber, assumir aprovada se tiver produtos
  const showTabs = (isOwner && isShopApproved) || isAdmin || (!isOwner && isShopApproved);

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
          <Text style={styles.title}>Loja de {username}</Text>
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

        {/* Sistema de Tabs (apenas para dono aprovado ou admin) */}
        {showTabs && (
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'products' && styles.tabActive]}
                onPress={() => handleTabChange('products')}
              >
                <Ionicons
                  name="storefront-outline"
                  size={18}
                  color={activeTab === 'products' ? COLORS.secondary.main : COLORS.text.secondary}
                />
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
                <Ionicons
                  name="analytics-outline"
                  size={18}
                  color={activeTab === 'analytics' ? COLORS.secondary.main : COLORS.text.secondary}
                />
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
                <Ionicons
                  name="chatbubbles-outline"
                  size={18}
                  color={activeTab === 'community' ? COLORS.secondary.main : COLORS.text.secondary}
                />
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
                  <Ionicons
                    name="card-outline"
                    size={18}
                    color={activeTab === 'plans' ? COLORS.secondary.main : COLORS.text.secondary}
                  />
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

        {/* Conteúdo das Tabs */}
        {showTabs ? (
          <View style={styles.tabContent}>
            {activeTab === 'products' && (
              <View style={styles.productsContent}>
                {/* Card de Status da Verificação (apenas para dono não aprovado) */}
                {isOwner && sellerVerification && sellerVerification.status !== 'approved' && (
                  <SellerVerificationStatusCard
                    sellerVerification={sellerVerification}
                    onOpenForm={() => {
                      // Buscar dados completos antes de abrir o formulário
                      fetchVerificationData();
                      setShowVerificationForm(true);
                    }}
                    onOpenAppeal={() => setShowAppealModal(true)}
                    onRefresh={fetchShopSettings}
                  />
                )}

                {/* Conteúdo quando loja está aprovada */}
                {isOwner && isShopApproved && (
                  <>
                    {loadingProducts ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.secondary.main} />
                        <Text style={styles.loadingText}>Carregando produtos...</Text>
                      </View>
                    ) : products.length === 0 ? (
                      // Sem produtos - mostrar botão "Criar Primeiro Produto"
                      <View style={styles.emptyProductsContainer}>
                        <View style={styles.emptyProductsIcon}>
                          <Text style={styles.emptyProductsEmoji}>📦</Text>
                        </View>
                        <Text style={styles.emptyProductsTitle}>
                          Esta loja ainda não tem produtos
                        </Text>
                        <Text style={styles.emptyProductsText}>
                          Comece criando seu primeiro produto!
                        </Text>
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
                      </View>
                    ) : (
                      // Há produtos - mostrar botão "Novo Produto" e lista
                      <>
                        <View style={styles.productsHeader}>
                          <Text style={styles.productsCount}>
                            {products.length} {products.length === 1 ? 'produto' : 'produtos'}
                          </Text>
                          <TouchableOpacity
                            style={styles.newProductButton}
                            onPress={() => {
                              setEditingProduct(null);
                              setShowCreateProductModal(true);
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                            <Text style={styles.newProductButtonText}>Novo Produto</Text>
                          </TouchableOpacity>
                        </View>
                        {/* Lista de Produtos */}
                        <ScrollView 
                          style={styles.productsList}
                          showsVerticalScrollIndicator={false}
                        >
                          {products.map((product) => (
                            <ShopCard
                              key={product._id}
                              product={product}
                              onPress={() => {
                                // TODO: Navegar para detalhes do produto ou abrir modal de edição
                                showToast.info('Produto', `Abrindo ${product.title}`);
                              }}
                            />
                          ))}
                        </ScrollView>
                      </>
                    )}
                  </>
                )}

                {/* Mostrar produtos para visitantes (não-donos) quando loja está aprovada */}
                {!isOwner && isShopApproved && (
                  <>
                    {loadingProducts ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.secondary.main} />
                        <Text style={styles.loadingText}>Carregando produtos...</Text>
                      </View>
                    ) : products.length === 0 ? (
                      <View style={styles.emptyProductsContainer}>
                        <Text style={styles.emptyProductsTitle}>
                          Esta loja ainda não tem produtos
                        </Text>
                      </View>
                    ) : (
                      <ScrollView 
                        style={styles.productsList}
                        showsVerticalScrollIndicator={false}
                      >
                        {products.map((product: any) => (
                          <ShopCard
                            key={product._id}
                            product={product}
                            onPress={async () => {
                              // Verificar se já comprou
                              if (user) {
                                try {
                                  const purchaseStatus = await productsApi.getPurchaseStatus(product._id);
                                  if (purchaseStatus.success && purchaseStatus.data) {
                                    const hasPurchased = purchaseStatus.data.hasPurchased || false;
                                    const hasAccessViaPlan = purchaseStatus.data.accessVia === 'SUBSCRIPTION_PLAN';
                                    
                                    if (hasPurchased || hasAccessViaPlan) {
                                      // TODO: Navegar para tela do produto
                                      showToast.info('Produto', `Abrindo ${product.title}`);
                                      return;
                                    }
                                  }
                                } catch (error) {
                                  console.error('[MyShopScreen] Erro ao verificar compra:', error);
                                }
                              }

                              // Se é produto de assinatura, abrir modal de assinatura
                              const subscriptionPlanId = product.subscriptionPlanId || product.subscriptionPlan?._id;
                              if (product.paymentMode === 'ASSINATURA' && subscriptionPlanId) {
                                // TODO: Abrir modal de assinatura
                                showToast.info('Assinatura', `Abrindo modal de assinatura`);
                              } else {
                                // Produto único, abrir modal de compra
                                // TODO: Abrir modal de compra
                                showToast.info('Compra', `Abrindo modal de compra para ${product.title}`);
                              }
                            }}
                          />
                        ))}
                      </ScrollView>
                    )}
                  </>
                )}

                {/* Placeholder quando não está aprovado e não é dono */}
                {!isOwner && !isShopApproved && (
                  <View style={styles.placeholderContent}>
                    <Text style={styles.placeholderText}>Loja em desenvolvimento</Text>
                    <Text style={styles.placeholderSubtext}>Esta loja ainda não está disponível</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'analytics' && (
              <View style={styles.placeholderContent}>
                <Text style={styles.placeholderText}>Tab Analytics</Text>
                <Text style={styles.placeholderSubtext}>Em desenvolvimento...</Text>
              </View>
            )}

            {activeTab === 'community' && (
              <View style={styles.placeholderContent}>
                <Text style={styles.placeholderText}>Tab Comunidade</Text>
                <Text style={styles.placeholderSubtext}>Em desenvolvimento...</Text>
              </View>
            )}

            {activeTab === 'plans' && isOwner && (
              <View style={styles.placeholderContent}>
                <Text style={styles.placeholderText}>Tab Planos</Text>
                <Text style={styles.placeholderSubtext}>Em desenvolvimento...</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            {/* Card de Status da Verificação (quando não há tabs - não aprovado) */}
            {isOwner && (
              <SellerVerificationStatusCard
                sellerVerification={sellerVerification || null}
                onOpenForm={async () => {
                  await fetchVerificationData();
                  setShowVerificationForm(true);
                }}
                onOpenAppeal={() => setShowAppealModal(true)}
                onRefresh={fetchShopSettings}
              />
            )}
            <View style={styles.placeholderContent}>
              <Text style={styles.placeholderText}>Conteúdo da Loja</Text>
              <Text style={styles.placeholderSubtext}>Em desenvolvimento...</Text>
            </View>
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

      {/* Modal de Formulário de Verificação (será implementado) */}
      {/* TODO: Implementar SellerVerificationFormModal */}

      {/* Wizard de Criação de Produto */}
      <ProductCreationWizard
        visible={showCreateProductModal}
        onClose={() => {
          setShowCreateProductModal(false);
          setEditingProduct(null);
        }}
        onSave={async (wizardData) => {
          try {
            // Preparar dados para o backend
            const productData = {
              ...wizardData,
              type: 'DIGITAL_PACK',
              subscriptionPlanId:
                wizardData.paymentMode === 'ASSINATURA' ? wizardData.subscriptionPlanId : undefined,
              subscriptionScope: wizardData.paymentMode === 'ASSINATURA' ? 'LOJA' : undefined,
              price: wizardData.paymentMode === 'ASSINATURA' ? 0 : wizardData.price,
              digital: {
                downloadUrl:
                  wizardData.links && wizardData.links.length > 0 ? wizardData.links[0].url : '',
                fileName:
                  wizardData.links && wizardData.links.length > 0
                    ? wizardData.links[0].title
                    : '',
                allowDownload: wizardData.allowDownload,
                fileSize: 0,
                files: wizardData.files || [],
              },
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

              // Upload dos arquivos
              const token = await AsyncStorage.getItem('token');
              for (let i = 0; i < wizardData.files.length; i++) {
                const fileData = wizardData.files[i];
                if (fileData.file || fileData.uri) {
                  const formData = new FormData();
                  formData.append('file', {
                    uri: fileData.uri || fileData.file.uri,
                    type: fileData.type || fileData.file.mimeType || 'application/octet-stream',
                    name: fileData.name || fileData.file.fileName || 'arquivo',
                  } as any);
                  formData.append('productId', productId);
                  formData.append('order', i.toString());

                  await axios.post(`${API_CONFIG.BASE_URL}/api/products/${productId}/files`, formData, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'multipart/form-data',
                    },
                    timeout: 60000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                  });
                }
              }
            } else if (!productId) {
              // Criar produto sem arquivos
              await productsApi.createProduct(productData);
            } else {
              // Editar produto existente
              await productsApi.updateProduct(productId, productData);
            }

            showToast.success('Sucesso', 'Produto criado com sucesso!');
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    flex: 1,
  },
  settingsButton: {
    padding: 8,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.secondary.main,
  },
  tabText: {
    fontSize: 14,
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
  productsList: {
    flex: 1,
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
});

