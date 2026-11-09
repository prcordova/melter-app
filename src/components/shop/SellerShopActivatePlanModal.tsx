import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, TextInput, ScrollView } from 'react-native';
import { CustomModal } from '../CustomModal';
import { Button } from '../Button';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import { shopApi } from '../../services/shop/api';
import { SellerShopPlanPendingAlert } from './SellerShopPlanPendingAlert';
import type { SellerShopPlanGateInfo } from './SellerShopPlanRequiredStep';

/** Sync com melter/src/constants/seller-plan-abandon-survey.ts */
const ABANDON_REASONS: Array<{ id: string; label: string; hint: string }> = [
  {
    id: 'exploring',
    label: 'Ainda estou conhecendo a plataforma',
    hint: 'Com o período de teste você explora sem compromisso — loja e pack já ficam prontos para o marketplace.',
  },
  {
    id: 'too_expensive',
    label: 'Achei caro',
    hint: 'Experimente o plano com reembolso se cancelar; seu pack pode ser visto por milhares de usuários na Melter.',
  },
  {
    id: 'sell_later',
    label: 'Quero vender depois',
    hint: 'Quanto antes ativar, antes o produto fica visível. Sem plano ativo ele fica pendente e ninguém compra.',
  },
  {
    id: 'no_trust',
    label: 'Não confio ainda',
    hint: 'Pagamento protegido por Mercado Pago e Stripe. Cancele no período de teste e devolvemos 100%.',
  },
  {
    id: 'plan_unclear',
    label: 'Não entendi o plano',
    hint: 'O plano só libera a vitrine: o conteúdo do pack continua protegido até a venda.',
  },
  { id: 'other', label: 'Outro', hint: 'Conte o que travou — qualquer detalhe ajuda.' },
];

const OTHER_TEXT_MAX = 500;

type Phase = 'activate' | 'confirm' | 'survey';

type Props = {
  visible: boolean;
  gate: SellerShopPlanGateInfo | null;
  onGoToPlans: () => void;
  onClose: () => void;
};

/** Step "Ativar" pós-publicação (paridade com o wizard web): CTA do plano → confirmação → pesquisa de abandono. */
export function SellerShopActivatePlanModal({ visible, gate, onGoToPlans, onClose }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [phase, setPhase] = useState<Phase>('activate');
  const [reason, setReason] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');

  useEffect(() => {
    if (!visible) {
      setPhase('activate');
      setReason(null);
      setOtherText('');
    }
  }, [visible]);

  if (!gate) return null;

  const minPlan = gate.minPlanToCreateShop || 'STARTER';

  const handleGoToPlans = () => {
    onClose();
    onGoToPlans();
  };

  const leaveWithFeedback = () => {
    if (!reason) return;
    void shopApi
      .submitPlanAbandonFeedback({
        reason,
        otherText: reason === 'other' ? otherText.trim() : '',
        minPlan,
        source: 'wizard',
      })
      .catch(() => undefined);
    onClose();
  };

  if (phase === 'confirm') {
    return (
      <CustomModal
        visible={visible}
        icon="warning-outline"
        iconColor={colors.states.warning}
        title="Produto pendente de ativação"
        message={`Seu produto ficará pendente até você assinar o plano ${minPlan}. Sem o plano ativo, ele não fica visível no marketplace nem recebe pedidos.`}
        onClose={() => setPhase('activate')}
        buttons={[
          { text: 'Continuar ativação', style: 'cancel', onPress: () => setPhase('activate') },
          { text: 'Fechar mesmo assim', style: 'destructive', onPress: () => setPhase('survey') },
        ]}
      />
    );
  }

  return (
    <CustomModal visible={visible} onClose={() => setPhase(phase === 'survey' ? 'activate' : 'confirm')}>
      <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
        {phase === 'activate' ? (
          <>
            <Text style={styles.title}>Pacote enviado para análise</Text>
            <SellerShopPlanPendingAlert gate={gate} onGoToPlans={handleGoToPlans} />
            <Button variant="ghost" size="sm" responsive={false} onPress={() => setPhase('confirm')}>
              Agora não
            </Button>
          </>
        ) : (
          <>
            <Text style={styles.title}>O que impediu você de continuar?</Text>
            <Text style={styles.subtitle}>
              Sua resposta nos ajuda a melhorar — e talvez ainda valha ativar o plano.
            </Text>
            <ScrollView style={styles.reasons} contentContainerStyle={styles.reasonsContent}>
              {ABANDON_REASONS.map((item) => {
                const selected = reason === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.reason, selected && styles.reasonSelected]}
                    onPress={() => setReason(item.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reasonLabel}>{item.label}</Text>
                    <Text style={styles.reasonHint}>{item.hint}</Text>
                  </TouchableOpacity>
                );
              })}
              {reason === 'other' ? (
                <TextInput
                  style={styles.otherInput}
                  value={otherText}
                  onChangeText={(value) => setOtherText(value.slice(0, OTHER_TEXT_MAX))}
                  placeholder="Conte em poucas palavras (opcional)"
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                />
              ) : null}
            </ScrollView>
            <View style={styles.actions}>
              <Button variant="ghost" size="sm" responsive={false} onPress={() => setPhase('activate')}>
                Voltar para ativação
              </Button>
              <Button
                variant="primary"
                size="sm"
                responsive={false}
                disabled={!reason}
                onPress={leaveWithFeedback}
              >
                Enviar e fechar
              </Button>
            </View>
          </>
        )}
      </Pressable>
    </CustomModal>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    card: {
      width: '92%',
      maxWidth: 480,
      maxHeight: '85%',
      backgroundColor: c.background.paper,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.divider,
      padding: 20,
      gap: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: c.text.primary,
    },
    subtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: c.text.secondary,
    },
    reasons: {
      flexGrow: 0,
    },
    reasonsContent: {
      gap: 8,
    },
    reason: {
      borderWidth: 1,
      borderColor: c.border.light,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: c.background.paper,
    },
    reasonSelected: {
      borderColor: c.secondary.main,
      backgroundColor: c.background.tertiary,
    },
    reasonLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text.primary,
      marginBottom: 2,
    },
    reasonHint: {
      fontSize: 12,
      lineHeight: 17,
      color: c.text.secondary,
    },
    otherInput: {
      minHeight: 64,
      borderWidth: 1,
      borderColor: c.border.medium,
      borderRadius: 10,
      padding: 10,
      fontSize: 14,
      color: c.text.primary,
      textAlignVertical: 'top',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
  });
