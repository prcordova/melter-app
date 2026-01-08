import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import { showToast } from '../CustomToast';
import { adsApi } from '../../services/api';
import { FIXED_CATEGORIES } from '../../constants/categories';
import { Select, SelectItem } from '../ui/Select';
import { useAuth } from '../../contexts/AuthContext';

interface CreateAdModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reactivatingAd?: any;
  campaignConfig?: {
    pricePerView: number;
    averages: any;
  } | null;
}

export function CreateAdModal({
  visible,
  onClose,
  onSuccess,
  reactivatingAd,
  campaignConfig,
}: CreateAdModalProps) {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [useUpload, setUseUpload] = useState(true);
  const [mediaUrl, setMediaUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [targetCategories, setTargetCategories] = useState<string[]>([]);
  const [campaignDays, setCampaignDays] = useState<number | null>(null);
  const [targetViews, setTargetViews] = useState<number | null>(null);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [updatingFromDays, setUpdatingFromDays] = useState(false);
  const [updatingFromViews, setUpdatingFromViews] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  // Resetar formulário quando modal abrir/fechar
  useEffect(() => {
    if (visible) {
      if (reactivatingAd) {
        // Preencher com dados da campanha
        setTitle(reactivatingAd.title || '');
        setDescription(reactivatingAd.description || '');
        setMediaUrl(reactivatingAd.mediaUrl);
        setLink(reactivatingAd.link || '');
        setTargetCategories(reactivatingAd.targetCategories || []);
        setCampaignDays(reactivatingAd.campaignDays || null);
        setTargetViews(reactivatingAd.targetViews || null);
        setEstimatedCost(0);
        
        if (reactivatingAd.startDate) {
          const startDateObj = new Date(reactivatingAd.startDate);
          const year = startDateObj.getFullYear();
          const month = String(startDateObj.getMonth() + 1).padStart(2, '0');
          const day = String(startDateObj.getDate()).padStart(2, '0');
          setStartDate(`${year}-${month}-${day}`);
          const hours = String(startDateObj.getHours()).padStart(2, '0');
          const minutes = String(startDateObj.getMinutes()).padStart(2, '0');
          setStartTime(`${hours}:${minutes}`);
        } else {
          const now = new Date();
          setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
          setStartTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        }
        
        if (reactivatingAd.endDate) {
          const endDateObj = new Date(reactivatingAd.endDate);
          const year = endDateObj.getFullYear();
          const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
          const day = String(endDateObj.getDate()).padStart(2, '0');
          setEndDate(`${year}-${month}-${day}`);
          const hours = String(endDateObj.getHours()).padStart(2, '0');
          const minutes = String(endDateObj.getMinutes()).padStart(2, '0');
          setEndTime(`${hours}:${minutes}`);
        } else {
          setEndDate('');
          setEndTime('');
        }
      } else {
        // Resetar para novo anúncio
        setTitle('');
        setDescription('');
        setMediaUrl('');
        setLink('');
        setTargetCategories([]);
        setCampaignDays(null);
        setTargetViews(null);
        setEstimatedCost(0);
        const now = new Date();
        setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
        setStartTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
        setEndDate('');
        setEndTime('');
      }
    } else {
      // Limpar ao fechar
      setTitle('');
      setDescription('');
      setMediaUrl('');
      setLink('');
      setTargetCategories([]);
      setCampaignDays(null);
      setTargetViews(null);
      setEstimatedCost(0);
      setStartDate('');
      setStartTime('');
      setEndDate('');
      setEndTime('');
    }
  }, [visible, reactivatingAd]);

  const getCurrentDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const detectMediaType = (url: string): 'IMAGE' | 'VIDEO' => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v'];
    const videoDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com'];
    
    const lowerUrl = url.toLowerCase();
    if (videoExtensions.some(ext => lowerUrl.includes(ext)) || videoDomains.some(domain => lowerUrl.includes(domain))) {
      return 'VIDEO';
    }
    return 'IMAGE';
  };

  const handleFileUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast.error('Permissão', 'Permissão para acessar a galeria é necessária');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setUploading(true);
        
        try {
          const uploadResponse = await adsApi.uploadMedia(asset.uri);
          if (uploadResponse.success) {
            setMediaUrl(uploadResponse.data.url);
            showToast.success('Sucesso', 'Mídia enviada com sucesso');
          } else {
            showToast.error('Erro', uploadResponse.message || 'Erro ao fazer upload');
          }
        } catch (error: any) {
          console.error('Erro no upload:', error);
          showToast.error('Erro', 'Erro ao fazer upload da mídia');
        } finally {
          setUploading(false);
        }
      }
    } catch (error: any) {
      console.error('Erro ao selecionar mídia:', error);
      showToast.error('Erro', 'Erro ao selecionar mídia');
    }
  };

  const handleDaysChange = async (days: number | null) => {
    if (updatingFromViews) return;

    setUpdatingFromDays(true);
    setCampaignDays(days);

    if (days && days > 0 && targetCategories.length > 0 && campaignConfig) {
      try {
        // Calcular views baseado em dias
        const averages = campaignConfig.averages || {};
        let totalAvg = 0;
        targetCategories.forEach(catId => {
          const avg = typeof averages === 'object' && averages !== null && !(averages instanceof Map)
            ? (averages[catId] || 0)
            : 0;
          totalAvg += avg;
        });
        
        const calculatedViews = Math.round(totalAvg * days);
        const pricePerView = campaignConfig.pricePerView || 0.10;
        const calculatedCost = calculatedViews * pricePerView;
        
        setTargetViews(calculatedViews);
        setEstimatedCost(Math.round(calculatedCost * 100) / 100);
      } catch (error) {
        console.error('Erro ao calcular views/dias:', error);
      }
    } else {
      setTargetViews(null);
      setEstimatedCost(0);
    }

    setTimeout(() => setUpdatingFromDays(false), 100);
  };

  const handleViewsChange = async (views: number | null) => {
    if (updatingFromDays) return;

    setUpdatingFromViews(true);
    setTargetViews(views);

    if (views && views > 0 && targetCategories.length > 0 && campaignConfig) {
      try {
        // Calcular dias baseado em views
        const averages = campaignConfig.averages || {};
        let totalAvg = 0;
        targetCategories.forEach(catId => {
          const avg = typeof averages === 'object' && averages !== null && !(averages instanceof Map)
            ? (averages[catId] || 0)
            : 0;
          totalAvg += avg;
        });
        
        if (totalAvg > 0) {
          const calculatedDays = Math.ceil(views / totalAvg);
          const pricePerView = campaignConfig.pricePerView || 0.10;
          const calculatedCost = views * pricePerView;
          
          setCampaignDays(calculatedDays);
          setEstimatedCost(Math.round(calculatedCost * 100) / 100);
        }
      } catch (error) {
        console.error('Erro ao calcular dias/views:', error);
      }
    } else {
      setCampaignDays(null);
      setEstimatedCost(0);
    }

    setTimeout(() => setUpdatingFromViews(false), 100);
  };

  const isFormValid = () => {
    if (!mediaUrl) return false;
    if (targetCategories.length === 0) return false;
    if (!campaignDays && !targetViews) return false;
    if (!startDate || !startTime) return false;
    if (!endDate || !endTime) return false;
    
    // Validar datas
    if (endDate < startDate) return false;
    if (startDate === endDate && endTime < startTime) return false;
    
    return true;
  };

  const handleSave = async () => {
    if (!mediaUrl) {
      showToast.error('Erro', 'É necessário fazer upload de uma mídia');
      return;
    }

    if (targetCategories.length === 0) {
      showToast.error('Erro', 'Selecione pelo menos uma categoria');
      return;
    }

    if (!campaignDays && !targetViews) {
      showToast.error('Erro', 'Informe a duração em dias ou o número de visualizações');
      return;
    }

    const userBalance = user?.wallet?.balance || 0;
    if (userBalance < estimatedCost) {
      Alert.alert(
        'Saldo Insuficiente',
        `Você precisa de R$ ${estimatedCost.toFixed(2)} mas tem apenas R$ ${userBalance.toFixed(2)}. Deseja adicionar saldo?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Adicionar Saldo', onPress: () => {
            // TODO: Abrir modal de adicionar saldo
            showToast.info('Em breve', 'Funcionalidade de adicionar saldo em desenvolvimento');
          }},
        ]
      );
      return;
    }

    try {
      setSaving(true);
      const type = detectMediaType(mediaUrl);

      const payload: any = {
        title: title || null,
        description: description || null,
        type,
        mediaUrl,
        link: link || null,
        targetCategories,
        campaignDays: campaignDays || null,
        targetViews: targetViews || null,
        estimatedCost,
        skipable: true,
        campaignObjective: 'VISIBILITY',
        startDate: startDate || null,
        startTime: startTime || null,
        endDate: endDate || null,
        endTime: endTime || null,
      };

      if (reactivatingAd) {
        const response = await adsApi.reactivateAd(reactivatingAd._id, payload);
        if (response.success) {
          showToast.success('Sucesso', 'Campanha reativada com sucesso');
          await refreshUser();
          onSuccess();
          onClose();
        } else {
          throw new Error(response.message || 'Erro ao reativar campanha');
        }
      } else {
        const response = await adsApi.createAd(payload);
        if (response.success) {
          showToast.success('Sucesso', 'Anúncio criado com sucesso');
          await refreshUser();
          onSuccess();
          onClose();
        } else {
          throw new Error(response.message || 'Erro ao criar anúncio');
        }
      }
    } catch (error: any) {
      console.error('Erro ao salvar anúncio:', error);
      if (error.response?.data?.message?.includes('Saldo insuficiente')) {
        Alert.alert(
          'Saldo Insuficiente',
          'Você não tem saldo suficiente. Deseja adicionar saldo?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Adicionar Saldo', onPress: () => {
              // TODO: Abrir modal de adicionar saldo
              showToast.info('Em breve', 'Funcionalidade de adicionar saldo em desenvolvimento');
            }},
          ]
        );
      } else {
        showToast.error('Erro', error.response?.data?.message || (reactivatingAd ? 'Erro ao reativar campanha' : 'Erro ao criar anúncio'));
      }
    } finally {
      setSaving(false);
    }
  };

  const availableCategories = FIXED_CATEGORIES.filter(cat => !targetCategories.includes(cat._id));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContent, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {reactivatingAd ? 'Reativar Campanha' : 'Criar Anúncio'}
            </Text>
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Método de Upload */}
            <View style={styles.section}>
              <Text style={styles.label}>Método de Upload</Text>
              <Select
                selectedValue={useUpload ? 'upload' : 'link'}
                onValueChange={(value) => setUseUpload(value === 'upload')}
                items={[
                  { label: 'Upload de Arquivo', value: 'upload' },
                  { label: 'URL Externa', value: 'link' },
                ]}
              />
            </View>

            {/* Upload de Mídia */}
            {useUpload ? (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleFileUpload}
                  disabled={uploading || saving}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="cloud-upload-outline" size={20} color="#ffffff" />
                  )}
                  <Text style={styles.uploadButtonText}>
                    {uploading ? 'Enviando...' : 'Enviar Mídia'}
                  </Text>
                </TouchableOpacity>
                {mediaUrl && (
                  <View style={styles.mediaPreview}>
                    <Image source={{ uri: mediaUrl }} style={styles.mediaPreviewImage} />
                    <Text style={styles.mediaUrlText} numberOfLines={1}>
                      {mediaUrl}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.label}>URL da Mídia</Text>
                <TextInput
                  style={styles.input}
                  value={mediaUrl}
                  onChangeText={setMediaUrl}
                  placeholder="https://..."
                  placeholderTextColor={COLORS.text.tertiary}
                />
              </View>
            )}

            {/* Título */}
            <View style={styles.section}>
              <Text style={styles.label}>Título</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Título do anúncio"
                placeholderTextColor={COLORS.text.tertiary}
              />
            </View>

            {/* Descrição */}
            <View style={styles.section}>
              <Text style={styles.label}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Descrição do anúncio"
                placeholderTextColor={COLORS.text.tertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Link */}
            <View style={styles.section}>
              <Text style={styles.label}>Link</Text>
              <TextInput
                style={styles.input}
                value={link}
                onChangeText={setLink}
                placeholder="https://..."
                placeholderTextColor={COLORS.text.tertiary}
              />
            </View>

            {/* Categorias */}
            <View style={styles.section}>
              <Text style={styles.label}>Categorias</Text>
              {targetCategories.length > 0 && (
                <View style={styles.categoriesContainer}>
                  {targetCategories.map((categoryId) => {
                    const category = FIXED_CATEGORIES.find(c => c._id === categoryId);
                    if (!category) return null;
                    return (
                      <View key={categoryId} style={styles.categoryChip}>
                        <Text style={styles.categoryChipText}>{category.name}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setTargetCategories(targetCategories.filter(id => id !== categoryId));
                          }}
                        >
                          <Ionicons name="close-circle" size={18} color={COLORS.text.secondary} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
              {availableCategories.length > 0 ? (
                <Select
                  selectedValue=""
                  onValueChange={(value) => {
                    const categoryId = String(value);
                    if (categoryId && categoryId !== '' && !targetCategories.includes(categoryId)) {
                      setTargetCategories([...targetCategories, categoryId]);
                    }
                  }}
                  items={[
                    { label: 'Adicionar Categoria', value: '' },
                    ...availableCategories.map(cat => ({ label: cat.name, value: cat._id })),
                  ]}
                />
              ) : (
                <Text style={styles.noCategoriesText}>Todas as categorias foram adicionadas</Text>
              )}
            </View>

            {/* Duração e Visualizações */}
            {targetCategories.length > 0 && (
              <>
                <View style={styles.section}>
                  <Text style={styles.label}>Duração (dias)</Text>
                  <TextInput
                    style={styles.input}
                    value={campaignDays?.toString() || ''}
                    onChangeText={(text) => {
                      const days = text ? parseInt(text) : null;
                      handleDaysChange(days);
                    }}
                    placeholder="Ex: 7"
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.text.tertiary}
                  />
                  {campaignConfig && targetCategories.length > 0 && (
                    <Text style={styles.helperText}>
                      Total: {(() => {
                        const averages = campaignConfig.averages || {};
                        let totalAvg = 0;
                        targetCategories.forEach(catId => {
                          const avg = typeof averages === 'object' && averages !== null && !(averages instanceof Map)
                            ? (averages[catId] || 0)
                            : 0;
                          totalAvg += avg;
                        });
                        return Math.round(totalAvg);
                      })()} visualizações por dia
                    </Text>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Visualizações Alvo</Text>
                  <TextInput
                    style={styles.input}
                    value={targetViews?.toString() || ''}
                    onChangeText={(text) => {
                      const views = text ? parseInt(text) : null;
                      handleViewsChange(views);
                    }}
                    placeholder="Ex: 1000"
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.text.tertiary}
                  />
                </View>

                {/* Custo Estimado */}
                {estimatedCost > 0 && (
                  <View style={styles.costAlert}>
                    <Ionicons name="information-circle" size={20} color={COLORS.primary.main} />
                    <View style={styles.costAlertText}>
                      <Text style={styles.costAlertTitle}>
                        Custo Estimado: R$ {estimatedCost.toFixed(2)}
                      </Text>
                      <Text style={styles.costAlertSubtitle}>
                        Saldo Atual: R$ {(user?.wallet?.balance || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Data e Hora de Início */}
                <View style={styles.section}>
                  <Text style={styles.label}>Data de Início *</Text>
                  <TextInput
                    style={styles.input}
                    value={startDate}
                    onChangeText={(newStartDate) => {
                      if (endDate && newStartDate > endDate) {
                        showToast.error('Erro', 'Data inicial não pode ser depois da data final');
                        return;
                      }
                      setStartDate(newStartDate);
                      if (!endDate && campaignDays && newStartDate) {
                        const [year, month, day] = newStartDate.split('-').map(Number);
                        const start = new Date(year, month - 1, day);
                        if (startTime) {
                          const [hours, minutes] = startTime.split(':').map(Number);
                          start.setHours(hours, minutes, 0, 0);
                        }
                        const end = new Date(start.getTime() + (campaignDays * 24 * 60 * 60 * 1000));
                        const endYear = end.getFullYear();
                        const endMonth = String(end.getMonth() + 1).padStart(2, '0');
                        const endDay = String(end.getDate()).padStart(2, '0');
                        setEndDate(`${endYear}-${endMonth}-${endDay}`);
                        const endHours = String(end.getHours()).padStart(2, '0');
                        const endMinutes = String(end.getMinutes()).padStart(2, '0');
                        setEndTime(`${endHours}:${endMinutes}`);
                      }
                    }}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.text.tertiary}
                  />
                  <Text style={styles.helperText}>Data em que a campanha deve iniciar</Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Hora de Início *</Text>
                  <TextInput
                    style={styles.input}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="HH:MM"
                    placeholderTextColor={COLORS.text.tertiary}
                  />
                  <Text style={styles.helperText}>Hora em que a campanha deve iniciar</Text>
                </View>

                {/* Data e Hora de Término */}
                <View style={styles.section}>
                  <Text style={styles.label}>Data de Término *</Text>
                  <TextInput
                    style={styles.input}
                    value={endDate}
                    onChangeText={(newEndDate) => {
                      if (startDate && newEndDate < startDate) {
                        showToast.error('Erro', 'Data final não pode ser antes da data inicial');
                        return;
                      }
                      setEndDate(newEndDate);
                    }}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.text.tertiary}
                  />
                  <Text style={styles.helperText}>
                    {campaignDays ? `Calculado automaticamente: ${campaignDays} dias` : 'Data em que a campanha deve terminar'}
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Hora de Término *</Text>
                  <TextInput
                    style={styles.input}
                    value={endTime}
                    onChangeText={(newEndTime) => {
                      if (startDate && endDate && startDate === endDate && newEndTime < startTime) {
                        showToast.error('Erro', 'Hora final não pode ser antes da hora inicial');
                        return;
                      }
                      setEndTime(newEndTime);
                    }}
                    placeholder="HH:MM"
                    placeholderTextColor={COLORS.text.tertiary}
                    editable={!!endDate}
                  />
                  <Text style={styles.helperText}>Hora em que a campanha deve terminar</Text>
                </View>
              </>
            )}

            {targetCategories.length === 0 && (
              <View style={styles.warningAlert}>
                <Ionicons name="warning-outline" size={20} color={COLORS.states.warning} />
                <Text style={styles.warningText}>
                  Selecione pelo menos uma categoria para continuar
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, (!isFormValid() || saving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!isFormValid() || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {reactivatingAd ? 'Reativar' : 'Criar'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.secondary.main,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  mediaPreview: {
    marginTop: 12,
    gap: 8,
  },
  mediaPreviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
  },
  mediaUrlText: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  categoryChipText: {
    fontSize: 12,
    color: COLORS.text.primary,
  },
  noCategoriesText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  costAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.primary.main + '15',
    borderWidth: 1,
    borderColor: COLORS.primary.main + '40',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  costAlertText: {
    flex: 1,
    gap: 4,
  },
  costAlertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary.main,
  },
  costAlertSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  warningAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.states.warning + '20',
    borderWidth: 1,
    borderColor: COLORS.states.warning + '40',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
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
  cancelButton: {
    backgroundColor: COLORS.background.tertiary,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  saveButton: {
    backgroundColor: COLORS.secondary.main,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

