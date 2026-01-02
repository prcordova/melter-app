import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../../theme/colors';

interface ReviewStepProps {
  formData: any;
  setFormData: (data: any) => void;
  canProceed?: boolean;
}

export function ReviewStep({ formData, setFormData, canProceed = true }: ReviewStepProps) {
  // Garantir que contentValidations existe
  const contentValidations = formData.contentValidations || {
    readTerms: false,
    noViolence: false,
    noThirdParty: false,
    ownContent: false,
    noHateSpeech: false,
    noSpam: false,
  };

  const handleAcceptAll = (checked: boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      contentValidations: {
        readTerms: checked,
        noViolence: checked,
        noThirdParty: checked,
        ownContent: checked,
        noHateSpeech: checked,
        noSpam: checked,
      },
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const allValidationsChecked = Object.values(contentValidations).every(Boolean);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Resumo do Produto */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={20} color={COLORS.text.secondary} />
          <Text style={styles.sectionTitle}>Resumo do Produto</Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Título:</Text>
            <Text style={styles.summaryValue}>{formData.title || 'Não informado'}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Preço:</Text>
            <Text style={styles.summaryValue}>
              {formData.paymentMode === 'UNICO'
                ? `R$ ${formData.price?.toFixed(2) || '0,00'}`
                : 'Assinatura'}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Tipo:</Text>
            <Text style={styles.summaryValue}>
              {formData.paymentMode === 'UNICO' ? 'Venda Única' : 'Assinatura'}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Download:</Text>
            <Text style={styles.summaryValue}>
              {formData.allowDownload ? 'Permitido' : 'Não permitido'}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Comentários:</Text>
            <Text style={styles.summaryValue}>
              {formData.allowComments === 'ALL'
                ? 'Todos'
                : formData.allowComments === 'MODERATED'
                ? 'Moderados'
                : 'Desabilitados'}
            </Text>
          </View>
        </View>
      </View>

      {/* Conteúdo Adicionado */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="folder-outline" size={20} color={COLORS.text.secondary} />
          <Text style={styles.sectionTitle}>Conteúdo Adicionado</Text>
        </View>

        <View style={styles.chipsContainer}>
          <View
            style={[
              styles.chip,
              (formData.links?.length || 0) > 0 && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                (formData.links?.length || 0) > 0 && styles.chipTextActive,
              ]}
            >
              {formData.links?.length || 0} Links
            </Text>
          </View>
          <View
            style={[
              styles.chip,
              (formData.files?.length || 0) > 0 && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                (formData.files?.length || 0) > 0 && styles.chipTextActive,
              ]}
            >
              {formData.files?.length || 0} Arquivos
            </Text>
          </View>
          {!formData.links?.length && !formData.files?.length && (
            <View style={[styles.chip, styles.chipWarning]}>
              <Text style={[styles.chipText, styles.chipTextWarning]}>Produto Vazio</Text>
            </View>
          )}
        </View>

        {formData.links?.length > 0 && (
          <View style={styles.contentList}>
            <Text style={styles.contentListTitle}>Links Externos:</Text>
            {formData.links.map((link: any, index: number) => (
              <View key={link.id} style={styles.contentItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={COLORS.states.success}
                />
                <View style={styles.contentItemText}>
                  <Text style={styles.contentItemTitle}>
                    {link.title || `Link ${index + 1}`}
                  </Text>
                  <Text style={styles.contentItemSubtitle} numberOfLines={1}>
                    {link.url}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {formData.files?.length > 0 && (
          <View style={styles.contentList}>
            <Text style={styles.contentListTitle}>Arquivos:</Text>
            {formData.files.map((file: any, index: number) => (
              <View key={file.id} style={styles.contentItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={COLORS.states.success}
                />
                <View style={styles.contentItemText}>
                  <Text style={styles.contentItemTitle}>{file.name}</Text>
                  <Text style={styles.contentItemSubtitle}>
                    {formatFileSize(file.size)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Validações de Conteúdo */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.text.secondary} />
          <Text style={styles.sectionTitle}>Validações de Conteúdo</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Confirme que seu conteúdo está em conformidade com nossos termos de uso.
          </Text>
        </View>

        {/* Lista de Validações */}
        <View style={styles.validationsList}>
          <View style={styles.validationListItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.validationListItemText}>
              Li e aceito os Termos de Uso
            </Text>
          </View>
          <View style={styles.validationListItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.validationListItemText}>
              Sou o proprietário legítimo deste conteúdo
            </Text>
          </View>
          <View style={styles.validationListItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.validationListItemText}>
              O conteúdo não é de terceiros
            </Text>
          </View>
          <View style={styles.validationListItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.validationListItemText}>
              Não contém violência ou conteúdo violento
            </Text>
          </View>
          <View style={styles.validationListItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.validationListItemText}>
              Não contém discurso de ódio
            </Text>
          </View>
          <View style={styles.validationListItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.validationListItemText}>
              Não contém spam ou conteúdo enganoso
            </Text>
          </View>
        </View>

        {!canProceed && !allValidationsChecked && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Você deve confirmar todas as validações para continuar
            </Text>
          </View>
        )}

        {/* Toggle único para aceitar todas as regras */}
        <View style={[styles.validationItem, !allValidationsChecked && styles.validationItemError]}>
          <View style={styles.validationContent}>
            <Text style={styles.validationTitle}>
              Concordo com todas as regras e diretrizes
            </Text>
            <Text style={styles.validationDescription}>
              Ao ativar este toggle, você confirma que leu e concorda com todas as validações listadas acima.
            </Text>
          </View>
          <Switch
            value={allValidationsChecked}
            onValueChange={handleAcceptAll}
            trackColor={{
              false: COLORS.border.medium,
              true: COLORS.secondary.main,
            }}
            thumbColor={allValidationsChecked ? '#ffffff' : COLORS.text.tertiary}
          />
        </View>

        {/* Aviso Final */}
        <View style={styles.finalWarningBox}>
          <Text style={styles.finalWarningText}>
            ⚠️ <Text style={styles.finalWarningBold}>Importante:</Text> Conteúdo que viole estas
            diretrizes será removido e pode resultar em suspensão da conta. Você é responsável por
            garantir que tem todos os direitos sobre o conteúdo que publica.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  summaryGrid: {
    gap: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  chipActive: {
    backgroundColor: COLORS.secondary.main + '20',
    borderColor: COLORS.secondary.main,
  },
  chipWarning: {
    backgroundColor: COLORS.states.warning + '20',
    borderColor: COLORS.states.warning,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.secondary.main,
  },
  chipTextWarning: {
    color: COLORS.states.warning,
  },
  contentList: {
    marginTop: 12,
  },
  contentListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  contentItemText: {
    flex: 1,
  },
  contentItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  contentItemSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: COLORS.states.info + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.states.info,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  warningBox: {
    backgroundColor: COLORS.states.warning + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.states.warning,
  },
  warningText: {
    fontSize: 14,
    color: COLORS.states.warning,
    fontWeight: '600',
  },
  validationsList: {
    gap: 12,
    marginBottom: 16,
  },
  validationListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  validationListItemText: {
    fontSize: 13,
    color: COLORS.text.secondary,
    flex: 1,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  validationItemError: {
    borderColor: COLORS.states.error,
    backgroundColor: COLORS.states.error + '10',
  },
  validationContent: {
    flex: 1,
    marginRight: 12,
  },
  validationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  validationDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  finalWarningBox: {
    backgroundColor: COLORS.states.warning + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.states.warning,
  },
  finalWarningText: {
    fontSize: 11,
    color: COLORS.text.primary,
    lineHeight: 16,
  },
  finalWarningBold: {
    fontWeight: '600',
  },
});

