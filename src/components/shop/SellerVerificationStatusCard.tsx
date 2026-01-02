import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { COLORS } from '../../theme/colors';
import Ionicons from '@expo/vector-icons/Ionicons';

interface SellerVerification {
  status: 'pending' | 'approved' | 'rejected' | 'disabled' | 'needs_review' | 'appeal' | null;
  submittedAt?: string;
  rejectionReason?: string;
  needsReviewReason?: string;
  needsReviewReasons?: string[];
  appealReason?: string;
  appealSubmittedAt?: string;
  appealBlockedUntil?: string;
}

interface SellerVerificationStatusCardProps {
  sellerVerification: SellerVerification | null;
  onOpenForm: () => void;
  onOpenAppeal: () => void;
  onRefresh?: () => void;
}

export function SellerVerificationStatusCard({
  sellerVerification,
  onOpenForm,
  onOpenAppeal,
  onRefresh,
}: SellerVerificationStatusCardProps) {
  const getStatusConfig = () => {
    if (!sellerVerification) {
      return {
        title: 'Criar sua Loja',
        description: 'Para começar a vender na plataforma, você precisa solicitar a abertura da sua loja. Preencha o formulário de verificação de vendedor para iniciar.',
        icon: 'storefront-outline' as const,
        color: COLORS.text.secondary,
        bgColor: COLORS.background.tertiary,
        borderColor: COLORS.border.medium,
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
          color: COLORS.states.info,
          bgColor: '#EFF6FF',
          borderColor: COLORS.states.info,
          showButton: false,
        };

      case 'rejected':
        return {
          title: 'Cadastro Rejeitado',
          description: sellerVerification.rejectionReason || 'Seu cadastro foi rejeitado.',
          icon: 'close-circle-outline' as const,
          color: COLORS.states.error,
          bgColor: '#FEF2F2',
          borderColor: COLORS.states.error,
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
          color: COLORS.states.error,
          bgColor: '#FEF2F2',
          borderColor: COLORS.states.error,
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
          color: COLORS.states.warning,
          bgColor: '#FFFBEB',
          borderColor: COLORS.states.warning,
          showButton: false,
          appealReason: sellerVerification.appealReason,
        };

      case 'needs_review':
        return {
          title: 'Revisão Necessária',
          description: sellerVerification.needsReviewReason || 'Seu cadastro precisa ser revisado.',
          icon: 'warning-outline' as const,
          color: COLORS.states.warning,
          bgColor: '#FFFBEB',
          borderColor: COLORS.states.warning,
          showButton: true,
          buttonText: 'Abrir para Revisão',
          buttonAction: onOpenForm,
          needsReviewReasons: sellerVerification.needsReviewReasons,
        };

      case 'approved':
        return {
          title: 'Loja Aprovada',
          description: 'Sua loja foi aprovada! Você pode ativá-la e começar a vender.',
          icon: 'checkmark-circle-outline' as const,
          color: COLORS.states.success,
          bgColor: '#F0FDF4',
          borderColor: COLORS.states.success,
          showButton: false,
        };

      default:
        return {
          title: `Status: ${sellerVerification.status || 'Indefinido'}`,
          description: 'Status desconhecido.',
          icon: 'help-circle-outline' as const,
          color: COLORS.text.secondary,
          bgColor: COLORS.background.tertiary,
          borderColor: COLORS.border.medium,
          showButton: false,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name={config.icon} size={48} color={config.color} />
        <Text style={[styles.title, { color: config.color }]}>{config.title}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>{config.description}</Text>

        {/* Motivo de rejeição/revisão em destaque */}
        {(sellerVerification?.rejectionReason ||
          sellerVerification?.needsReviewReason) && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>
              {sellerVerification.status === 'rejected' ? 'Motivo:' : 'Observações do Administrador:'}
            </Text>
            <Text style={styles.reasonText}>
              {sellerVerification.rejectionReason || sellerVerification.needsReviewReason}
            </Text>
          </View>
        )}

        {/* Itens que precisam ser corrigidos */}
        {config.needsReviewReasons && config.needsReviewReasons.length > 0 && (
          <View style={styles.reasonsList}>
            <Text style={styles.reasonsListTitle}>Itens que precisam ser corrigidos:</Text>
            {config.needsReviewReasons.map((reason, index) => {
              const reasonLabels: Record<string, string> = {
                selfie_issue: 'Problemas na selfie',
                document_illegible: 'Documento ilegível',
                invalid_cpf: 'CPF inválido',
                document_expired: 'Documento vencido',
                document_mismatch: 'Documento não corresponde aos dados',
                missing_document_back: 'Falta documento verso',
                poor_photo_quality: 'Qualidade das fotos insuficiente',
                incomplete_data: 'Dados incompletos',
                other: 'Outro motivo',
              };
              return (
                <Text key={index} style={styles.reasonItem}>
                  • {reasonLabels[reason] || reason}
                </Text>
              );
            })}
          </View>
        )}

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

        {/* Botão de ação */}
        {config.showButton && config.buttonAction && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: config.color }]}
            onPress={config.buttonAction}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>{config.buttonText}</Text>
          </TouchableOpacity>
        )}

        {/* Botão de refresh (opcional) */}
        {onRefresh && (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.refreshText}>Atualizar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 20,
    marginBottom: 16,
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
  content: {
    gap: 12,
  },
  description: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
    textAlign: 'center',
  },
  reasonBox: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  reasonsList: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  reasonsListTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  reasonItem: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  blockedBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.states.warning,
  },
  blockedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.states.warning,
    marginBottom: 6,
  },
  blockedText: {
    fontSize: 12,
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  blockedDate: {
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    color: COLORS.text.secondary,
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
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
    color: COLORS.text.secondary,
  },
});

