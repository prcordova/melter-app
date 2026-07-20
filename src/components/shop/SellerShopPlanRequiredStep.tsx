import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';

export type SellerShopPlanGateInfo = {
  canCreateShop: boolean;
  minPlanToCreateShop: string;
  currentPlan: string;
};

function formatPlanLabel(plan: string): string {
  if (plan === 'PRO_PLUS') return 'PRO+';
  return plan || 'STARTER';
}

/** true quando o admin exige plano pago e o usuário ainda não pode criar loja. */
export function shouldShowSellerShopPlanGate(
  gate: SellerShopPlanGateInfo | null | undefined
): boolean {
  if (!gate) return false;
  if (gate.canCreateShop) return false;
  const min = (gate.minPlanToCreateShop || 'FREE').toUpperCase();
  return min !== 'FREE';
}

type Props = {
  minPlanToCreateShop: string;
  currentPlan: string;
  onGoToPlans: () => void;
  onDismiss?: () => void;
  dismissLabel?: string;
};

export function SellerShopPlanRequiredStep({
  minPlanToCreateShop,
  currentPlan,
  onGoToPlans,
  onDismiss,
  dismissLabel = 'Agora não',
}: Props) {
  const planLabel = formatPlanLabel(minPlanToCreateShop);
  const currentLabel = formatPlanLabel(currentPlan);

  return (
    <View style={styles.card}>
      <Ionicons name="diamond-outline" size={40} color={COLORS.secondary.main} />
      <Text style={styles.title}>Plano {planLabel} necessário para abrir loja</Text>
      <Text style={styles.description}>
        Só usuários com o plano {planLabel} ou superior podem ter loja ativa e vender produtos. Seu
        plano atual: {currentLabel}.
      </Text>
      <Text style={styles.body}>
        Assine o {planLabel} para liberar o cadastro de vendedor, publicar produtos e receber pelas
        vendas na carteira Melter.
      </Text>
      <View style={styles.actions}>
        {onDismiss ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.75}>
            <Text style={styles.secondaryText}>{dismissLabel}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.primaryBtn} onPress={onGoToPlans} activeOpacity={0.8}>
          <Text style={styles.primaryText}>Ver planos e assinar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.secondary.main,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  secondaryText: {
    color: COLORS.text.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
});
