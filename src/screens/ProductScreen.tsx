import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { COLORS } from '../theme/colors';
import { showToast } from '../components/CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import { productsApi } from '../services/api';
import { getImageUrl } from '../utils/image';

const { width } = Dimensions.get('window');

interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  coverImage?: string | null;
  categoryId?: {
    _id: string;
    name: string;
    color: string;
  } | null;
  type: string;
  paymentMode: string;
  userId: {
    _id: string;
    username: string;
  };
  digital?: {
    downloadUrl?: string | null;
    fileName?: string | null;
    allowDownload?: boolean;
    files?: Array<{
      url: string;
      fileName: string;
      customFileName?: string | null;
      description?: string | null;
      fileSize: number;
      fileType: 'image' | 'video' | 'document';
      thumbnail?: string | null;
      order: number;
    }>;
  };
  purchaseStatus?: {
    hasPurchased: boolean;
    canPurchase: boolean;
  } | null;
}

type ProductRouteParams = {
  productId: string;
};

type ProductRouteProp = RouteProp<{ Product: ProductRouteParams }, 'Product'>;

export function ProductScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<ProductRouteProp>();
  const { user } = useAuth();
  const { productId } = route.params;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPurchaseStatus, setLoadingPurchaseStatus] = useState(true);

  useEffect(() => {
    if (productId) {
      fetchProductData();
    }
  }, [productId]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      const response = await productsApi.getProduct(productId);

      // Se retornar 403, o backend já validou que não tem acesso
      if (response.success === false && response.message?.includes('acesso')) {
        showToast.error('Erro', 'Você não tem acesso a este produto');
        navigation.goBack();
        return;
      }

      if (response.success && response.data) {
        const productData = response.data;
        
        // Verificar se é dono antes de definir o produto
        const isOwner = user?.id === productData.userId?._id || user?.id === productData.userId;
        
        // Se não é dono e não está logado, não pode ver o conteúdo
        if (!isOwner && !user) {
          showToast.error('Erro', 'Você precisa estar logado para acessar este produto');
          navigation.goBack();
          return;
        }

        setProduct(productData);

        // Verificar status de compra se o usuário estiver logado
        if (user) {
          await fetchPurchaseStatus();
        } else {
          setLoadingPurchaseStatus(false);
        }
      } else {
        showToast.error('Erro', 'Produto não encontrado');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('[ProductScreen] Erro ao carregar produto:', error);
      if (error.response?.status === 403) {
        showToast.error('Erro', 'Você não tem acesso a este produto');
        navigation.goBack();
      } else if (error.response?.status === 404) {
        showToast.error('Erro', 'Produto não encontrado');
        navigation.goBack();
      } else {
        showToast.error('Erro', 'Erro ao carregar produto');
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseStatus = async () => {
    try {
      setLoadingPurchaseStatus(true);
      const response = await productsApi.getPurchaseStatus(productId);

      if (response.success && response.data) {
        setProduct((prev) =>
          prev ? { ...prev, purchaseStatus: response.data } : null
        );
      }
    } catch (error) {
      console.error('[ProductScreen] Erro ao verificar status de compra:', error);
    } finally {
      setLoadingPurchaseStatus(false);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        showToast.error('Erro', 'Não foi possível abrir o link');
      }
    } catch (error) {
      console.error('[ProductScreen] Erro ao abrir link:', error);
      showToast.error('Erro', 'Não foi possível abrir o link');
    }
  };

  const handleViewImage = (url: string, fileName: string) => {
    // TODO: Implementar visualizador de imagem
    Alert.alert('Visualizar Imagem', fileName, [
      { text: 'Abrir no navegador', onPress: () => handleOpenLink(url) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleViewVideo = (url: string, fileName: string) => {
    // TODO: Implementar visualizador de vídeo
    Alert.alert('Visualizar Vídeo', fileName, [
      { text: 'Abrir no navegador', onPress: () => handleOpenLink(url) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.secondary.main} />
          <Text style={styles.loadingText}>Carregando produto...</Text>
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Produto não encontrado</Text>
        </View>
      </View>
    );
  }

  // Verificar se é dono (userId pode ser objeto ou string)
  const productUserId = typeof product.userId === 'object' ? product.userId._id : product.userId;
  const isOwner = user?.id === productUserId;
  const hasPurchased = product.purchaseStatus?.hasPurchased || false;
  const canViewContent = hasPurchased || isOwner || user?.accountType === 'admin';

  // Separar conteúdo por tipo
  const mainLink = product.digital?.downloadUrl && product.digital.downloadUrl.trim() !== ''
    ? {
        url: product.digital.downloadUrl,
        fileName: product.digital.fileName || 'Link Principal',
        customFileName: product.digital.fileName || 'Link Principal',
      }
    : null;

  const files = product.digital?.files || [];
  const links = files.filter((f) => f.fileType === 'document' && f.url && f.url.startsWith('http'));
  const images = files.filter((f) => f.fileType === 'image');
  const videos = files.filter((f) => f.fileType === 'video');
  const documents = files.filter(
    (f) => f.fileType === 'document' && f.url && !f.url.startsWith('http')
  );

  // Verificar se há conteúdo (links também contam como conteúdo)
  const hasContent = mainLink !== null || links.length > 0 || images.length > 0 || videos.length > 0 || documents.length > 0;

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header do Produto */}
        <View style={styles.header}>
          {product.coverImage && (
            <Image
              source={{ uri: getImageUrl(product.coverImage) }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{product.title}</Text>
            {product.description && (
              <Text style={styles.description}>{product.description}</Text>
            )}
            {product.categoryId && (
              <View style={styles.category}>
                <Text style={styles.categoryText}>{product.categoryId.name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Aviso se não tem acesso */}
        {!canViewContent && (
          <View style={styles.accessWarning}>
            <Ionicons name="lock-closed-outline" size={24} color={COLORS.states.warning} />
            <Text style={styles.accessWarningText}>
              Você precisa comprar este produto para acessar o conteúdo
            </Text>
          </View>
        )}

        {/* Links - Primeira Sessão (sempre primeiro) */}
        {(mainLink || links.length > 0) && canViewContent && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="link-outline" size={20} color={COLORS.text.primary} />
              <Text style={styles.sectionTitle}>
                Links {mainLink && links.length > 0 ? `(${1 + links.length})` : mainLink ? '(1)' : `(${links.length})`}
              </Text>
            </View>
            
            {/* Link Principal primeiro */}
            {mainLink && (
              <TouchableOpacity
                style={styles.linkCard}
                onPress={() => handleOpenLink(mainLink.url)}
              >
                <Ionicons name="open-outline" size={24} color={COLORS.primary.main} />
                <View style={styles.linkInfo}>
                  <Text style={styles.linkTitle}>{mainLink.customFileName}</Text>
                  <Text style={styles.linkUrl} numberOfLines={1}>
                    {mainLink.url}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            )}

            {/* Links Externos */}
            {links.map((link, index) => (
              <TouchableOpacity
                key={index}
                style={styles.linkCard}
                onPress={() => handleOpenLink(link.url)}
              >
                <Ionicons name="open-outline" size={24} color={COLORS.primary.main} />
                <View style={styles.linkInfo}>
                  <Text style={styles.linkTitle}>
                    {link.customFileName || link.fileName}
                  </Text>
                  {link.description && (
                    <Text style={styles.linkDescription}>{link.description}</Text>
                  )}
                  <Text style={styles.linkUrl} numberOfLines={1}>
                    {link.url}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Imagens */}
        {images.length > 0 && canViewContent && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images-outline" size={20} color={COLORS.text.primary} />
              <Text style={styles.sectionTitle}>Imagens ({images.length})</Text>
            </View>
            <View style={styles.mediaGrid}>
              {images.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.mediaCard}
                  onPress={() => handleViewImage(image.url, image.customFileName || image.fileName)}
                >
                  {image.thumbnail ? (
                    <Image
                      source={{ uri: getImageUrl(image.thumbnail) }}
                      style={styles.mediaThumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.mediaPlaceholder}>
                      <Ionicons name="image-outline" size={32} color={COLORS.text.secondary} />
                    </View>
                  )}
                  <Text style={styles.mediaTitle} numberOfLines={2}>
                    {image.customFileName || image.fileName}
                  </Text>
                  {image.description && (
                    <Text style={styles.mediaDescription} numberOfLines={2}>
                      {image.description}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Vídeos */}
        {videos.length > 0 && canViewContent && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="videocam-outline" size={20} color={COLORS.text.primary} />
              <Text style={styles.sectionTitle}>Vídeos ({videos.length})</Text>
            </View>
            <View style={styles.mediaGrid}>
              {videos.map((video, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.mediaCard}
                  onPress={() => handleViewVideo(video.url, video.customFileName || video.fileName)}
                >
                  {video.thumbnail ? (
                    <View style={styles.videoThumbnailContainer}>
                      <Image
                        source={{ uri: getImageUrl(video.thumbnail) }}
                        style={styles.mediaThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.playOverlay}>
                        <Ionicons name="play-circle" size={48} color="#ffffff" />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.mediaPlaceholder}>
                      <Ionicons name="videocam-outline" size={32} color={COLORS.text.secondary} />
                    </View>
                  )}
                  <Text style={styles.mediaTitle} numberOfLines={2}>
                    {video.customFileName || video.fileName}
                  </Text>
                  {video.description && (
                    <Text style={styles.mediaDescription} numberOfLines={2}>
                      {video.description}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Documentos */}
        {documents.length > 0 && canViewContent && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.text.primary} />
              <Text style={styles.sectionTitle}>Documentos ({documents.length})</Text>
            </View>
            {documents.map((doc, index) => (
              <TouchableOpacity
                key={index}
                style={styles.documentCard}
                onPress={() => handleOpenLink(doc.url)}
              >
                <Ionicons name="document-outline" size={24} color={COLORS.primary.main} />
                <View style={styles.documentInfo}>
                  <Text style={styles.documentTitle}>
                    {doc.customFileName || doc.fileName}
                  </Text>
                  {doc.description && (
                    <Text style={styles.documentDescription}>{doc.description}</Text>
                  )}
                  <Text style={styles.documentSize}>{formatFileSize(doc.fileSize)}</Text>
                </View>
                <Ionicons name="download-outline" size={20} color={COLORS.text.secondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Mensagem quando não há conteúdo */}
        {canViewContent && !hasContent && (
          <View style={styles.emptyContent}>
            <Ionicons name="cube-outline" size={48} color={COLORS.text.secondary} />
            <Text style={styles.emptyText}>Este produto ainda não possui conteúdo</Text>
          </View>
        )}
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.states.error,
  },
  header: {
    backgroundColor: COLORS.background.paper,
    marginBottom: 12,
  },
  coverImage: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.background.tertiary,
  },
  headerInfo: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  category: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.background.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  accessWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.background.paper,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.states.warning,
  },
  accessWarningText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  section: {
    backgroundColor: COLORS.background.paper,
    marginBottom: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    marginBottom: 8,
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaCard: {
    width: (width - 64) / 2,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  mediaThumbnail: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.background.default,
  },
  videoThumbnailContainer: {
    position: 'relative',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  mediaPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.background.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    padding: 8,
  },
  mediaDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  documentSize: {
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    margin: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 16,
    textAlign: 'center',
  },
});

