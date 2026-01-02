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

export function ShopCard({ product, onPress }: ShopCardProps) {
  // Usar bgMelter.jpg como fallback quando não tem coverImage
  const imageSource = product.coverImage
    ? { uri: getImageUrl(product.coverImage) }
    : require('../../assets/bgMelter.jpg');
  
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

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Imagem do Produto */}
      <View style={styles.imageContainer}>
        <Image source={imageSource} style={styles.image} />

        {/* Badge +18 */}
        {product.isAdultContent && (
          <View style={styles.adultBadge}>
            <Text style={styles.adultBadgeText}>+18</Text>
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

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>

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
});

