import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import type { SellerShopPlanGateInfo } from './SellerShopPlanRequiredStep';
import { api } from '../../services/http-client';
import {
  DEFAULT_PLATFORM_PLAN_OFFER_DAYS,
  formatPlatformOfferDaysLabel,
  type PlatformPlanOfferMode,
} from '../../config/platform-plan-trial';

function formatPlanLabel(plan: string): string {
  if (plan === 'PRO_PLUS') return 'PRO+';
  return plan || 'STARTER';
}

type Props = {
  gate: SellerShopPlanGateInfo;
  onGoToPlans: () => void;
};

export function SellerShopPlanPendingAlert({ gate, onGoToPlans }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const planLabel = formatPlanLabel(gate.minPlanToCreateShop);
  const [offerMode, setOfferMode] = useState<PlatformPlanOfferMode>('MONEY_BACK');
  const [offerDays, setOfferDays] = useState(DEFAULT_PLATFORM_PLAN_OFFER_DAYS);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<{
        success?: boolean;
        data?: {
          platformPlanFreeTrialEnabled?: boolean;
          platformPlanOfferMode?: PlatformPlanOfferMode;
          platformPlanOfferDays?: number;
        };
      }>('/api/plans/features')
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (!data) return;
        const mode =
          data.platformPlanOfferMode === 'FREE_TRIAL' ||
          data.platformPlanOfferMode === 'MONEY_BACK' ||
          data.platformPlanOfferMode === 'DIRECT'
            ? data.platformPlanOfferMode
            : data.platformPlanFreeTrialEnabled === false
              ? 'DIRECT'
              : 'MONEY_BACK';
        setOfferMode(mode);
        if (
          typeof data.platformPlanOfferDays === 'number' &&
          data.platformPlanOfferDays > 0
        ) {
          setOfferDays(data.platformPlanOfferDays);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const softOffer = offerMode !== 'DIRECT';
  const ctaLabel = !softOffer
    ? 'Assinar agora'
    : offerMode === 'FREE_TRIAL'
      ? `Testar grátis ${formatPlatformOfferDaysLabel(offerDays)}`
      : `Experimentar ${formatPlatformOfferDaysLabel(offerDays)}`;
  const bodyOffer = !softOffer
    ? `Assine o plano ${planLabel} para ativar a loja e aparecer no marketplace Melter.`
    : offerMode === 'FREE_TRIAL'
      ? `Seu pacote já foi enviado para análise. Teste grátis o plano ${planLabel} por ${formatPlatformOfferDaysLabel(offerDays)} para ativar a loja e aparecer no marketplace Melter.`
      : `Seu pacote já foi enviado para análise. Assine o plano ${planLabel} (experimente ${formatPlatformOfferDaysLabel(offerDays)}) para ativar a loja e aparecer no marketplace Melter.`;

  return (
    <View style={styles.banner}>
      <Ionicons name="diamond-outline" size={22} color={colors.states.warning} />
      <View style={styles.content}>
        <Text style={styles.title}>Ative sua loja e alcance milhares de pessoas</Text>
        <Text style={styles.body}>{bodyOffer}</Text>
        <Text style={styles.hint}>
          Quanto antes você ativar, mais rápido compradores descobrem seu conteúdo na vitrine e no
          /shops.
        </Text>
        <TouchableOpacity style={styles.cta} onPress={onGoToPlans} activeOpacity={0.85}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.states.warning,
    backgroundColor: c.isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
  },
  content: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text.primary,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: c.text.secondary,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: c.text.primary,
  },
  cta: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: c.primary.main,
  },
  ctaText: {
    color: c.primary.contrastText,
    fontSize: 13,
    fontWeight: '600',
  },
});
