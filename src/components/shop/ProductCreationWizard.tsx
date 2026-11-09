import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import { ContentStep, type ProductStorageOptions } from './wizard/ContentStep';
import { DetailsStep } from './wizard/DetailsStep';
import { ReviewStep } from './wizard/ReviewStep';
import { ProductPackageQualityThermometer } from './wizard/ProductPackageQualityThermometer';
import { WizardStorageUsageBar } from './wizard/WizardStorageUsageBar';
import { showToast } from '../CustomToast';
import { DEFAULT_PACK_CATEGORY_ID } from '../../constants/categories';
import {
  buildWizardDigitalPayload,
  mapProductDigitalToWizard,
  normalizeDraftTitleForWizard,
  resolveWizardCategoryId,
  type PackContentDeliveryMode,
} from '../../lib/products/product-wizard-form';

export interface ProductCreationWizardProps {
  visible: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  /** Produto em edição ou rascunho retomado (`status: 'DRAFT'`). */
  product?: any;
  saving?: boolean;
  overallProgress?: number;
  /** De `meta.productCoverAvatarFallbackEnabled` (admin). */
  productCoverAvatarFallbackEnabled?: boolean;
  /** Limites resolvidos no servidor (`shopPlanGate.productCreationLimits`) + plano mínimo da loja. */
  storageOptions?: ProductStorageOptions;
  /** Rascunho criado nesta sessão (pacote novo). */
  draftProductId?: string | null;
  /** Cria o rascunho no servidor quando ainda não existe (vídeo de apresentação). */
  onEnsureDraft?: () => Promise<string>;
}

const steps = ['Conteúdo', 'Detalhes', 'Revisão'];

export type { PackContentDeliveryMode };

export function ProductCreationWizard({
  visible,
  onClose,
  onSave,
  product,
  saving = false,
  overallProgress = 0,
  productCoverAvatarFallbackEnabled = true,
  storageOptions,
  draftProductId = null,
  onEnsureDraft,
}: ProductCreationWizardProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isTinyScreen = windowWidth < 400;
  const isDraft = product?.status === 'DRAFT';
  const isEditing = Boolean(product) && !isDraft;
  const serverProductId = product?._id ? String(product._id) : draftProductId;
  const [activeStep, setActiveStep] = useState(0);
  const [showMediaRequiredError, setShowMediaRequiredError] = useState(false);
  /** Dentro de Modal, o Android ignora muito o KAV; padding extra libera rolagem dos links. */
  const [keyboardInset, setKeyboardInset] = useState(0);

  const [formData, setFormData] = useState({
    // Step 1: Conteúdo
    contentDeliveryMode: null as PackContentDeliveryMode | null,
    files: [] as any[],
    links: [] as Array<{ id: string; url: string; title: string; description: string }>,
    modules: [] as any[],

    // Step 2: Detalhes
    title: '',
    description: '',
    tags: '',
    price: 10,
    categoryId: '',
    coverImage: null as string | null,
    paymentMode: 'UNICO' as 'UNICO' | 'ASSINATURA',
    subscriptionScope: undefined as 'PRODUTO' | 'CATEGORIA' | 'LOJA' | undefined,
    subscriptionInterval: 30,
    subscriptionPlanId: undefined as string | undefined,

    // Configurações
    allowDownload: false,
    allowCertificate: false,
    allowComments: 'ALL' as 'ALL' | 'MODERATED' | 'NONE',
    showViews: true,
    showLikes: true,
    isAiContent: false,
    layout: 'GRID' as 'GRID' | 'COURSE',

    // Step 3: Validações
    contentValidations: {
      readTerms: false,
      noViolence: false,
      noThirdParty: false,
      ownContent: false,
      noHateSpeech: false,
      noSpam: false,
    },
  });

  // Reset step quando modal fechar
  useEffect(() => {
    if (!visible) {
      setActiveStep(0);
      setKeyboardInset(0);
      setShowMediaRequiredError(false);
    }
  }, [visible]);

  const formHasHostedMedia = (files: any[] | undefined) =>
    Boolean(
      files?.length &&
        files.some(
          (f: { existing?: boolean; url?: string; uri?: string }) =>
            Boolean(f.uri || f.url) || Boolean(f.existing)
        )
    );

  useEffect(() => {
    if (formHasHostedMedia(formData.files)) {
      setShowMediaRequiredError(false);
    }
  }, [formData.files]);

  useEffect(() => {
    if (!visible) return;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardInset(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardInset(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  // Preencher dados se estiver editando
  useEffect(() => {
    if (product && visible) {
      const { files, links, contentDeliveryMode } = mapProductDigitalToWizard(product);
      if (isDraft && typeof product.draftWizardStep === 'number') {
        setActiveStep(Math.max(0, Math.min(steps.length - 1, product.draftWizardStep)));
      }

      setFormData({
        contentDeliveryMode,
        files,
        links,
        modules: [],
        title: normalizeDraftTitleForWizard(product.title),
        description: product.description || '',
        tags: product.tags || '',
        price: product.price || 10,
        categoryId: resolveWizardCategoryId(product),
        coverImage: product.coverImage || null,
        paymentMode: product.paymentMode || 'UNICO',
        subscriptionScope: product.subscriptionScope || undefined,
        subscriptionInterval: product.subscriptionInterval || 30,
        subscriptionPlanId:
          product.subscriptionPlanId ||
          (typeof product.subscriptionPlan === 'object' && product.subscriptionPlan?._id
            ? product.subscriptionPlan._id
            : undefined),
        allowDownload: product.digital?.allowDownload || false,
        allowCertificate: product.allowCertificate || false,
        allowComments: product.allowComments || 'ALL',
        showViews: product.showViews !== undefined ? product.showViews : true,
        showLikes: product.showLikes !== undefined ? product.showLikes : true,
        isAiContent: Boolean(product.isAiContent),
        layout: product.layout || 'GRID',
        contentValidations: product.contentValidations || {
          readTerms: false,
          noViolence: false,
          noThirdParty: false,
          ownContent: false,
          noHateSpeech: false,
          noSpam: false,
        },
      });
    } else if (!product && visible) {
      // Reset para novo produto
      setFormData({
        contentDeliveryMode: null,
        files: [],
        links: [],
        modules: [],
        title: '',
        description: '',
        tags: '',
        price: 10,
        categoryId: DEFAULT_PACK_CATEGORY_ID,
        coverImage: null,
        paymentMode: 'UNICO',
        subscriptionScope: undefined,
        subscriptionInterval: 30,
        subscriptionPlanId: undefined,
        allowDownload: false,
        allowCertificate: false,
        allowComments: 'ALL',
        showViews: true,
        showLikes: true,
        isAiContent: false,
        layout: 'GRID',
        contentValidations: {
          readTerms: false,
          noViolence: false,
          noThirdParty: false,
          ownContent: false,
          noHateSpeech: false,
          noSpam: false,
        },
      });
    }
  }, [product, visible]);

  const canProceedToNext = (step: number): boolean => {
    try {
      switch (step) {
        case 0: {
          if (!isEditing && !formData.contentDeliveryMode) return false;
          return true;
        }
        case 1: // Detalhes
          const hasTitle = Boolean(formData.title && String(formData.title).trim() !== '');
          const hasCategory = Boolean(formData.categoryId && String(formData.categoryId).trim() !== '');

          if (formData.paymentMode === 'ASSINATURA') {
            return hasTitle && hasCategory && !!formData.subscriptionPlanId;
          } else {
            const price = Number(formData.price) || 0;
            return hasTitle && hasCategory && price >= 10;
          }
        case 2: // Revisão
          const validations = formData.contentValidations || {};
          return (
            validations.readTerms &&
            validations.noViolence &&
            validations.noThirdParty &&
            validations.ownContent &&
            validations.noHateSpeech &&
            validations.noSpam
          );
        default:
          return false;
      }
    } catch (error) {
      console.error('[ProductCreationWizard] Erro ao validar step:', error);
      return false;
    }
  };

  const handleNext = () => {
    try {
      if (!canProceedToNext(activeStep)) return;

      if (activeStep === 0 && !formHasHostedMedia(formData.files)) {
        setShowMediaRequiredError(true);
        showToast.error(
          'Arquivo obrigatório',
          'Envie pelo menos um arquivo de mídia. Links sozinhos não são suficientes.'
        );
        return;
      }

      setShowMediaRequiredError(false);
      setActiveStep((prev) => prev + 1);
    } catch (error) {
      console.error('[ProductCreationWizard] Erro ao avançar step:', error);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleStepClick = (stepIndex: number) => {
    if (saving || stepIndex >= activeStep) return;
    setShowMediaRequiredError(false);
    setActiveStep(stepIndex);
  };

  const resetContentDeliveryChoice = () => {
    setFormData((prev) => ({
      ...prev,
      contentDeliveryMode: null,
      links: [],
    }));
  };

  const handleSave = () => {
    onSave({
      ...formData,
      isAdultContent: formData.categoryId === 'conteudo-18',
      isAiContent: Boolean(formData.isAiContent),
      digital: buildWizardDigitalPayload(formData),
    });
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <ContentStep
            formData={formData}
            setFormData={setFormData}
            isEditing={isEditing}
            productId={serverProductId}
            showMediaRequiredError={showMediaRequiredError}
            storageOptions={storageOptions}
          />
        );
      case 1:
        return (
          <DetailsStep
            formData={formData}
            setFormData={setFormData}
            productId={serverProductId}
            onEnsureDraft={isEditing ? undefined : onEnsureDraft}
            lockPaymentAndPlan={isEditing}
            lockCategory={product?.status === 'APPROVED'}
            productCoverAvatarFallbackEnabled={productCoverAvatarFallbackEnabled}
          />
        );
      case 2:
        return (
          <ReviewStep
            formData={formData}
            setFormData={setFormData}
            canProceed={canProceedToNext(2)}
          />
        );
      default:
        return null;
    }
  };

  const showStorageUsage =
    activeStep === 0 && Boolean(isEditing || formData.contentDeliveryMode);

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 12) : 0}
        enabled={Platform.OS === 'ios'}
      >
        <View
          style={[
            styles.overlay,
            isTinyScreen && styles.overlayFullScreen,
            { paddingTop: isTinyScreen ? 0 : Math.max(insets.top, 12) },
          ]}
        >
          <View style={[styles.modalContainer, isTinyScreen && styles.modalContainerFullScreen]}>
            {/* Header */}
            <View
              style={[
                styles.header,
                isTinyScreen && { paddingTop: Math.max(insets.top, 12) },
              ]}
            >
              <Text style={styles.title}>
                {isEditing ? 'Editar Produto' : 'Criar Produto Digital'}
              </Text>
              <TouchableOpacity onPress={handleClose} disabled={saving}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Stepper */}
            <View style={styles.stepperContainer}>
              {steps.map((label, index) => (
                <View key={label} style={styles.stepWrapper}>
                  <TouchableOpacity
                    style={styles.stepContainer}
                    onPress={() => handleStepClick(index)}
                    disabled={saving || index >= activeStep}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Voltar para ${label}`}
                    accessibilityState={{ disabled: saving || index >= activeStep }}
                  >
                    <View
                      style={[
                        styles.stepCircle,
                        index === activeStep && styles.stepCircleActive,
                        index < activeStep && styles.stepCircleCompleted,
                      ]}
                    >
                      {index < activeStep ? (
                        <Ionicons name="checkmark" size={16} color="#ffffff" />
                      ) : (
                        <Text
                          style={[
                            styles.stepNumber,
                            index === activeStep && styles.stepNumberActive,
                            index < activeStep && styles.stepNumberCompleted,
                          ]}
                        >
                          {index + 1}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        index === activeStep && styles.stepLabelActive,
                        index < activeStep && styles.stepLabelCompleted,
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                  {index < steps.length - 1 && (
                    <View
                      style={[
                        styles.stepLine,
                        index < activeStep && styles.stepLineCompleted,
                      ]}
                    />
                  )}
                </View>
              ))}
            </View>

            {/* Progress Bar */}
            {saving && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${overallProgress}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {isEditing ? 'Salvando...' : 'Enviando pacote...'} {overallProgress}%
                </Text>
              </View>
            )}

            {/* Step Content */}
            <View style={styles.contentWrapper}>
              <ScrollView
                style={styles.content}
                contentContainerStyle={[
                  styles.contentContainer,
                  {
                    paddingBottom:
                      40 + keyboardInset + Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8),
                  },
                ]}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
                keyboardDismissMode="on-drag"
              >
                {product?.analysisNotes ? (
                  <View
                    style={[
                      styles.analysisNotes,
                      product.status === 'REJECTED' && styles.analysisNotesRejected,
                    ]}
                  >
                    <Text style={styles.analysisNotesTitle}>Observações da análise</Text>
                    <Text style={styles.analysisNotesText}>{product.analysisNotes}</Text>
                  </View>
                ) : null}
                {isEditing || formData.contentDeliveryMode ? (
                  <View style={styles.qualityThermometer}>
                    <ProductPackageQualityThermometer formData={formData} />
                  </View>
                ) : null}
                {getStepContent()}
              </ScrollView>
            </View>

            {showStorageUsage ? (
              <WizardStorageUsageBar files={formData.files} storageOptions={storageOptions} />
            ) : null}

            {/* Footer */}
            <View style={[styles.footer, showStorageUsage && styles.footerAttached]}>
              <TouchableOpacity
                style={[styles.button, styles.backButton]}
                onPress={
                  activeStep === 0
                    ? formData.contentDeliveryMode && !isEditing
                      ? resetContentDeliveryChoice
                      : handleClose
                    : handleBack
                }
                disabled={saving}
              >
                <Text style={styles.backButtonText}>
                  {activeStep === 0
                    ? formData.contentDeliveryMode && !isEditing
                      ? 'Voltar'
                      : 'Cancelar'
                    : 'Voltar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.nextButton,
                  (!canProceedToNext(activeStep) || saving) && styles.nextButtonDisabled,
                ]}
                onPress={activeStep === steps.length - 1 ? handleSave : handleNext}
                disabled={!canProceedToNext(activeStep) || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.nextButtonText}>
                    {activeStep === steps.length - 1
                      ? isEditing
                        ? 'Salvar'
                        : 'Enviar para análise'
                      : 'Avançar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'flex-end',
  },
  overlayFullScreen: {
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    width: '100%',
    backgroundColor: c.background.paper,
  },
  modalContainer: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: c.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
    overflow: 'hidden',
  },
  modalContainerFullScreen: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: c.border.light,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: c.text.primary,
    flex: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border.light,
  },
  stepWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    zIndex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.background.tertiary,
    borderWidth: 2,
    borderColor: c.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: c.secondary.main,
    borderColor: c.secondary.main,
  },
  stepCircleCompleted: {
    backgroundColor: c.secondary.main,
    borderColor: c.secondary.main,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text.secondary,
  },
  stepNumberActive: {
    color: '#ffffff',
  },
  stepNumberCompleted: {
    color: '#ffffff',
  },
  stepLabel: {
    fontSize: 11,
    color: c.text.secondary,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: c.secondary.main,
    fontWeight: '600',
  },
  stepLabelCompleted: {
    color: c.text.secondary,
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 16,
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: c.border.medium,
    zIndex: 0,
  },
  stepLineCompleted: {
    backgroundColor: c.secondary.main,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border.light,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: c.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: c.secondary.main,
  },
  progressText: {
    fontSize: 12,
    color: c.text.secondary,
    textAlign: 'center',
  },
  analysisNotes: {
    borderWidth: 1,
    borderColor: c.states.warning,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  qualityThermometer: {
    marginBottom: 16,
  },
  analysisNotesRejected: {
    borderColor: c.states.error,
  },
  analysisNotesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.text.primary,
    marginBottom: 4,
  },
  analysisNotesText: {
    fontSize: 13,
    color: c.text.secondary,
  },
  contentWrapper: {
    flex: 1,
    minHeight: 0, // Importante para ScrollView funcionar dentro de flex
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: c.border.light,
  },
  footerAttached: {
    borderTopWidth: 0,
    paddingTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: c.background.tertiary,
    borderWidth: 1,
    borderColor: c.border.medium,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text.primary,
  },
  nextButton: {
    backgroundColor: c.secondary.main,
  },
  nextButtonDisabled: {
    backgroundColor: c.border.medium,
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

