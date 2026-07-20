import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';

export type SellerShopPlanGateInfo = {
  canCreateShop: boolean;
  minPlanToCreateShop: string;
  currentPlan: string;
  allowProductCreateWithoutActiveShop?: boolean;
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
  allowProductCreateWithoutActiveShop?: boolean;
  onGoToProducts?: () => void;
};

export function SellerShopPlanRequiredStep({
  minPlanToCreateShop,
  currentPlan,
  onGoToPlans,
  onDismiss,
  dismissLabel = 'Agora não',
  allowProductCreateWithoutActiveShop = true,
  onGoToProducts,
}: Props) {
  const planLabel = formatPlanLabel(minPlanToCreateShop);
  const currentLabel = formatPlanLabel(currentPlan);
  const showProductsCta =
    allowProductCreateWithoutActiveShop !== false && typeof onGoToProducts === 'function';

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
      {showProductsCta ? (
        <Text style={styles.productsHint}>
          Enquanto isso, você pode cadastrar produtos agora. Eles ficam prontos e passam a aparecer
          na vitrine quando a loja for aprovada (e o produto aprovado).
        </Text>
      ) : null}
      <View style={styles.actions}>
        {onDismiss ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.75}>
            <Text style={styles.secondaryText}>{dismissLabel}</Text>
          </TouchableOpacity>
        ) : null}
        {showProductsCta ? (
          <TouchableOpacity style={styles.outlineBtn} onPress={onGoToProducts} activeOpacity={0.8}>
            <Ionicons name="cube-outline" size={18} color={COLORS.primary.main} />
            <Text style={styles.outlineText}>Cadastrar produtos</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.primaryBtn} onPress={onGoToPlans} activeOpacity={0.8}>
          <Text style={styles.primaryText}>Assinar plano grátis</Text>
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
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    color: COLORS.text.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
  productsHint: {
    fontSize: 13,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryText: {
    color: COLORS.text.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.primary.main,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  outlineText: {
    color: COLORS.primary.main,
    fontWeight: '700',
    fontSize: 14,
  },
});
