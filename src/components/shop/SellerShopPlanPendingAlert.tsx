import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import type { SellerShopPlanGateInfo } from './SellerShopPlanRequiredStep';

function formatPlanLabel(plan: string): string {
  if (plan === 'PRO_PLUS') return 'PRO+';
  return plan || 'STARTER';
}

type Props = {
  gate: SellerShopPlanGateInfo;
  onGoToPlans: () => void;
};

export function SellerShopPlanPendingAlert({ gate, onGoToPlans }: Props) {
  const planLabel = formatPlanLabel(gate.minPlanToCreateShop);
  const currentLabel = formatPlanLabel(gate.currentPlan);

  return (
    <View style={styles.banner}>
      <Ionicons name="diamond-outline" size={22} color={COLORS.states.warning} />
      <View style={styles.content}>
        <Text style={styles.title}>Assine o plano {planLabel} para publicar</Text>
        <Text style={styles.body}>
          Seu cadastro e produtos estão prontos. Para ativar a loja e enviar pacotes para moderação,
          assine o plano {planLabel} ou superior. Plano atual: {currentLabel}.
        </Text>
        <TouchableOpacity style={styles.cta} onPress={onGoToPlans} activeOpacity={0.85}>
          <Text style={styles.ctaText}>Ver planos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.states.warning,
    backgroundColor: '#FFFBEB',
  },
  content: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text.secondary,
  },
  cta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary.main,
  },
  ctaText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
