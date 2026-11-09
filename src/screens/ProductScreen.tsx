import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppVideo, type AppVideoHandle } from '../components/AppVideo';
import { CustomModal } from '../components/CustomModal';
import type { ProductFileProgress, ProductModule } from '../services/products';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';
import { showToast } from '../components/CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import { productsApi } from '../services/api';
import { BackArrow } from '../components/BackArrow';
import { getImageUrl } from '../utils/image';
import { isExternalProductLinkFile } from '../lib/product-external-links';
import * as ScreenCapture from 'expo-screen-capture';
import ImageViewing from 'react-native-image-viewing';

const { width } = Dimensions.get('window');

/** URLs assinadas valem 15 min no servidor; renova antes de abrir mídia depois disso. */
const SIGNED_URL_SAFE_MS = 12 * 60 * 1000;

type ProductDigitalFile = NonNullable<NonNullable<Product['digital']>['files']>[number];

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
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_CHANGES' | 'INACTIVE';
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
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { productId } = route.params;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPurchaseStatus, setLoadingPurchaseStatus] = useState(true);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [imageViewerImages, setImageViewerImages] = useState<Array<{ uri: string }>>([]);
  const [videoViewer, setVideoViewer] = useState<{ uri: string; title: string; index: number } | null>(null);
  const videoRetriedRef = useRef(false);
  const videoRef = useRef<AppVideoHandle>(null);
  const signedAtRef = useRef(0);
  const insets = useSafeAreaInsets();
  const [progressByFile, setProgressByFile] = useState<Record<string, ProductFileProgress>>({});
  const [modules, setModules] = useState<ProductModule[]>([]);

  const ownerId = product
    ? typeof product.userId === 'object' ? product.userId?._id : product.userId
    : null;
  const hasMediaAccess =
    Boolean(product && user) &&
    (Boolean(product?.purchaseStatus?.hasPurchased) ||
      user?.id === ownerId ||
      user?.accountType === 'admin');

  useEffect(() => {
    if (!hasMediaAccess) return;
    let cancelled = false;
    (async () => {
      const [progressRes, modulesRes] = await Promise.all([
        productsApi.getProgress(productId).catch(() => null),
        productsApi.getModules(productId).catch(() => null),
      ]);
      if (cancelled) return;
      if (progressRes?.success && progressRes.data) {
        setProgressByFile(
          Object.fromEntries(progressRes.data.progress.map((p) => [String(p.fileId), p]))
        );
      }
      if (modulesRes?.success && modulesRes.data) {
        setModules(modulesRes.data.modules || []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasMediaAccess, productId]);

  const trackView = (fileIndex: number) => {
    if (!user) return;
    void productsApi.trackFileView(productId, fileIndex).catch(() => undefined);
  };

  const persistProgress = (fileIndex: number, currentTime: number, duration: number, isCompleted: boolean) => {
    if (!user || !(duration > 0)) return;
    const entry: ProductFileProgress = {
      fileId: String(fileIndex),
      currentTime: Math.max(0, Math.min(currentTime, duration)),
      duration,
      isCompleted,
    };
    setProgressByFile((prev) => ({ ...prev, [entry.fileId]: entry }));
    void productsApi.saveProgress(productId, entry).catch(() => undefined);
  };

  const closeVideoViewer = () => {
    const viewer = videoViewer;
    const player = videoRef.current;
    if (viewer && player) {
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      const alreadyCompleted = progressByFile[String(viewer.index)]?.isCompleted ?? false;
      persistProgress(
        viewer.index,
        currentTime,
        duration,
        alreadyCompleted || (duration > 0 && currentTime / duration >= 0.95)
      );
    }
    setVideoViewer(null);
  };

  useEffect(() => {
    if (productId) {
      fetchProductData();
    }
  }, [productId]);

  // Proteção contra prints e gravação de tela
  useEffect(() => {
    let isMounted = true;
    
    const enableProtection = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (error) {
        console.warn('[ProductScreen] Erro ao ativar proteção de tela:', error);
      }
    };

    enableProtection();

    return () => {
      isMounted = false;
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, []);

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
        signedAtRef.current = Date.now();

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

  /** `digital.files` com URLs assinadas válidas (renova via `media/sign` quando necessário). */
  const getFreshFiles = async (force = false): Promise<ProductDigitalFile[]> => {
    const current = product?.digital?.files || [];
    if (!force && Date.now() - signedAtRef.current < SIGNED_URL_SAFE_MS) return current;
    try {
      const res = await productsApi.signMedia(productId);
      if (!res.success || !res.data) return current;
      const byIndex = new Map(res.data.files.map((f) => [f.index, f]));
      const next = current.map((f, i) => {
        const signed = byIndex.get(i);
        return signed
          ? { ...f, url: signed.url || f.url, thumbnail: signed.thumbnail ?? f.thumbnail }
          : f;
      });
      signedAtRef.current = Date.now();
      setProduct((prev) =>
        prev ? { ...prev, digital: { ...prev.digital, files: next } } : prev
      );
      return next;
    } catch (error) {
      console.error('[ProductScreen] Erro ao renovar URLs da mídia:', error);
      return current;
    }
  };

  const handleViewImage = async (index: number, imageIndices: number[]) => {
    const fresh = await getFreshFiles();
    if (imageIndices[index] !== undefined) trackView(imageIndices[index]);
    const allImages = imageIndices.map((i) => fresh[i]).filter(Boolean);
    const imageUris = allImages
      .map(img => {
        const imageUrl = getImageUrl(img.url);
        return imageUrl ? { uri: imageUrl } : null;
      })
      .filter((item): item is { uri: string } => item !== null);
    
    if (imageUris.length === 0) {
      showToast.error('Erro', 'Não foi possível carregar as imagens');
      return;
    }
    
    // Ajustar o índice se necessário
    const adjustedIndex = Math.min(index, imageUris.length - 1);
    
    setImageViewerImages(imageUris);
    setImageViewerIndex(adjustedIndex);
    setImageViewerVisible(true);
  };

  const handleViewVideo = async (fileIndex: number, title: string) => {
    const fresh = await getFreshFiles();
    const uri = getImageUrl(fresh[fileIndex]?.url);
    if (!uri) {
      showToast.error('Erro', 'Não foi possível carregar o vídeo');
      return;
    }
    videoRetriedRef.current = false;
    trackView(fileIndex);
    setVideoViewer({ uri, title, index: fileIndex });
  };

  const handleVideoError = async () => {
    if (!videoViewer || videoRetriedRef.current) {
      showToast.error('Erro', 'Não foi possível reproduzir o vídeo');
      return;
    }
    videoRetriedRef.current = true;
    const fresh = await getFreshFiles(true);
    const uri = getImageUrl(fresh[videoViewer.index]?.url);
    if (uri) setVideoViewer((prev) => (prev ? { ...prev, uri } : prev));
  };

  /** Só com `digital.allowDownload` (igual ao web): abre a URL assinada recém-gerada. */
  const handleDownloadFile = async (fileIndex: number) => {
    if (!product?.digital?.allowDownload) {
      showToast.info('Download', 'O download deste arquivo não está permitido pelo vendedor');
      return;
    }
    const fresh = await getFreshFiles(true);
    const url = getImageUrl(fresh[fileIndex]?.url);
    if (!url) {
      showToast.error('Erro', 'Arquivo indisponível');
      return;
    }
    trackView(fileIndex);
    await handleOpenLink(url);
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
          <ActivityIndicator size="large" color={colors.secondary.main} />
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

  // Verificar status de aprovação
  const productStatus = product.status || 'APPROVED';
  const isPending = productStatus !== 'APPROVED';
  
  // Funções auxiliares para status
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'PENDING': return 'Em Análise';
      case 'APPROVED': return 'Aprovado';
      case 'REJECTED': return 'Rejeitado';
      case 'REQUIRES_CHANGES': return 'Alterações Necessárias';
      case 'INACTIVE': return 'Inativo';
      default: return status;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PENDING': return colors.states.warning;
      case 'APPROVED': return colors.states.success;
      case 'REJECTED': return colors.states.error;
      case 'REQUIRES_CHANGES': return colors.primary.main;
      case 'INACTIVE': return colors.text.secondary;
      default: return colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'PENDING': return 'hourglass-outline';
      case 'APPROVED': return 'checkmark-circle-outline';
      case 'REJECTED': return 'close-circle-outline';
      case 'REQUIRES_CHANGES': return 'construct-outline';
      case 'INACTIVE': return 'pause-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  // Separar conteúdo por tipo
  // Verificar downloadUrl (pode estar em digital.downloadUrl ou digital?.downloadUrl)
  const digital = product.digital || {};
  const downloadUrl = digital.downloadUrl;
  
  // Verificar se há link principal (downloadUrl não vazio e válido)
  // Aceitar URLs que não começam com http mas são válidas (adicionar http:// se necessário)
  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    // Se não começa com http, adicionar https://
    return `https://${trimmed}`;
  };

  const hasMainLink = downloadUrl && 
    typeof downloadUrl === 'string' && 
    downloadUrl.trim() !== '' && 
    downloadUrl.trim() !== 'null' && 
    downloadUrl.trim() !== 'undefined' &&
    downloadUrl.trim().length > 3; // Mínimo de 3 caracteres
  
  const mainLink = hasMainLink
    ? {
        url: normalizeUrl(downloadUrl),
        fileName: digital.fileName || 'Link Principal',
        customFileName: digital.fileName || 'Link Principal',
      }
    : null;

  const allowDownload = Boolean(product.digital?.allowDownload);
  const files = (product.digital?.files || []).map((f, serverIndex) => ({ ...f, serverIndex }));

  // Buscar links também no array files (caso o link tenha sido salvo como arquivo)
  const links = files
    .filter((f) => isExternalProductLinkFile(f))
    .map((f) => ({
      ...f,
      url: normalizeUrl(f.url),
    }));
  const moduleGroups = [...modules]
    .sort((a, b) => a.order - b.order)
    .map((m) => ({
      ...m,
      items: (m.files || [])
        .map((id) => files[Number(id)])
        .filter((f): f is (typeof files)[number] => Boolean(f) && !isExternalProductLinkFile(f)),
    }))
    .filter((m) => m.items.length > 0);
  const inModule = new Set(moduleGroups.flatMap((m) => m.items.map((f) => f.serverIndex)));
  const looseFiles = files.filter((f) => !inModule.has(f.serverIndex));

  const images = looseFiles.filter((f) => f.fileType === 'image');
  const imageIndices = images.map((f) => f.serverIndex);
  const videos = looseFiles.filter((f) => f.fileType === 'video');
  const documents = looseFiles.filter(
    (f) => f.fileType === 'document' && f.url && !isExternalProductLinkFile(f)
  );

  const getVideoProgressLabel = (fileIndex: number): string | null => {
    const p = progressByFile[String(fileIndex)];
    if (!p) return null;
    if (p.isCompleted) return 'Concluído';
    if (p.currentTime > 0 && p.duration > 0) {
      return `${Math.round((p.currentTime / p.duration) * 100)}% assistido`;
    }
    return null;
  };

  const openFile = (file: (typeof files)[number]) => {
    if (file.fileType === 'image') void handleViewImage(0, [file.serverIndex]);
    else if (file.fileType === 'video') {
      void handleViewVideo(file.serverIndex, file.customFileName || file.fileName);
    } else void handleDownloadFile(file.serverIndex);
  };

  // Verificar se há conteúdo (links também contam como conteúdo)
  const hasContent =
    mainLink !== null ||
    links.length > 0 ||
    moduleGroups.length > 0 ||
    images.length > 0 ||
    videos.length > 0 ||
    documents.length > 0;

  // Obter username do dono do produto para voltar para a loja
  const ownerUsername = product ? (typeof product.userId === 'object' ? product.userId.username : null) : null;

  const handleBackToShop = () => {
    if (ownerUsername) {
      navigation.navigate('ProfileStack', {
        screen: 'MyShop',
        params: {
          username: ownerUsername,
        },
      });
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Back Button - apenas quando produto está carregado */}
        {product && (
          <View style={styles.backButtonContainer}>
            <BackArrow onPress={handleBackToShop} label="Voltar para Loja" />
          </View>
        )}
        {/* Header do Produto */}
        <View style={[styles.header, isPending && styles.headerPending]}>
          <View style={styles.headerContent}>
            {product.coverImage && (
              <Image
                source={{ uri: getImageUrl(product.coverImage) }}
                style={[styles.coverImagePreview, isPending && styles.coverImagePending]}
                resizeMode="cover"
              />
            )}
            <View style={styles.headerInfo}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, isPending && styles.titlePending]}>{product.title}</Text>
                {isPending && (
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(productStatus) }]}>
                    <Ionicons name={getStatusIcon(productStatus) as any} size={14} color="#FFFFFF" />
                    <Text style={styles.statusBadgeText}>{getStatusLabel(productStatus)}</Text>
                  </View>
                )}
              </View>
              {product.description && (
                <Text style={[styles.description, isPending && styles.descriptionPending]}>{product.description}</Text>
              )}
              {product.categoryId && (
                <View style={styles.category}>
                  <Text style={styles.categoryText}>{product.categoryId.name}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Aviso se não tem acesso */}
        {!canViewContent && (
          <View style={styles.accessWarning}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.states.warning} />
            <Text style={styles.accessWarningText}>
              Você precisa comprar este produto para acessar o conteúdo
            </Text>
          </View>
        )}

        {/* Links - Primeira Sessão (sempre primeiro) */}
        {(mainLink || links.length > 0) && canViewContent && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="link-outline" size={20} color={colors.text.primary} />
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
                <Ionicons name="open-outline" size={24} color={colors.primary.main} />
                <View style={styles.linkInfo}>
                  <Text style={styles.linkTitle}>{mainLink.customFileName}</Text>
                  <Text style={styles.linkUrl} numberOfLines={1}>
                    {mainLink.url}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            )}

            {/* Links Externos */}
            {links.map((link, index) => (
              <TouchableOpacity
                key={index}
                style={styles.linkCard}
                onPress={() => handleOpenLink(link.url)}
              >
                <Ionicons name="open-outline" size={24} color={colors.primary.main} />
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
                <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {moduleGroups.length > 0 && canViewContent && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="albums-outline" size={20} color={colors.text.primary} />
              <Text style={styles.sectionTitle}>Módulos ({moduleGroups.length})</Text>
            </View>
            {moduleGroups.map((module) => (
              <View key={module._id} style={styles.moduleBlock}>
                <Text style={styles.moduleTitle}>{module.title}</Text>
                {module.description ? (
                  <Text style={styles.documentDescription}>{module.description}</Text>
                ) : null}
                {module.items.map((file) => {
                  const progressLabel =
                    file.fileType === 'video' ? getVideoProgressLabel(file.serverIndex) : null;
                  const completed = progressByFile[String(file.serverIndex)]?.isCompleted;
                  return (
                    <TouchableOpacity
                      key={file.serverIndex}
                      style={styles.documentCard}
                      onPress={() => openFile(file)}
                    >
                      <Ionicons
                        name={
                          file.fileType === 'video'
                            ? 'play-circle-outline'
                            : file.fileType === 'image'
                              ? 'image-outline'
                              : 'document-outline'
                        }
                        size={24}
                        color={colors.primary.main}
                      />
                      <View style={styles.documentInfo}>
                        <Text style={styles.documentTitle}>
                          {file.customFileName || file.fileName}
                        </Text>
                        {progressLabel ? (
                          <Text style={styles.documentSize}>{progressLabel}</Text>
                        ) : null}
                      </View>
                      <Ionicons
                        name={completed ? 'checkmark-circle' : 'chevron-forward'}
                        size={20}
                        color={completed ? colors.states.success : colors.text.secondary}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* Imagens */}
        {images.length > 0 && canViewContent && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images-outline" size={20} color={colors.text.primary} />
              <Text style={styles.sectionTitle}>Imagens ({images.length})</Text>
            </View>
            <View style={styles.mediaGrid}>
              {images.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.mediaCard}
                  onPress={() => void handleViewImage(index, imageIndices)}
                  onLongPress={() => void handleDownloadFile(image.serverIndex)}
                >
                  {image.thumbnail ? (
                    <Image
                      source={{ uri: getImageUrl(image.thumbnail) }}
                      style={styles.mediaThumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.mediaPlaceholder}>
                      <Ionicons name="image-outline" size={32} color={colors.text.secondary} />
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
              <Ionicons name="videocam-outline" size={20} color={colors.text.primary} />
              <Text style={styles.sectionTitle}>Vídeos ({videos.length})</Text>
            </View>
            <View style={styles.mediaGrid}>
              {videos.map((video, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.mediaCard}
                  onPress={() =>
                    void handleViewVideo(video.serverIndex, video.customFileName || video.fileName)
                  }
                  onLongPress={() => void handleDownloadFile(video.serverIndex)}
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
                      <Ionicons name="videocam-outline" size={32} color={colors.text.secondary} />
                    </View>
                  )}
                  <Text style={styles.mediaTitle} numberOfLines={2}>
                    {video.customFileName || video.fileName}
                  </Text>
                  {getVideoProgressLabel(video.serverIndex) ? (
                    <Text style={styles.mediaDescription}>
                      {getVideoProgressLabel(video.serverIndex)}
                    </Text>
                  ) : null}
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
              <Ionicons name="document-text-outline" size={20} color={colors.text.primary} />
              <Text style={styles.sectionTitle}>Documentos ({documents.length})</Text>
            </View>
            {documents.map((doc, index) => (
              <TouchableOpacity
                key={index}
                style={styles.documentCard}
                onPress={() => void handleDownloadFile(doc.serverIndex)}
              >
                <Ionicons name="document-outline" size={24} color={colors.primary.main} />
                <View style={styles.documentInfo}>
                  <Text style={styles.documentTitle}>
                    {doc.customFileName || doc.fileName}
                  </Text>
                  {doc.description && (
                    <Text style={styles.documentDescription}>{doc.description}</Text>
                  )}
                  <Text style={styles.documentSize}>{formatFileSize(doc.fileSize)}</Text>
                </View>
                <Ionicons
                  name={allowDownload ? 'download-outline' : 'lock-closed-outline'}
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Mensagem quando não há conteúdo */}
        {canViewContent && !hasContent && (
          <View style={styles.emptyContent}>
            <Ionicons name="cube-outline" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyText}>Este produto ainda não possui conteúdo</Text>
          </View>
        )}
      </ScrollView>

      {/* Visualizador de Imagem em Tela Cheia */}
      <ImageViewing
        images={imageViewerImages}
        imageIndex={imageViewerIndex}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
        presentationStyle="overFullScreen"
        doubleTapToZoomEnabled
        swipeToCloseEnabled
      />

      <CustomModal
        visible={videoViewer !== null}
        animationType="fade"
        onClose={closeVideoViewer}
        closeOnBackdropPress={false}
        overlayStyle={styles.videoViewerOverlay}
      >
        <View style={styles.videoViewer}>
          <View style={[styles.videoViewerHeader, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.videoViewerTitle} numberOfLines={1}>
              {videoViewer?.title}
            </Text>
            <TouchableOpacity
              onPress={closeVideoViewer}
              accessibilityLabel="Fechar vídeo"
              hitSlop={12}
            >
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>
          {videoViewer ? (
            <AppVideo
              key={videoViewer.uri}
              ref={videoRef}
              uri={videoViewer.uri}
              style={styles.videoViewerPlayer}
              autoPlay
              nativeControls
              onLoad={() => {
                const saved = progressByFile[String(videoViewer.index)];
                if (saved && !saved.isCompleted && saved.currentTime > 5) {
                  videoRef.current?.seekTo(saved.currentTime);
                }
              }}
              onEnd={() => {
                const duration = videoRef.current?.getDuration() ?? 0;
                persistProgress(videoViewer.index, duration, duration, true);
              }}
              onError={() => void handleVideoError()}
            />
          ) : null}
        </View>
      </CustomModal>
    </View>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  videoViewerOverlay: {
    padding: 0,
    backgroundColor: '#000000',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  videoViewer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000000',
  },
  videoViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  videoViewerTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  videoViewerPlayer: {
    flex: 1,
  },
  moduleBlock: {
    marginBottom: 16,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text.primary,
    marginBottom: 6,
  },
  container: {
    flex: 1,
    backgroundColor: c.background.default,
  },
  backButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
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
    color: c.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: c.states.error,
  },
  header: {
    backgroundColor: c.background.paper,
    marginBottom: 12,
    padding: 16,
  },
  headerPending: {
    opacity: 0.65,
  },
  headerContent: {
    flexDirection: 'row',
    gap: 12,
  },
  coverImagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: c.background.tertiary,
  },
  coverImagePending: {
    opacity: 0.65,
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: c.text.primary,
    flex: 1,
  },
  titlePending: {
    opacity: 0.8,
  },
  descriptionPending: {
    opacity: 0.7,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    color: c.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  category: {
    alignSelf: 'flex-start',
    backgroundColor: c.background.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    color: c.text.secondary,
    fontWeight: '600',
  },
  accessWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.background.paper,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: c.states.warning,
  },
  accessWarningText: {
    flex: 1,
    fontSize: 14,
    color: c.text.primary,
  },
  section: {
    backgroundColor: c.background.paper,
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
    color: c.text.primary,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: c.background.tertiary,
    borderRadius: 8,
    marginBottom: 8,
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 12,
    color: c.text.secondary,
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 12,
    color: c.text.tertiary,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaCard: {
    width: (width - 64) / 2,
    backgroundColor: c.background.tertiary,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  mediaThumbnail: {
    width: '100%',
    height: 120,
    backgroundColor: c.background.default,
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
    backgroundColor: c.background.default,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text.primary,
    padding: 8,
  },
  mediaDescription: {
    fontSize: 12,
    color: c.text.secondary,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: c.background.tertiary,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 12,
    color: c.text.secondary,
    marginBottom: 4,
  },
  documentSize: {
    fontSize: 11,
    color: c.text.tertiary,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    backgroundColor: c.background.paper,
    borderRadius: 12,
    margin: 16,
  },
  emptyText: {
    fontSize: 16,
    color: c.text.secondary,
    marginTop: 16,
    textAlign: 'center',
  },
});

