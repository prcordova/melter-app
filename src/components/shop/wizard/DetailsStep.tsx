import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../../theme/colors';
import { showToast } from '../../CustomToast';
import { useAuth } from '../../../contexts/AuthContext';
import { subscriptionPlansApi } from '../../../services/api';
import { getImageUrl } from '../../../utils/image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../../config/api.config';
import axios from 'axios';
import { PlanLocker } from '../../PlanLocker';
import { FIXED_CATEGORIES } from '../../../constants/categories';

interface DetailsStepProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function DetailsStep({ formData, setFormData }: DetailsStepProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<
    Array<{ _id: string; name: string; price: number; isActive: boolean }>
  >([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Debug: Log quando formData mudar
  useEffect(() => {
    console.log('[DetailsStep] formData atualizado:', {
      hasFormData: !!formData,
      title: formData?.title,
      categoryId: formData?.categoryId,
      paymentMode: formData?.paymentMode,
    });
  }, [formData]);

  // Garantir que formData existe
  const safeFormData = formData || {
    title: '',
    description: '',
    tags: '',
    price: 10,
    categoryId: '',
    coverImage: null,
    paymentMode: 'UNICO' as const,
    subscriptionPlanId: undefined,
    allowDownload: false,
    allowCertificate: false,
    allowComments: 'ALL' as const,
    showViews: true,
    showLikes: true,
    layout: 'GRID' as const,
  };

  useEffect(() => {
    try {
      // Categorias fixas - não busca da API
      setCategories(FIXED_CATEGORIES);
      setLoadingCategories(false);
    } catch (error) {
      console.error('[DetailsStep] Erro ao inicializar categorias:', error);
    }
  }, []);

  useEffect(() => {
    try {
      if (safeFormData?.paymentMode === 'ASSINATURA') {
        fetchSubscriptionPlans();
      }
    } catch (error) {
      console.error('[DetailsStep] Erro no useEffect paymentMode:', error);
    }
  }, [safeFormData?.paymentMode]);

  // Auto-selecionar primeiro plano quando planos forem carregados
  useEffect(() => {
    try {
      if (
        safeFormData?.paymentMode === 'ASSINATURA' &&
        subscriptionPlans.length > 0 &&
        !safeFormData?.subscriptionPlanId
      ) {
        const firstActivePlan = subscriptionPlans.find((p) => p.isActive);
        if (firstActivePlan) {
          setFormData((prev: any) => ({
            ...prev,
            subscriptionPlanId: firstActivePlan._id,
          }));
        }
      }
    } catch (error) {
      console.error('[DetailsStep] Erro no useEffect subscriptionPlanId:', error);
    }
  }, [safeFormData?.paymentMode, subscriptionPlans]);

  const fetchSubscriptionPlans = async () => {
    if (!user) return;
    try {
      setLoadingPlans(true);
      const response = await subscriptionPlansApi.getPlans();
      if (response.success) {
        setSubscriptionPlans(response.data || []);
      }
    } catch (error) {
      console.error('[DetailsStep] Erro ao carregar planos:', error);
      setSubscriptionPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleImageUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast.error('Permissão negada', 'Precisamos de acesso à galeria');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        const asset = result.assets[0];

        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          showToast.error('Erro', 'Imagem muito grande. Máximo 5MB.');
          return;
        }

        setUploadingImage(true);

        try {
          const formDataUpload = new FormData();
          formDataUpload.append('file', {
            uri: asset.uri,
            type: 'image/jpeg',
            name: 'cover.jpg',
          } as any);

          const token = await AsyncStorage.getItem('token');
          const response = await axios.post(`${API_CONFIG.BASE_URL}/api/products/upload-cover`, formDataUpload, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
            timeout: 30000,
          });

          if (response.data.success) {
            const imageUrl = response.data.data?.url || response.data.url;
            setFormData((prev: any) => ({
              ...prev,
              coverImage: imageUrl,
            }));
            showToast.success('Sucesso', 'Imagem enviada com sucesso!');
          } else {
            if (response.data.upgradeRequired) {
              showToast.error(
                'Upgrade Necessário',
                `${response.data.message}\n\nFaça upgrade para ${response.data.nextPlan} e tenha acesso a mais recursos!`
              );
            } else {
              showToast.error('Erro', response.data.message || 'Erro ao enviar imagem');
            }
          }
        } catch (error: any) {
          console.error('[DetailsStep] Erro no upload:', error);
          showToast.error('Erro', error.response?.data?.message || 'Erro ao enviar imagem');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('[DetailsStep] Erro ao selecionar imagem:', error);
      showToast.error('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  if (!formData) {
    console.error('[DetailsStep] formData é undefined/null');
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Erro ao carregar formulário</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Informações Básicas */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.text.secondary} />
          <Text style={styles.sectionTitle}>Informações Básicas</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Título do Produto <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={safeFormData.title || ''}
            onChangeText={(text) => {
              try {
                const limitedText = text.slice(0, 100);
                setFormData((prev: any) => ({ ...prev, title: limitedText }));
              } catch (error) {
                console.error('[DetailsStep] Erro ao atualizar título:', error);
              }
            }}
            placeholder="Ex: Curso Completo de Marketing Digital"
            placeholderTextColor={COLORS.text.tertiary}
            maxLength={100}
          />
          <Text style={styles.helperText}>{(safeFormData.title || '').length}/100 caracteres</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descrição (Opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={safeFormData.description || ''}
            onChangeText={(text) => {
              try {
                const limitedText = text.slice(0, 1000);
                setFormData((prev: any) => ({ ...prev, description: limitedText }));
              } catch (error) {
                console.error('[DetailsStep] Erro ao atualizar descrição:', error);
              }
            }}
            placeholder="Descreva seu produto, o que o cliente vai receber, benefícios..."
            placeholderTextColor={COLORS.text.tertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.helperText}>{(safeFormData.description || '').length}/1000 caracteres</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Categoria <Text style={styles.required}>*</Text>
          </Text>
          {loadingCategories ? (
            <ActivityIndicator size="small" color={COLORS.secondary.main} />
          ) : (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={safeFormData.categoryId || ''}
                onValueChange={(value: string) => {
                  if (value !== undefined && value !== null) {
                    setFormData((prev: any) => ({
                      ...prev,
                      categoryId: String(value),
                    }));
                  }
                }}
                style={styles.picker}
              >
                <Picker.Item label="Selecione uma categoria" value="" />
                {categories.map((category) => {
                  const categoryValue = String(category._id || '');
                  return (
                    <Picker.Item
                      key={category._id}
                      label={category.name}
                      value={categoryValue}
                    />
                  );
                })}
              </Picker>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tags (Opcional)</Text>
          <TextInput
            style={styles.input}
            value={safeFormData.tags || ''}
            onChangeText={(text) => {
              try {
                setFormData((prev: any) => ({ ...prev, tags: text }));
              } catch (error) {
                console.error('[DetailsStep] Erro ao atualizar tags:', error);
              }
            }}
            placeholder="Ex: marketing, curso, tutorial, dicas (separadas por vírgula)"
            placeholderTextColor={COLORS.text.tertiary}
          />
          <Text style={styles.helperText}>
            Adicione palavras-chave para facilitar a busca do seu produto
          </Text>
        </View>
      </View>

      {/* Imagem de Capa */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="image-outline" size={20} color={COLORS.text.secondary} />
          <Text style={styles.sectionTitle}>Imagem de Capa</Text>
        </View>

        <PlanLocker requiredPlan="STARTER" currentPlan={user?.plan?.type}>
          {safeFormData.coverImage && (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: getImageUrl(safeFormData.coverImage) }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  try {
                    setFormData((prev: any) => ({ ...prev, coverImage: null }));
                  } catch (error) {
                    console.error('[DetailsStep] Erro ao remover imagem:', error);
                  }
                }}
              >
                <Ionicons name="close-circle" size={24} color={COLORS.states.error} />
              </TouchableOpacity>
            </View>
          )}

          {!safeFormData.coverImage && (
            <View style={styles.emptyImageBox}>
              <Text style={styles.emptyImageText}>Nenhuma imagem de capa selecionada</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.imageUploadButton}
            onPress={handleImageUpload}
            disabled={uploadingImage}
            activeOpacity={0.7}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color={COLORS.secondary.main} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color={COLORS.secondary.main} />
                <Text style={styles.imageUploadText}>
                  {safeFormData.coverImage ? 'Trocar Capa' : 'Adicionar Capa'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.helperText}>Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB</Text>
        </PlanLocker>
      </View>

      {/* Tipo de Venda */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="card-outline" size={20} color={COLORS.text.secondary} />
          <Text style={styles.sectionTitle}>Tipo de Venda</Text>
        </View>

        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[
              styles.radioOption,
              safeFormData.paymentMode === 'UNICO' && styles.radioOptionSelected,
            ]}
            onPress={() => {
              try {
                setFormData((prev: any) => ({
                  ...prev,
                  paymentMode: 'UNICO',
                  subscriptionScope: undefined,
                }));
              } catch (error) {
                console.error('[DetailsStep] Erro ao atualizar paymentMode:', error);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.radioContent}>
              <View style={styles.radioCircle}>
                {safeFormData.paymentMode === 'UNICO' && <View style={styles.radioCircleInner} />}
              </View>
              <View style={styles.radioTextContainer}>
                <View style={styles.radioHeader}>
                  <Ionicons name="cash-outline" size={18} color={COLORS.text.primary} />
                  <Text style={styles.radioTitle}>Venda Única</Text>
                </View>
                <Text style={styles.radioDescription}>
                  Cliente paga uma vez e tem acesso vitalício
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.radioOption,
              safeFormData.paymentMode === 'ASSINATURA' && styles.radioOptionSelected,
            ]}
            onPress={() => {
              try {
                setFormData((prev: any) => ({
                  ...prev,
                  paymentMode: 'ASSINATURA',
                  subscriptionScope: 'LOJA',
                }));
              } catch (error) {
                console.error('[DetailsStep] Erro ao atualizar paymentMode:', error);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.radioContent}>
              <View style={styles.radioCircle}>
                {safeFormData.paymentMode === 'ASSINATURA' && <View style={styles.radioCircleInner} />}
              </View>
              <View style={styles.radioTextContainer}>
                <View style={styles.radioHeader}>
                  <Ionicons name="repeat-outline" size={18} color={COLORS.text.primary} />
                  <Text style={styles.radioTitle}>Assinatura</Text>
                </View>
                <Text style={styles.radioDescription}>
                  Cliente paga periodicamente para manter acesso
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Preço (se UNICO) */}
        {safeFormData.paymentMode === 'UNICO' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Preço (R$) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={String(safeFormData.price || 10)}
              onChangeText={(text) => {
                try {
                  const numValue = Math.max(10, Number(text) || 10);
                  setFormData((prev: any) => ({ ...prev, price: numValue }));
                } catch (error) {
                  console.error('[DetailsStep] Erro ao atualizar preço:', error);
                }
              }}
              placeholder="10.00"
              placeholderTextColor={COLORS.text.tertiary}
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>Preço mínimo: R$ 10,00</Text>
          </View>
        )}

        {/* Plano de Assinatura (se ASSINATURA) */}
        {safeFormData.paymentMode === 'ASSINATURA' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Plano de Assinatura <Text style={styles.required}>*</Text>
            </Text>
            {loadingPlans ? (
              <ActivityIndicator size="small" color={COLORS.secondary.main} />
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={safeFormData.subscriptionPlanId || ''}
                  onValueChange={(value) => {
                    try {
                      setFormData((prev: any) => ({
                        ...prev,
                        subscriptionPlanId: value || undefined,
                      }));
                    } catch (error) {
                      console.error('[DetailsStep] Erro ao atualizar subscriptionPlanId:', error);
                    }
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecione um plano" value="" />
                  {subscriptionPlans
                    .filter((plan) => plan.isActive)
                    .map((plan) => (
                      <Picker.Item
                        key={plan._id}
                        label={`${plan.name} - R$ ${plan.price.toFixed(2)}`}
                        value={plan._id}
                      />
                    ))}
                </Picker>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Configurações */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="settings-outline" size={20} color={COLORS.text.secondary} />
          <Text style={styles.sectionTitle}>Configurações</Text>
        </View>

        <View style={styles.switchGroup}>
          <Text style={styles.switchLabel}>Permitir download dos arquivos</Text>
          <Switch
            value={safeFormData.allowDownload || false}
            onValueChange={(value) => {
              try {
                setFormData((prev: any) => ({ ...prev, allowDownload: value }));
              } catch (error) {
                console.error('[DetailsStep] Erro ao atualizar allowDownload:', error);
              }
            }}
            trackColor={{
              false: COLORS.border.medium,
              true: COLORS.secondary.main,
            }}
            thumbColor={safeFormData.allowDownload ? '#ffffff' : COLORS.text.tertiary}
          />
        </View>

        <View style={styles.switchGroup}>
          <Text style={styles.switchLabel}>Mostrar visualizações</Text>
          <Switch
            value={safeFormData.showViews !== false}
            onValueChange={(value) => {
              try {
                setFormData((prev: any) => ({ ...prev, showViews: value }));
              } catch (error) {
                console.error('[DetailsStep] Erro ao atualizar showViews:', error);
              }
            }}
            trackColor={{
              false: COLORS.border.medium,
              true: COLORS.secondary.main,
            }}
            thumbColor={safeFormData.showViews !== false ? '#ffffff' : COLORS.text.tertiary}
          />
        </View>

        <View style={styles.switchGroup}>
          <Text style={styles.switchLabel}>Mostrar curtidas</Text>
          <Switch
            value={safeFormData.showLikes !== false}
            onValueChange={(value) => {
              try {
                setFormData((prev: any) => ({ ...prev, showLikes: value }));
              } catch (error) {
                console.error('[DetailsStep] Erro ao atualizar showLikes:', error);
              }
            }}
            trackColor={{
              false: COLORS.border.medium,
              true: COLORS.secondary.main,
            }}
            thumbColor={safeFormData.showLikes !== false ? '#ffffff' : COLORS.text.tertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Comentários</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={safeFormData.allowComments || 'ALL'}
              onValueChange={(value) => {
                try {
                  setFormData((prev: any) => ({ ...prev, allowComments: value }));
                } catch (error) {
                  console.error('[DetailsStep] Erro ao atualizar allowComments:', error);
                }
              }}
              style={styles.picker}
            >
              <Picker.Item label="Todos" value="ALL" />
              <Picker.Item label="Sob Análise" value="MODERATED" />
              <Picker.Item label="Nenhum" value="NONE" />
            </Picker>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
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
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.background.paper,
    borderRadius: 20,
    padding: 4,
  },
  emptyImageBox: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.border.light,
    borderStyle: 'dashed',
  },
  emptyImageText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  imageUploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary.main,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  required: {
    color: COLORS.states.error,
  },
  input: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.states.error,
    textAlign: 'center',
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  picker: {
    color: COLORS.text.primary,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border.light,
  },
  radioOptionSelected: {
    borderColor: COLORS.secondary.main,
    backgroundColor: COLORS.secondary.main + '10',
  },
  radioContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.secondary.main,
  },
  radioTextContainer: {
    flex: 1,
  },
  radioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  radioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  radioDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginLeft: 26,
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  switchLabel: {
    fontSize: 14,
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 12,
  },
});

