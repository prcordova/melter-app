import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  getSellerVerificationFieldLabels,
  resolveFieldsToReviewForClient,
} from '../../utils/seller/verification-fields';

const SELLER_ONBOARDING_PAID_ACCESS = {
  title: 'Ninguém acessa o produto sem pagar',
  note:
    'Fotos, vídeos e arquivos do seu pacote digital ficam bloqueados até o comprador pagar ou manter a assinatura ativa. Visitantes da loja só veem a capa pública — o conteúdo nunca fica aberto para quem não pagou.',
} as const;

interface SellerVerification {
  status: 'pending' | 'approved' | 'rejected' | 'disabled' | 'needs_review' | 'appeal' | null;
  submittedAt?: string;
  rejectionReason?: string | null;
  needsReviewReason?: string;
  needsReviewReasons?: string[];
  fieldsToReview?: string[];
  appealReason?: string;
  appealSubmittedAt?: string;
  appealBlockedUntil?: string;
}

interface SellerVerificationStatusCardProps {
  sellerVerification: SellerVerification | null;
  onOpenForm: () => void;
  onOpenAppeal: () => void;
  onRefresh?: () => void;
  onOpenSupport?: () => void;
  compact?: boolean;
  /** Gate dinâmico (onboarding-context.shopPlanGate). */
  shopPlanGate?: {
    canCreateShop: boolean;
    minPlanToCreateShop: string;
    currentPlan: string;
  } | null;
}

export function SellerVerificationStatusCard({
  sellerVerification,
  onOpenForm,
  onOpenAppeal,
  onRefresh,
  onOpenSupport,
  compact = false,
}: SellerVerificationStatusCardProps) {
  const { colors, isDark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const getStatusConfig = () => {
    // Sem status = ainda não enviou cadastro. Nunca mostrar “Criar Loja” se o pai
    // passou status aprovado/pendente (evita CTA falso em race de loading).
    if (!sellerVerification || sellerVerification.status == null) {
      return {
        title: 'Criar sua Loja',
        description: compact
          ? 'Envie a verificação de documentos. Após aprovação, publique pacotes ou assinaturas na loja.'
          : 'Como funciona: após a verificação de documentos e aprovação, você adiciona produtos; compradores pagam e só quem compra (ou assina) acessa seu conteúdo — o valor das vendas vai para sua carteira Melter.\n\n' +
            'A plataforma valida documentos de vendedores e usa proteção Cloudflare contra ataques. Pode enviar o cadastro com tranquilidade: analisamos e avisamos em cada etapa.',
        icon: 'storefront-outline' as const,
        color: colors.text.secondary,
        bgColor: colors.background.tertiary,
        borderColor: colors.border.medium,
        showButton: true,
        buttonText: 'Criar Loja',
        buttonAction: onOpenForm,
      };
    }

    switch (sellerVerification.status) {
      case 'pending':
        return {
          title: 'Aguardando Aprovação',
          description: `Seu cadastro foi enviado e está aguardando análise de um administrador.${
            sellerVerification.submittedAt
              ? ` Enviado em ${new Date(sellerVerification.submittedAt).toLocaleDateString('pt-BR')}`
              : ''
          }`,
          icon: 'hourglass-outline' as const,
          color: colors.states.info,
          bgColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF6FF',
          borderColor: colors.states.info,
          showButton: false,
        };

      case 'rejected':
        return {
          title: 'Cadastro Rejeitado',
          description: 'Corrija os itens indicados e reenvie o cadastro.',
          icon: 'close-circle-outline' as const,
          color: colors.states.error,
          bgColor: isDark ? 'rgba(220, 38, 38, 0.12)' : '#FEF2F2',
          borderColor: colors.states.error,
          showButton: true,
          buttonText: 'Reenviar Cadastro',
          buttonAction: onOpenForm,
        };

      case 'disabled': {
        const isBlocked =
          sellerVerification.appealBlockedUntil &&
          new Date(sellerVerification.appealBlockedUntil) > new Date();
        const blockedUntil = sellerVerification.appealBlockedUntil
          ? new Date(sellerVerification.appealBlockedUntil)
          : null;
        const daysRemaining =
          blockedUntil && isBlocked
            ? Math.ceil((blockedUntil.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        return {
          title: 'Loja Desabilitada',
          description:
            sellerVerification.needsReviewReason ||
            sellerVerification.rejectionReason ||
            'Sua loja foi desabilitada.',
          icon: 'ban-outline' as const,
          color: colors.states.error,
          bgColor: isDark ? 'rgba(220, 38, 38, 0.12)' : '#FEF2F2',
          borderColor: colors.states.error,
          showButton: !isBlocked,
          buttonText: 'Solicitar Reativação',
          buttonAction: onOpenAppeal,
          isBlocked,
          blockedUntil,
          daysRemaining,
        };
      }

      case 'appeal':
        return {
          title: 'Reivindicação em Análise',
          description: `Sua solicitação de reativação da loja foi enviada e está aguardando análise de um administrador.${
            sellerVerification.appealSubmittedAt
              ? ` Enviada em ${new Date(sellerVerification.appealSubmittedAt).toLocaleDateString('pt-BR')} às ${new Date(sellerVerification.appealSubmittedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
              : ''
          }`,
          icon: 'time-outline' as const,
          color: colors.states.warning,
          bgColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
          borderColor: colors.states.warning,
          showButton: false,
          appealReason: sellerVerification.appealReason,
        };

      case 'needs_review':
        return {
          title: 'Revisão Necessária',
          description: 'O administrador pediu ajustes no seu cadastro.',
          icon: 'warning-outline' as const,
          color: colors.states.warning,
          bgColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
          borderColor: colors.states.warning,
          showButton: true,
          buttonText: 'Abrir para Revisão',
          buttonAction: onOpenForm,
        };

      case 'approved':
        return {
          title: 'Loja Aprovada',
          description: 'Sua loja foi aprovada! Você pode ativá-la e começar a vender.',
          icon: 'checkmark-circle-outline' as const,
          color: colors.states.success,
          bgColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4',
          borderColor: colors.states.success,
          showButton: false,
        };

      default:
        return {
          title: `Status: ${sellerVerification.status || 'Indefinido'}`,
          description: 'Status desconhecido.',
          icon: 'help-circle-outline' as const,
          color: colors.text.secondary,
          bgColor: colors.background.tertiary,
          borderColor: colors.border.medium,
          showButton: false,
        };
    }
  };

  const config = getStatusConfig();
  const showPaidAccessBanner = !sellerVerification;
  const isCorrectionStatus =
    sellerVerification?.status === 'rejected' || sellerVerification?.status === 'needs_review';
  const reasonText = isCorrectionStatus
    ? sellerVerification?.status === 'rejected'
      ? sellerVerification.rejectionReason
      : sellerVerification?.needsReviewReason
    : null;
  const fieldLabels = isCorrectionStatus
    ? getSellerVerificationFieldLabels(
        resolveFieldsToReviewForClient({
          status: sellerVerification?.status ?? null,
          fieldsToReview: sellerVerification?.fieldsToReview,
          rejectionReason: sellerVerification?.rejectionReason,
        })
      )
    : [];

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      {showPaidAccessBanner ? (
        <View style={[styles.paidAccessBanner, compact && styles.paidAccessBannerCompact]}>
          <View style={styles.paidAccessBannerHeader}>
            <Ionicons name="lock-closed-outline" size={compact ? 16 : 20} color={colors.states.warning} />
            <Text style={[styles.paidAccessBannerTitle, compact && styles.paidAccessBannerTitleCompact]}>
              {SELLER_ONBOARDING_PAID_ACCESS.title}
            </Text>
          </View>
          {!compact ? (
            <Text style={styles.paidAccessBannerNote}>{SELLER_ONBOARDING_PAID_ACCESS.note}</Text>
          ) : (
            <Text style={styles.paidAccessBannerNoteCompact}>
              Visitantes só veem a capa; conteúdo pago fica bloqueado até a compra.
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.header}>
        <Ionicons name={config.icon} size={compact ? 32 : 48} color={config.color} />
        <Text style={[styles.title, compact && styles.titleCompact, { color: config.color }]}>
          {config.title}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>{config.description}</Text>

        {/* Motivo (uma vez) + itens a corrigir — igual SellerShopOnboardingStatusCard (web) */}
        {reasonText ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>
              {sellerVerification?.status === 'rejected' ? 'Motivo:' : 'Observações do administrador:'}
            </Text>
            <Text style={styles.reasonText}>{reasonText}</Text>
          </View>
        ) : null}

        {fieldLabels.length > 0 ? (
          <View style={styles.reasonsList}>
            <Text style={styles.reasonsListTitle}>Corrigir e reenviar:</Text>
            {fieldLabels.map((label) => (
              <Text key={label} style={styles.reasonItem}>
                • {label}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Justificativa de appeal */}
        {config.appealReason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Justificativa enviada:</Text>
            <Text style={styles.reasonText}>{config.appealReason}</Text>
          </View>
        )}

        {/* Bloqueio de reivindicação */}
        {config.isBlocked && config.blockedUntil && (
          <View style={styles.blockedBox}>
            <Text style={styles.blockedTitle}>Bloqueio de Reivindicação Ativo</Text>
            <Text style={styles.blockedText}>
              Você está bloqueado de solicitar reativação até{' '}
              <Text style={styles.blockedDate}>
                {config.blockedUntil.toLocaleDateString('pt-BR')}
              </Text>
              .
              {config.daysRemaining && config.daysRemaining > 0 && (
                <>
                  {' '}
                  Faltam {config.daysRemaining} {config.daysRemaining === 1 ? 'dia' : 'dias'} para
                  o bloqueio expirar.
                </>
              )}
            </Text>
          </View>
        )}

        {/* Mensagens informativas */}
        {sellerVerification?.status === 'pending' && (
          <Text style={styles.infoText}>
            Você receberá uma notificação quando sua loja for aprovada
          </Text>
        )}

        {sellerVerification?.status === 'appeal' && (
          <Text style={styles.infoText}>
            Você receberá uma notificação quando sua reivindicação for analisada
          </Text>
        )}

        {/* Botão de ação — mesmo CTA; gate de plano fica no modal de cadastro */}
        {config.showButton && config.buttonAction && (
          <TouchableOpacity
            style={[styles.button, styles.buttonCentered, { backgroundColor: config.color }]}
            onPress={config.buttonAction}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>{config.buttonText}</Text>
          </TouchableOpacity>
        )}

        {onOpenSupport ? (
          <TouchableOpacity
            style={styles.supportButton}
            onPress={onOpenSupport}
            activeOpacity={0.75}
          >
            <Ionicons name="chatbubbles-outline" size={18} color={colors.secondary.main} />
            <Text style={styles.supportButtonText}>Precisa de ajuda? Falar com o suporte</Text>
          </TouchableOpacity>
        ) : null}

        {/* Botão de refresh (opcional) */}
        {onRefresh && (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.refreshText}>Atualizar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 20,
    marginBottom: 16,
  },
  cardCompact: {
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  paidAccessBanner: {
    backgroundColor: c.isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.states.warning,
    padding: 14,
    marginBottom: 16,
  },
  paidAccessBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  paidAccessBannerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: c.text.primary,
  },
  paidAccessBannerNote: {
    fontSize: 13,
    lineHeight: 19,
    color: c.text.primary,
  },
  paidAccessBannerCompact: {
    padding: 10,
    marginBottom: 10,
  },
  paidAccessBannerTitleCompact: {
    fontSize: 13,
  },
  paidAccessBannerNoteCompact: {
    fontSize: 12,
    lineHeight: 16,
    color: c.text.secondary,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 17,
    marginTop: 8,
  },
  content: {
    gap: 12,
  },
  description: {
    fontSize: 14,
    color: c.text.primary,
    lineHeight: 20,
    textAlign: 'center',
  },
  reasonBox: {
    backgroundColor: c.background.paper,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 14,
    color: c.text.primary,
    lineHeight: 20,
  },
  reasonsList: {
    backgroundColor: c.background.paper,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  reasonsListTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 8,
  },
  reasonItem: {
    fontSize: 12,
    color: c.text.secondary,
    marginBottom: 4,
  },
  blockedBox: {
    backgroundColor: c.isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: c.states.warning,
  },
  blockedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.states.warning,
    marginBottom: 6,
  },
  blockedText: {
    fontSize: 12,
    color: c.text.primary,
    lineHeight: 18,
  },
  blockedDate: {
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    color: c.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonCentered: {
    alignSelf: 'center',
  },
  ctaRow: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.secondary.main,
    backgroundColor: c.background.paper,
  },
  supportButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: c.secondary.main,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
  },
  refreshText: {
    fontSize: 12,
    color: c.text.secondary,
  },
});

