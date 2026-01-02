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
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import { ContentStep } from './wizard/ContentStep';
import { DetailsStep } from './wizard/DetailsStep';
import { ReviewStep } from './wizard/ReviewStep';

interface ProductCreationWizardProps {
  visible: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  product?: any;
  saving?: boolean;
  overallProgress?: number;
}

const steps = ['Conteúdo', 'Detalhes', 'Revisão'];

export function ProductCreationWizard({
  visible,
  onClose,
  onSave,
  product,
  saving = false,
  overallProgress = 0,
}: ProductCreationWizardProps) {
  const insets = useSafeAreaInsets();
  const [activeStep, setActiveStep] = useState(0);

  const [formData, setFormData] = useState({
    // Step 1: Conteúdo
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
    }
  }, [visible]);

  // Preencher dados se estiver editando
  useEffect(() => {
    if (product && visible) {
      setFormData({
        files: product.digital?.files || [],
        links: product.digital?.downloadUrl
          ? [
              {
                id: '1',
                url: product.digital.downloadUrl,
                title: product.digital.fileName || '',
                description: '',
              },
            ]
          : [],
        modules: [],
        title: product.title || '',
        description: product.description || '',
        tags: product.tags || '',
        price: product.price || 10,
        categoryId: product.categoryId || '',
        coverImage: product.coverImage || null,
        paymentMode: product.paymentMode || 'UNICO',
        subscriptionScope: product.subscriptionScope || undefined,
        subscriptionInterval: product.subscriptionInterval || 30,
        subscriptionPlanId: product.subscriptionPlanId || undefined,
        allowDownload: product.digital?.allowDownload || false,
        allowCertificate: product.allowCertificate || false,
        allowComments: product.allowComments || 'ALL',
        showViews: product.showViews !== undefined ? product.showViews : true,
        showLikes: product.showLikes !== undefined ? product.showLikes : true,
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
        files: [],
        links: [],
        modules: [],
        title: '',
        description: '',
        tags: '',
        price: 10,
        categoryId: '',
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
    switch (step) {
      case 0: // Conteúdo - precisa ter pelo menos um link ou arquivo
        return (
          (formData.links && formData.links.length > 0) ||
          (formData.files && formData.files.length > 0)
        );
      case 1: // Detalhes
        const hasTitle = formData.title.trim() !== '';
        const hasCategory = formData.categoryId.trim() !== '';

        if (formData.paymentMode === 'ASSINATURA') {
          return hasTitle && hasCategory && !!formData.subscriptionPlanId;
        } else {
          return hasTitle && hasCategory && formData.price >= 10;
        }
      case 2: // Revisão
        const validations = formData.contentValidations;
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
  };

  const handleNext = () => {
    if (canProceedToNext(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSave = () => {
    // Preparar dados para o backend
    const productData = {
      title: formData.title,
      description: formData.description,
      tags: formData.tags,
      categoryId: formData.categoryId,
      coverImage: formData.coverImage,
      type: 'DIGITAL_PACK',
      paymentMode: formData.paymentMode,
      subscriptionPlanId:
        formData.paymentMode === 'ASSINATURA' ? formData.subscriptionPlanId : undefined,
      subscriptionScope: formData.paymentMode === 'ASSINATURA' ? 'LOJA' : undefined,
      price: formData.paymentMode === 'ASSINATURA' ? 0 : formData.price,
      isActive: true,
      stock: null,
      allowComments: formData.allowComments,
      showViews: formData.showViews,
      showLikes: formData.showLikes,
      allowCertificate: formData.allowCertificate,
      isAdultContent: formData.categoryId === 'conteudo-18',
      contentValidations: formData.contentValidations,
      digital: {
        downloadUrl:
          formData.links && formData.links.length > 0 ? formData.links[0].url : '',
        fileName:
          formData.links && formData.links.length > 0 ? formData.links[0].title : '',
        allowDownload: formData.allowDownload,
        fileSize: 0,
        files: formData.files || [],
      },
    };

    onSave(productData);
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <ContentStep formData={formData} setFormData={setFormData} />
        );
      case 1:
        return <DetailsStep formData={formData} setFormData={setFormData} />;
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 12) }]}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>
                {product ? 'Editar Produto' : 'Criar Produto Digital'}
              </Text>
              <TouchableOpacity onPress={handleClose} disabled={saving}>
                <Ionicons name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Stepper */}
            <View style={styles.stepperContainer}>
              {steps.map((label, index) => (
                <View key={label} style={styles.stepWrapper}>
                  <View style={styles.stepContainer}>
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
                  </View>
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
                <Text style={styles.progressText}>Criando produto... {overallProgress}%</Text>
              </View>
            )}

            {/* Step Content */}
            <View style={styles.contentWrapper}>
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                {getStepContent()}
              </ScrollView>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.backButton]}
                onPress={activeStep === 0 ? handleClose : handleBack}
                disabled={saving}
              >
                <Text style={styles.backButtonText}>
                  {activeStep === 0 ? 'Cancelar' : 'Voltar'}
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
                    {activeStep === steps.length - 1 ? 'Criar Produto' : 'Avançar'}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
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
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 2,
    borderColor: COLORS.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: COLORS.secondary.main,
    borderColor: COLORS.secondary.main,
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.states.success,
    borderColor: COLORS.states.success,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  stepNumberActive: {
    color: '#ffffff',
  },
  stepNumberCompleted: {
    color: '#ffffff',
  },
  stepLabel: {
    fontSize: 11,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: COLORS.secondary.main,
    fontWeight: '600',
  },
  stepLabelCompleted: {
    color: COLORS.states.success,
    fontWeight: '600',
  },
  stepLine: {
    position: 'absolute',
    top: 16,
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: COLORS.border.medium,
    zIndex: 0,
  },
  stepLineCompleted: {
    backgroundColor: COLORS.states.success,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.secondary.main,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
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
    borderTopColor: COLORS.border.light,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  nextButton: {
    backgroundColor: COLORS.secondary.main,
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.border.medium,
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

