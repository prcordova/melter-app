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

  useEffect(() => {
    // Categorias fixas - não busca da API
    setCategories(FIXED_CATEGORIES);
    setLoadingCategories(false);
  }, []);

  useEffect(() => {
    if (formData.paymentMode === 'ASSINATURA') {
      fetchSubscriptionPlans();
    }
  }, [formData.paymentMode]);

  // Auto-selecionar primeiro plano quando planos forem carregados
  useEffect(() => {
    if (
      formData.paymentMode === 'ASSINATURA' &&
      subscriptionPlans.length > 0 &&
      !formData.subscriptionPlanId
    ) {
      const firstActivePlan = subscriptionPlans.find((p) => p.isActive);
      if (firstActivePlan) {
        setFormData({
          ...formData,
          subscriptionPlanId: firstActivePlan._id,
        });
      }
    }
  }, [formData.paymentMode, subscriptionPlans]);

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
            setFormData({
              ...formData,
              coverImage: imageUrl,
            });
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
            value={formData.title}
            onChangeText={(text) => {
              const limitedText = text.slice(0, 100);
              setFormData({ ...formData, title: limitedText });
            }}
            placeholder="Ex: Curso Completo de Marketing Digital"
            placeholderTextColor={COLORS.text.tertiary}
            maxLength={100}
          />
          <Text style={styles.helperText}>{formData.title.length}/100 caracteres</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descrição (Opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => {
              const limitedText = text.slice(0, 1000);
              setFormData({ ...formData, description: limitedText });
            }}
            placeholder="Descreva seu produto, o que o cliente vai receber, benefícios..."
            placeholderTextColor={COLORS.text.tertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.helperText}>{formData.description.length}/1000 caracteres</Text>
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
                selectedValue={formData.categoryId || ''}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                style={styles.picker}
              >
                <Picker.Item label="Selecione uma categoria" value="" />
                {categories.map((category) => (
                  <Picker.Item key={category._id} label={category.name} value={category._id} />
                ))}
              </Picker>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tags (Opcional)</Text>
          <TextInput
            style={styles.input}
            value={formData.tags || ''}
            onChangeText={(text) => setFormData({ ...formData, tags: text })}
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
          {formData.coverImage && (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: getImageUrl(formData.coverImage) }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setFormData({ ...formData, coverImage: null })}
              >
                <Ionicons name="close-circle" size={24} color={COLORS.states.error} />
              </TouchableOpacity>
            </View>
          )}

          {!formData.coverImage && (
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
                  {formData.coverImage ? 'Trocar Capa' : 'Adicionar Capa'}
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
              formData.paymentMode === 'UNICO' && styles.radioOptionSelected,
            ]}
            onPress={() =>
              setFormData({
                ...formData,
                paymentMode: 'UNICO',
                subscriptionScope: undefined,
              })
            }
            activeOpacity={0.7}
          >
            <View style={styles.radioContent}>
              <View style={styles.radioCircle}>
                {formData.paymentMode === 'UNICO' && <View style={styles.radioCircleInner} />}
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
              formData.paymentMode === 'ASSINATURA' && styles.radioOptionSelected,
            ]}
            onPress={() =>
              setFormData({
                ...formData,
                paymentMode: 'ASSINATURA',
                subscriptionScope: 'LOJA',
              })
            }
            activeOpacity={0.7}
          >
            <View style={styles.radioContent}>
              <View style={styles.radioCircle}>
                {formData.paymentMode === 'ASSINATURA' && <View style={styles.radioCircleInner} />}
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
        {formData.paymentMode === 'UNICO' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Preço (R$) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.price.toString()}
              onChangeText={(text) => {
                const numValue = Math.max(10, Number(text) || 10);
                setFormData({ ...formData, price: numValue });
              }}
              placeholder="10.00"
              placeholderTextColor={COLORS.text.tertiary}
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>Preço mínimo: R$ 10,00</Text>
          </View>
        )}

        {/* Plano de Assinatura (se ASSINATURA) */}
        {formData.paymentMode === 'ASSINATURA' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Plano de Assinatura <Text style={styles.required}>*</Text>
            </Text>
            {loadingPlans ? (
              <ActivityIndicator size="small" color={COLORS.secondary.main} />
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.subscriptionPlanId || ''}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      subscriptionPlanId: value || undefined,
                    })
                  }
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
            value={formData.allowDownload}
            onValueChange={(value) => setFormData({ ...formData, allowDownload: value })}
            trackColor={{
              false: COLORS.border.medium,
              true: COLORS.secondary.main,
            }}
            thumbColor={formData.allowDownload ? '#ffffff' : COLORS.text.tertiary}
          />
        </View>

        <View style={styles.switchGroup}>
          <Text style={styles.switchLabel}>Mostrar visualizações</Text>
          <Switch
            value={formData.showViews}
            onValueChange={(value) => setFormData({ ...formData, showViews: value })}
            trackColor={{
              false: COLORS.border.medium,
              true: COLORS.secondary.main,
            }}
            thumbColor={formData.showViews ? '#ffffff' : COLORS.text.tertiary}
          />
        </View>

        <View style={styles.switchGroup}>
          <Text style={styles.switchLabel}>Mostrar curtidas</Text>
          <Switch
            value={formData.showLikes}
            onValueChange={(value) => setFormData({ ...formData, showLikes: value })}
            trackColor={{
              false: COLORS.border.medium,
              true: COLORS.secondary.main,
            }}
            thumbColor={formData.showLikes ? '#ffffff' : COLORS.text.tertiary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Comentários</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.allowComments}
              onValueChange={(value) => setFormData({ ...formData, allowComments: value })}
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

