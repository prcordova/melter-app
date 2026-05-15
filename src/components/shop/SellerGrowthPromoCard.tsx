import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import {
  getSellerGrowthPromoContent,
  shouldShowSellerGrowthPromo,
  type SellerGrowthPromoContent,
  type SellerGrowthPromoCta,
  type SellerGrowthPromoPlacement,
  type SellerGrowthPromoVariant,
  type SellerVerificationStatusValue,
} from '../../utils/seller-growth-promo';

export type SellerGrowthPromoNavigateAction =
  | 'shop'
  | 'links'
  | 'appearance'
  | 'feed'
  | 'explorer'
  | 'openVerificationForm';

type Props = {
  variant?: SellerGrowthPromoVariant;
  placement?: SellerGrowthPromoPlacement;
  sellerStatus: SellerVerificationStatusValue;
  onAction: (action: SellerGrowthPromoNavigateAction) => void;
};

function PromoCtaButton({
  cta,
  variant,
  onPress,
}: {
  cta: SellerGrowthPromoCta;
  variant: 'primary' | 'outline';
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.cta, variant === 'primary' ? styles.ctaPrimary : styles.ctaOutline]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[styles.ctaText, variant === 'outline' && styles.ctaTextOutline]}
        numberOfLines={2}
      >
        {cta.label}
      </Text>
    </TouchableOpacity>
  );
}

function PromoActions({
  content,
  onAction,
  placement,
}: {
  content: SellerGrowthPromoContent;
  onAction: (action: SellerGrowthPromoNavigateAction) => void;
  placement: SellerGrowthPromoPlacement;
}) {
  const ctas: Array<{ cta: SellerGrowthPromoCta; variant: 'primary' | 'outline' }> = [];
  if (content.primaryCta) ctas.push({ cta: content.primaryCta, variant: 'primary' });
  if (content.secondaryCta) ctas.push({ cta: content.secondaryCta, variant: 'outline' });
  if (content.tertiaryCta) ctas.push({ cta: content.tertiaryCta, variant: 'outline' });

  if (ctas.length === 0) return null;

  const resolvePress = (action: SellerGrowthPromoCta['action']) => {
    if (action === 'shop' && placement === 'shop') {
      onAction('openVerificationForm');
      return;
    }
    onAction(action);
  };

  return (
    <View style={styles.actions}>
      {ctas.map(({ cta, variant }) => (
        <PromoCtaButton
          key={`${cta.action}-${cta.label}`}
          cta={cta}
          variant={variant}
          onPress={() => resolvePress(cta.action)}
        />
      ))}
    </View>
  );
}

export function SellerGrowthPromoCard({
  variant = 'large',
  placement = 'shop',
  sellerStatus,
  onAction,
}: Props) {
  const content = useMemo(
    () => getSellerGrowthPromoContent(sellerStatus, placement),
    [sellerStatus, placement]
  );

  if (!shouldShowSellerGrowthPromo(sellerStatus)) {
    return null;
  }

  const showShopTips = variant === 'large' && placement === 'shop';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="storefront-outline" size={variant === 'small' ? 22 : 28} color={COLORS.secondary.main} />
        <View style={styles.headerText}>
          <Text style={variant === 'large' ? styles.titleLg : styles.title}>{content.title}</Text>
          <Text style={styles.description}>{content.description}</Text>
          {content.hint ? <Text style={styles.hint}>{content.hint}</Text> : null}
        </View>
      </View>

      {showShopTips ? (
        <View style={styles.tips}>
          <View style={styles.tipRow}>
            <Ionicons name="link-outline" size={16} color={COLORS.secondary.main} />
            <Text style={styles.tipText}>
              Adicione links no perfil para direcionar sua audiência enquanto a loja é analisada.
            </Text>
          </View>
          <View style={styles.tipRow}>
            <Ionicons name="people-outline" size={16} color={COLORS.secondary.main} />
            <Text style={styles.tipText}>
              Publique no feed e explore novos perfis para construir comunidade.
            </Text>
          </View>
        </View>
      ) : null}

      <PromoActions content={content} onAction={onAction} placement={placement} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.secondary.main + '55',
    backgroundColor: COLORS.secondary.main + '14',
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleLg: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  description: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  tips: {
    gap: 10,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  cta: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    maxWidth: '100%',
  },
  ctaPrimary: {
    backgroundColor: COLORS.secondary.main,
  },
  ctaOutline: {
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  ctaTextOutline: {
    color: COLORS.text.primary,
  },
});
