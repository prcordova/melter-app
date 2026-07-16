import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import { resolveProductCoverImageSource } from '../../utils/product-cover-display';
import { ordersApi } from '../../services/api';
import { showToast } from '../CustomToast';
import { getProductAiCheckoutDisclosureMessage } from '../../utils/product-ai-checkout-disclosure';
import { Video, ResizeMode } from 'expo-av';

export interface CheckoutProduct {
  _id: string;
  title: string;
  description?: string;
  price: number;
  coverImage?: string | null;
  presentationVideoUrl?: string | null;
  paymentMode?: 'UNICO' | 'ASSINATURA';
  subscriptionPlan?: { price?: number } | null;
  isAiContent?: boolean;
  digital?: {
    filesCount?: number;
    contentStats?: {
      videoCount: number;
      imageCount: number;
      documentCount: number;
    } | null;
  };
  userId?: { username?: string; avatar?: string };
}

export interface ProductCheckoutModalProps {
  visible: boolean;
  product: CheckoutProduct | null;
  walletBalance: number;
  avatarFallbackEnabled?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductCheckoutModal({
  visible,
  product,
  walletBalance,
  avatarFallbackEnabled = true,
  onClose,
  onSuccess,
}: ProductCheckoutModalProps) {
  const [loading, setLoading] = useState(false);

  if (!product) return null;

  const price =
    product.paymentMode === 'ASSINATURA' && product.subscriptionPlan?.price != null
      ? product.subscriptionPlan.price
      : product.price;
  const canAfford = walletBalance >= price;
  const aiDisclosureMessage = getProductAiCheckoutDisclosureMessage(product);

  const handleCheckout = async () => {
    if (!canAfford) {
      showToast.error('Saldo insuficiente', 'Adicione saldo na carteira para concluir a compra.');
      return;
    }
    try {
      setLoading(true);
      const res = await ordersApi.checkoutProduct(product._id, 1);
      if (res.success) {
        showToast.success('Compra realizada!', 'O produto foi liberado na sua conta.');
        onSuccess();
        onClose();
      } else {
        showToast.error('Erro', res.message || 'Não foi possível concluir a compra');
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erro ao processar compra';
      showToast.error('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  const imageSource = product
    ? resolveProductCoverImageSource({
        coverImage: product.coverImage,
        sellerAvatar: product.userId?.avatar,
        avatarFallbackEnabled,
      })
    : require('../../../assets/bgMelter.jpg');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Finalizar compra</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.productRow}>
              <Image source={imageSource} style={styles.thumb} />
              <View style={styles.productMeta}>
                <Text style={styles.productTitle} numberOfLines={2}>
                  {product.title}
                </Text>
                {product.userId?.username ? (
                  <Text style={styles.seller}>@{product.userId.username}</Text>
                ) : null}
              </View>
            </View>

            {product.presentationVideoUrl ? (
              <Video
                source={{ uri: product.presentationVideoUrl }}
                style={styles.presentationVideo}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
              />
            ) : null}

            <View style={styles.row}>
              <Text style={styles.label}>Valor</Text>
              <Text style={styles.price}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Saldo na carteira</Text>
              <Text style={[styles.balance, !canAfford && styles.balanceLow]}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  walletBalance
                )}
              </Text>
            </View>
            {!canAfford && (
              <Text style={styles.warn}>
                Saldo insuficiente. Abra a carteira no menu do perfil para adicionar fundos.
              </Text>
            )}
            {aiDisclosureMessage ? (
              <View style={styles.aiNotice}>
                <Ionicons name="sparkles" size={18} color={COLORS.secondary.main} />
                <Text style={styles.aiNoticeText}>{aiDisclosureMessage}</Text>
              </View>
            ) : null}
          </ScrollView>

          <TouchableOpacity
            style={[styles.cta, (!canAfford || loading) && styles.ctaDisabled]}
            onPress={handleCheckout}
            disabled={!canAfford || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Confirmar compra</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
  },
  presentationVideo: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#000',
    marginBottom: 16,
  },
  productMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  seller: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.secondary.main,
  },
  balance: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  balanceLow: {
    color: COLORS.states.error,
  },
  warn: {
    fontSize: 13,
    color: COLORS.states.warning,
    marginBottom: 12,
  },
  aiNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.secondary.main,
    backgroundColor: 'rgba(202, 57, 148, 0.08)',
    marginBottom: 12,
  },
  aiNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text.primary,
  },
  cta: {
    backgroundColor: COLORS.secondary.main,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
