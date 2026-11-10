import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getImageUrl } from '../utils/image';
import { resolveProductCoverImageSource } from '../utils/product-cover-display';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';
import { resolveProductContentStats } from '../lib/products/product-content-stats';

interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  type: 'DIGITAL_PACK' | 'DIGITAL_PRODUCT' | 'COURSE' | 'SERVICE' | 'PHYSICAL_PRODUCT';
  coverImage?: string | null;
  userId?: {
    _id?: string;
    username?: string;
    avatar?: string;
  } | null;
  categoryId?: {
    _id?: string;
    name: string;
    color?: string;
    emoji?: string;
  } | string | null;
  salesCount?: number;
  isActive?: boolean;
  isAdultContent?: boolean;
  isAiContent?: boolean;
  paymentMode?: 'UNICO' | 'ASSINATURA';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_CHANGES' | 'INACTIVE';
  /** Observações do admin (recusa / ajustes) — só exibidas ao dono. */
  analysisNotes?: string | null;
  subscriptionPlanId?: string;
  subscriptionPlan?: {
    _id: string;
    name: string;
    price: number;
    intervalDays: number;
    isActive: boolean;
  };
  digital?: {
    contentStats?: {
      videoCount?: number;
      imageCount?: number;
      documentCount?: number;
    } | null;
    files?: Array<{ fileType?: string; duration?: number | null }>;
  } | null;
}

interface ShopCardProps {
  product: Product;
  onPress?: () => void;
  showPendingBadge?: boolean; // Se true, mostra badge de pendente apenas para dono
  showRequiresChangesBadge?: boolean;
  /** Chip de estado para visitante (ex.: Comprado, Ativo) */
  statusChip?: { label: string };
  /** Botão de ação principal abaixo do card (Comprar / Assinar / Entrar / Editar) */
  footerAction?: { label: string; onPress: () => void };
  /** Ação secundária ao lado da principal (ex.: Promover) */
  secondaryFooterAction?: { label: string; onPress: () => void };
  /** Dono: remover pacote da loja (soft delete `REMOVED_BY_SELLER`). */
  onDelete?: () => void;
  /** De `meta.productCoverAvatarFallbackEnabled` (admin > Parâmetros). */
  avatarFallbackEnabled?: boolean;
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  DIGITAL_PACK: 'Pacote Digital',
  DIGITAL_PRODUCT: 'Produto Digital',
  COURSE: 'Curso',
  SERVICE: 'Serviço',
  PHYSICAL_PRODUCT: 'Produto Físico',
};

const PRODUCT_TYPE_ICONS: Record<string, string> = {
  DIGITAL_PACK: 'cube-outline',
  DIGITAL_PRODUCT: 'cloud-download-outline',
  COURSE: 'school-outline',
  SERVICE: 'hammer-outline',
  PHYSICAL_PRODUCT: 'cube-outline',
};

export function ShopCard({
  product,
  onPress,
  showPendingBadge = false,
  showRequiresChangesBadge = false,
  statusChip,
  footerAction,
  secondaryFooterAction,
  onDelete,
  avatarFallbackEnabled = true,
}: ShopCardProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const imageSource = resolveProductCoverImageSource({
    coverImage: product.coverImage,
    sellerAvatar: product.userId?.avatar,
    avatarFallbackEnabled,
  });
  
  // Normalizar categoryId (pode ser string ou objeto)
  const category = typeof product.categoryId === 'string' 
    ? { name: product.categoryId } 
    : product.categoryId;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const isPending = showPendingBadge && product.status === 'PENDING';
  const isRequiresChanges = showRequiresChangesBadge && product.status === 'REQUIRES_CHANGES';
  const isRejected = showRequiresChangesBadge && product.status === 'REJECTED';
  const ownerAnalysisNotes =
    (isRequiresChanges || isRejected) && product.analysisNotes?.trim()
      ? product.analysisNotes.trim()
      : null;

  const displayPrice =
    product.paymentMode === 'ASSINATURA' && product.subscriptionPlan?.price != null
      ? product.subscriptionPlan.price
      : product.price;

  const contentStats = resolveProductContentStats(product);
  const mediaStatItems = [
    { key: 'images', icon: 'image-outline' as const, count: contentStats.imageCount },
    { key: 'videos', icon: 'videocam-outline' as const, count: contentStats.videoCount },
    { key: 'links', icon: 'link-outline' as const, count: contentStats.documentCount },
  ];

  return (
    <View style={[styles.card, isPending && styles.cardPending]}>
    <TouchableOpacity
      style={styles.cardTouchable}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Imagem do Produto */}
      <View style={styles.imageContainer}>
        <Image source={imageSource} style={styles.image} />

        {/* Avatar do Proprietário - canto esquerdo superior */}
        {product.userId && product.userId.avatar && (
          <View style={styles.ownerAvatar}>
            <Image
              source={{ uri: getImageUrl(product.userId.avatar) }}
              style={styles.ownerAvatarImage}
            />
          </View>
        )}

        {/* Badge +18 - canto direito superior */}
        {product.isAdultContent && (
          <View style={[styles.adultBadge, product.isAiContent && styles.adultBadgeWithAi]}>
            <Text style={styles.adultBadgeText}>+18</Text>
          </View>
        )}

        {/* Selo IA — ao lado do +18 */}
        {product.isAiContent && (
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={14} color="#ffffff" />
          </View>
        )}

        {/* Badge Status Pendente (apenas para dono) - ajustar posição se tiver avatar */}
        {showPendingBadge && product.status === 'PENDING' && (
          <View style={[
            styles.pendingBadge,
            product.userId?.avatar && styles.pendingBadgeWithAvatar
          ]}>
            <Ionicons name="time-outline" size={12} color="#FFFFFF" />
            <Text style={styles.pendingBadgeText}>Pendente</Text>
          </View>
        )}
        {isRequiresChanges && (
          <View style={[
            styles.changesBadge,
            product.userId?.avatar && styles.pendingBadgeWithAvatar
          ]}>
            <Ionicons name="build-outline" size={12} color="#FFFFFF" />
            <Text style={styles.pendingBadgeText}>Alterações</Text>
          </View>
        )}
        {isRejected && (
          <View style={[
            styles.changesBadge,
            styles.rejectedBadge,
            product.userId?.avatar && styles.pendingBadgeWithAvatar
          ]}>
            <Ionicons name="close-circle-outline" size={12} color="#FFFFFF" />
            <Text style={styles.pendingBadgeText}>Recusado</Text>
          </View>
        )}

        {/* Badge Tipo */}
        <View style={styles.typeBadge}>
          <Ionicons
            name={PRODUCT_TYPE_ICONS[product.type] as any}
            size={12}
            color="#ffffff"
          />
          <Text style={styles.typeBadgeText}>
            {PRODUCT_TYPE_LABELS[product.type]}
          </Text>
        </View>
      </View>

      {/* Informações — username sob a capa, título, descrição, preço + mídias */}
      <View style={styles.info}>
        {product.userId?.username ? (
          <Text style={styles.sellerText} numberOfLines={1}>
            @{product.userId.username}
          </Text>
        ) : null}

        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {product.title}
          </Text>
          {category ? (
            <View style={styles.categoryChip}>
              {category.emoji ? (
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              ) : null}
              <Text style={styles.categoryText} numberOfLines={1}>
                {category.name}
              </Text>
            </View>
          ) : null}
        </View>

        {product.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}

        {statusChip && (
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>{statusChip.label}</Text>
          </View>
        )}

        {ownerAnalysisNotes ? (
          <View style={[styles.analysisNotes, isRejected && styles.analysisNotesRejected]}>
            <Text style={styles.analysisNotesLabel}>Observações da análise</Text>
            <Text style={styles.analysisNotesText} numberOfLines={4}>
              {ownerAnalysisNotes}
            </Text>
          </View>
        ) : null}

        {product.paymentMode === 'ASSINATURA' && product.subscriptionPlan?.name && (
          <Text style={styles.subPlanName} numberOfLines={1}>
            Plano: {product.subscriptionPlan.name}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.mediaStats}>
            {mediaStatItems.map((item) => (
              <View key={item.key} style={styles.mediaStatItem}>
                <Ionicons name={item.icon} size={15} color={colors.secondary.main} />
                <Text style={styles.mediaStatCount}>{item.count}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.price}>{formatPrice(displayPrice)}</Text>
        </View>
      </View>

      {/* Indicador Inativo */}
      {product.isActive === false && (
        <View style={styles.inactiveOverlay}>
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>Indisponível</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
    {footerAction || secondaryFooterAction ? (
      <View style={styles.footerActionsRow}>
        {footerAction ? (
          <TouchableOpacity
            style={[styles.footerAction, secondaryFooterAction && styles.footerActionSplit]}
            onPress={footerAction.onPress}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={14} color="#fff" />
            <Text style={styles.footerActionText}>{footerAction.label}</Text>
          </TouchableOpacity>
        ) : null}
        {secondaryFooterAction ? (
          <TouchableOpacity
            style={[styles.footerActionSecondary, footerAction && styles.footerActionSplit]}
            onPress={secondaryFooterAction.onPress}
            activeOpacity={0.85}
          >
            <Ionicons name="megaphone-outline" size={14} color={colors.secondary.main} />
            <Text style={styles.footerActionSecondaryText}>{secondaryFooterAction.label}</Text>
          </TouchableOpacity>
        ) : null}
        {onDelete ? (
          <TouchableOpacity
            style={styles.footerActionDelete}
            onPress={onDelete}
            activeOpacity={0.85}
            accessibilityLabel="Remover pacote da loja"
          >
            <Ionicons name="trash-outline" size={16} color={colors.states.error} />
          </TouchableOpacity>
        ) : null}
      </View>
    ) : null}
    </View>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  card: {
    backgroundColor: c.background.paper,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTouchable: {
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: c.background.tertiary,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.background.tertiary,
  },
  adultBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 2,
  },
  adultBadgeWithAi: {
    right: 44,
  },
  aiBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: c.secondary.main,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  adultBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  typeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  info: {
    padding: 12,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: 'bold',
    color: c.text.primary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    minWidth: 0,
  },
  description: {
    fontSize: 13,
    color: c.text.secondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    maxWidth: '42%',
    backgroundColor: c.background.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryEmoji: {
    fontSize: 12,
  },
  categoryText: {
    fontSize: 11,
    color: c.text.tertiary,
    fontWeight: '600',
    maxWidth: 90,
  },
  sellerText: {
    fontSize: 12,
    color: c.text.secondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  mediaStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  mediaStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  mediaStatCount: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text.secondary,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: c.secondary.main,
    flexShrink: 0,
  },
  sales: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  salesText: {
    fontSize: 11,
    color: c.text.tertiary,
  },
  inactiveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${c.background.paper}D9`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveBadge: {
    backgroundColor: c.states.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inactiveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ownerAvatar: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  ownerAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pendingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: c.states.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changesBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: c.states.info,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pendingBadgeWithAvatar: {
    left: 48, // Ajustar posição quando tem avatar
  },
  statusChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.states.success,
  },
  subPlanName: {
    fontSize: 12,
    color: c.text.secondary,
    marginBottom: 6,
  },
  footerActionsRow: {
    flexDirection: 'row',
  },
  footerActionDelete: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: c.border.light,
  },
  rejectedBadge: {
    backgroundColor: c.states.error,
  },
  analysisNotes: {
    borderLeftWidth: 3,
    borderLeftColor: c.states.warning,
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  analysisNotesRejected: {
    borderLeftColor: c.states.error,
  },
  analysisNotesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text.primary,
    marginBottom: 2,
  },
  analysisNotesText: {
    fontSize: 12,
    color: c.text.secondary,
  },
  footerAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: c.secondary.main,
    paddingVertical: 12,
  },
  footerActionSplit: {
    flex: 1,
  },
  footerActionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: c.background.paper,
    borderTopWidth: 1,
    borderTopColor: c.border.light,
    paddingVertical: 12,
  },
  footerActionSecondaryText: {
    color: c.secondary.main,
    fontSize: 13,
    fontWeight: '700',
  },
  footerActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardPending: {
    opacity: 0.7,
  },
});

