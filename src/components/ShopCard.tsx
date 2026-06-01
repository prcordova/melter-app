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
import { COLORS } from '../theme/colors';

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
  paymentMode?: 'UNICO' | 'ASSINATURA';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_CHANGES' | 'INACTIVE';
  subscriptionPlanId?: string;
  subscriptionPlan?: {
    _id: string;
    name: string;
    price: number;
    intervalDays: number;
    isActive: boolean;
  };
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
  avatarFallbackEnabled = true,
}: ShopCardProps) {
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

  const displayPrice =
    product.paymentMode === 'ASSINATURA' && product.subscriptionPlan?.price != null
      ? product.subscriptionPlan.price
      : product.price;

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
          <View style={styles.adultBadge}>
            <Text style={styles.adultBadgeText}>+18</Text>
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

      {/* Informações do Produto */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>

        {product.description && (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        )}

        {/* Categoria */}
        {category && (
          <View style={styles.category}>
            {category.emoji && (
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
            )}
            <Text style={styles.categoryText}>{category.name}</Text>
          </View>
        )}

        {/* Vendedor */}
        {product.userId && product.userId.username && (
          <View style={styles.seller}>
            <Ionicons name="person-outline" size={14} color={COLORS.text.secondary} />
            <Text style={styles.sellerText}>@{product.userId.username}</Text>
          </View>
        )}

        {statusChip && (
          <View style={styles.statusChip}>
            <Text style={styles.statusChipText}>{statusChip.label}</Text>
          </View>
        )}

        {product.paymentMode === 'ASSINATURA' && product.subscriptionPlan?.name && (
          <Text style={styles.subPlanName} numberOfLines={1}>
            Plano: {product.subscriptionPlan.name}
          </Text>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.price}>{formatPrice(displayPrice)}</Text>

          {product.salesCount !== undefined && product.salesCount > 0 && (
            <View style={styles.sales}>
              <Ionicons name="cart-outline" size={14} color={COLORS.text.tertiary} />
              <Text style={styles.salesText}>{product.salesCount} vendas</Text>
            </View>
          )}
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
    {footerAction && (
      <TouchableOpacity style={styles.footerAction} onPress={footerAction.onPress} activeOpacity={0.85}>
        <Ionicons name="play" size={14} color="#fff" />
        <Text style={styles.footerActionText}>{footerAction.label}</Text>
      </TouchableOpacity>
    )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.paper,
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
    backgroundColor: COLORS.background.tertiary,
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
    backgroundColor: COLORS.background.tertiary,
  },
  adultBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  categoryEmoji: {
    fontSize: 12,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  seller: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  sellerText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary.main,
  },
  sales: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  salesText: {
    fontSize: 11,
    color: COLORS.text.tertiary,
  },
  inactiveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveBadge: {
    backgroundColor: COLORS.states.error,
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
    backgroundColor: COLORS.states.warning,
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
    backgroundColor: COLORS.states.info,
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
    color: COLORS.states.success,
  },
  subPlanName: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 6,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.secondary.main,
    paddingVertical: 12,
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

