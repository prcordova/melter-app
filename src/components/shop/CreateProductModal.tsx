import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Switch,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
// Document picker será implementado com expo-image-picker ou FileSystem
import { Picker } from '@react-native-picker/picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import { showToast } from '../CustomToast';
import { useAuth } from '../../contexts/AuthContext';
import { productsApi, categoriesApi, subscriptionPlansApi } from '../../services/api';
import { getImageUrl } from '../../utils/image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/api.config';
import axios from 'axios';

interface Category {
  _id: string;
  name: string;
  color: string;
}

interface SubscriptionPlan {
  _id: string;
  name: string;
  price: number;
  isActive: boolean;
}

interface Product {
  _id?: string;
  title?: string;
  description?: string;
  price?: number;
  coverImage?: string | null;
  categoryId?: string;
  type?: 'DIGITAL_PACK';
  paymentMode?: 'UNICO' | 'ASSINATURA';
  subscriptionPlanId?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_CHANGES' | 'INACTIVE';
  stock?: number | null;
  allowComments?: 'ALL' | 'MODERATED' | 'NONE';
  showViews?: boolean;
  showLikes?: boolean;
  isAdultContent?: boolean;
  contentValidations?: {
    readTerms: boolean;
    noViolence: boolean;
    noThirdParty: boolean;
    ownContent: boolean;
    noHateSpeech: boolean;
    noSpam: boolean;
  };
  digital?: {
    downloadUrl?: string | null;
    fileName?: string | null;
    allowDownload?: boolean;
    files?: Array<{
      url: string;
      fileName: string;
      fileSize: number;
      fileType: 'image' | 'video' | 'document';
      thumbnail?: string | null;
    }>;
  };
}

interface CreateProductModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  product?: Product | null;
}

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
  size: number;
  file?: any; // File object from picker
}

export function CreateProductModal({
  visible,
  onClose,
  onSave,
  product,
}: CreateProductModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Estados principais
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Dados do formulário
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 10,
    coverImage: null as string | null,
    categoryId: '',
    type: 'DIGITAL_PACK' as 'DIGITAL_PACK',
    paymentMode: 'UNICO' as 'UNICO' | 'ASSINATURA',
    subscriptionPlanId: undefined as string | undefined,
    status: 'PENDING' as 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_CHANGES' | 'INACTIVE',
    stock: null as number | null,
    allowComments: 'ALL' as 'ALL' | 'MODERATED' | 'NONE',
    showViews: true,
    showLikes: true,
    isAdultContent: false,
    contentValidations: {
      readTerms: false,
      noViolence: false,
      noThirdParty: false,
      ownContent: false,
      noHateSpeech: false,
      noSpam: false,
    },
    digital: {
      downloadUrl: '',
      fileName: '',
      allowDownload: false,
      files: [] as Array<{
        url: string;
        fileName: string;
        fileSize: number;
        fileType: 'image' | 'video' | 'document';
        thumbnail: string | null;
      }>,
    },
  });

  // Estados auxiliares
  const [categories, setCategories] = useState<Category[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [saleFee, setSaleFee] = useState<number>(10);
  const [loadingFee, setLoadingFee] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Carregar dados quando modal abrir
  useEffect(() => {
    if (visible) {
      fetchCategories();
      fetchSaleFee();
      if (formData.paymentMode === 'ASSINATURA') {
        fetchSubscriptionPlans();
      }
    } else {
      // Limpar ao fechar
      setSelectedFiles([]);
      setUploadProgress({});
      setShowValidationErrors(false);
      setTouchedFields(new Set());
    }
  }, [visible]);

  // Preencher formulário se estiver editando
  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || '',
        description: product.description || '',
        price: product.price || 10,
        coverImage: product.coverImage || null,
        categoryId: product.categoryId || '',
        type: product.type || 'DIGITAL_PACK',
        paymentMode: product.paymentMode || 'UNICO',
        subscriptionPlanId: product.subscriptionPlanId || undefined,
        status: product.status || 'PENDING',
        stock: product.stock || null,
        allowComments: product.allowComments || 'ALL',
        showViews: product.showViews !== undefined ? product.showViews : true,
        showLikes: product.showLikes !== undefined ? product.showLikes : true,
        isAdultContent: product.isAdultContent || false,
        contentValidations: product.contentValidations || {
          readTerms: false,
          noViolence: false,
          noThirdParty: false,
          ownContent: false,
          noHateSpeech: false,
          noSpam: false,
        },
        digital: {
          downloadUrl: product.digital?.downloadUrl || '',
          fileName: product.digital?.fileName || '',
          allowDownload: product.digital?.allowDownload || false,
          files: (product.digital?.files || []).map(file => ({
            ...file,
            thumbnail: file.thumbnail ?? null,
          })),
        },
      });
    } else {
      // Reset para novo produto
      setFormData({
        title: '',
        description: '',
        price: 10,
        coverImage: null,
        categoryId: '',
        type: 'DIGITAL_PACK',
        paymentMode: 'UNICO',
        subscriptionPlanId: undefined,
        status: 'PENDING',
        stock: null,
        allowComments: 'ALL',
        showViews: true,
        showLikes: true,
        isAdultContent: false,
        contentValidations: {
          readTerms: false,
          noViolence: false,
          noThirdParty: false,
          ownContent: false,
          noHateSpeech: false,
          noSpam: false,
        },
        digital: {
          downloadUrl: '',
          fileName: '',
          allowDownload: false,
          files: [],
        },
      });
    }
  }, [product]);

  // Buscar planos quando mudar para ASSINATURA
  useEffect(() => {
    if (visible && formData.paymentMode === 'ASSINATURA') {
      fetchSubscriptionPlans();
    }
  }, [formData.paymentMode, visible]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await categoriesApi.getCategories(user?.username);
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('[CreateProductModal] Erro ao carregar categorias:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchSubscriptionPlans = async () => {
    if (!user) return;
    try {
      setLoadingPlans(true);
      const response = await subscriptionPlansApi.getPlans();
      if (response.success) {
        setSubscriptionPlans(response.data || []);
      }
    } catch (error) {
      console.error('[CreateProductModal] Erro ao carregar planos:', error);
      setSubscriptionPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchSaleFee = async () => {
    try {
      // TODO: Implementar endpoint de taxa de venda
      // Por enquanto, usar valor padrão
      setSaleFee(10);
    } catch (error) {
      console.error('[CreateProductModal] Erro ao buscar taxa:', error);
      setSaleFee(10);
    } finally {
      setLoadingFee(false);
    }
  };

  const calculateSellerAmount = (price: number) => {
    const fee = price * (saleFee / 100);
    return price - fee;
  };

  // Validações
  const getValidationErrors = () => {
    const errors: string[] = [];

    if ((touchedFields.has('title') || showValidationErrors) && !formData.title.trim()) {
      errors.push('Título é obrigatório');
    }

    if (formData.title && formData.title.length > 100) {
      errors.push('Título deve ter no máximo 100 caracteres');
    }

    if ((touchedFields.has('description') || showValidationErrors) && !formData.description.trim()) {
      errors.push('Descrição é obrigatória');
    }

    if (formData.description && formData.description.length > 1000) {
      errors.push('Descrição deve ter no máximo 1000 caracteres');
    }

    if ((touchedFields.has('price') || showValidationErrors) && formData.price < 10) {
      errors.push('Preço mínimo é R$ 10,00');
    }

    if (
      (touchedFields.has('digitalContent') || showValidationErrors) &&
      formData.type === 'DIGITAL_PACK'
    ) {
      if (formData.digital.downloadUrl && formData.digital.downloadUrl.trim() !== '') {
        const url = formData.digital.downloadUrl.trim();
        if (url.length > 200) {
          errors.push('URL deve ter no máximo 200 caracteres');
        }
        if (url.includes(' ')) {
          errors.push('URL não pode conter espaços');
        }
      }
    }

    if (
      (touchedFields.has('subscriptionPlanId') || showValidationErrors) &&
      formData.paymentMode === 'ASSINATURA' &&
      !formData.subscriptionPlanId
    ) {
      errors.push('Plano de assinatura é obrigatório');
    }

    // Validações de conteúdo - só mostra se tentou submeter
    if (showValidationErrors) {
      if (!formData.contentValidations.readTerms) {
        errors.push('Você deve confirmar que leu e aceita os termos de uso');
      }
      if (!formData.contentValidations.noViolence) {
        errors.push('Você deve confirmar que o conteúdo não contém violência');
      }
      if (!formData.contentValidations.noThirdParty) {
        errors.push('Você deve confirmar que o conteúdo não é de terceiros');
      }
      if (!formData.contentValidations.ownContent) {
        errors.push('Você deve confirmar que é o proprietário do conteúdo');
      }
      if (!formData.contentValidations.noHateSpeech) {
        errors.push('Você deve confirmar que o conteúdo não contém discurso de ódio');
      }
      if (!formData.contentValidations.noSpam) {
        errors.push('Você deve confirmar que o conteúdo não é spam');
      }
    }

    return errors;
  };

  const markFieldAsTouched = (fieldName: string) => {
    setTouchedFields((prev) => new Set(prev).add(fieldName));
  };

  const validationErrors = getValidationErrors();

  // Upload de imagem de capa
  const handlePickCoverImage = async () => {
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
        setUploadingImage(true);

        try {
          const formData = new FormData();
          formData.append('file', {
            uri: asset.uri,
            type: 'image/jpeg',
            name: 'cover.jpg',
          } as any);

          const token = await AsyncStorage.getItem('token');
          const response = await axios.post(`${API_CONFIG.BASE_URL}/api/products/upload-cover`, formData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
            timeout: 30000,
          });

          if (response.data.success) {
            setFormData((prev) => ({
              ...prev,
              coverImage: response.data.data.url,
            }));
            showToast.success('Sucesso', 'Imagem de capa enviada com sucesso');
          } else {
            showToast.error('Erro', 'Não foi possível fazer upload da imagem');
          }
        } catch (error: any) {
          console.error('[CreateProductModal] Erro no upload:', error);
          showToast.error('Erro', error.response?.data?.message || 'Erro ao fazer upload da imagem');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('[CreateProductModal] Erro ao selecionar imagem:', error);
      showToast.error('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  // Seleção de arquivos (imagens e vídeos por enquanto)
  const handlePickFiles = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast.error('Permissão negada', 'Precisamos de acesso à galeria');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newFiles: SelectedFile[] = result.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || `arquivo_${Date.now()}.${asset.uri.split('.').pop()}`,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.fileSize || 0,
          file: asset,
        }));

        // Verificar limite de 1GB
        const maxSize = 1024 * 1024 * 1024; // 1GB
        const currentSize = selectedFiles.reduce((total, file) => total + file.size, 0);
        const newSize = newFiles.reduce((total, file) => total + file.size, 0);

        if (currentSize + newSize > maxSize) {
          showToast.error('Erro', 'Limite total de 1GB excedido');
          return;
        }

        setSelectedFiles((prev) => [...prev, ...newFiles]);
        showToast.success('Sucesso', `${newFiles.length} arquivo(s) selecionado(s)`);
      }
    } catch (error) {
      console.error('[CreateProductModal] Erro ao selecionar arquivos:', error);
      showToast.error('Erro', 'Não foi possível selecionar os arquivos');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload de arquivos
  const uploadFiles = async (productId: string): Promise<Array<{
    url: string;
    fileName: string;
    fileSize: number;
    fileType: 'image' | 'video' | 'document';
    thumbnail: string | null;
  }>> => {
    if (selectedFiles.length === 0) return [];

    setUploadingFiles(true);
    const uploadedFiles: Array<{
      url: string;
      fileName: string;
      fileSize: number;
      fileType: 'image' | 'video' | 'document';
      thumbnail: string | null;
    }> = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          type: file.type,
          name: file.name,
        } as any);
        formData.append('productId', productId);
        formData.append('order', i.toString());

        const token = await AsyncStorage.getItem('token');

        const response = await axios.post(`${API_CONFIG.BASE_URL}/api/products/${productId}/files`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress((prev) => ({ ...prev, [file.name]: progress }));
            }
          },
        });

        if (response.data.success) {
          const fileType: 'image' | 'video' | 'document' =
            file.type.startsWith('image/')
              ? 'image'
              : file.type.startsWith('video/')
              ? 'video'
              : 'document';

          uploadedFiles.push({
            url: response.data.data.url,
            fileName: response.data.data.fileName,
            fileSize: response.data.data.fileSize,
            fileType,
            thumbnail: file.type.startsWith('image/') 
              ? response.data.data.url 
              : (response.data.data.thumbnail ?? null),
          });
        }
      }

      showToast.success('Sucesso', `${uploadedFiles.length} arquivo(s) enviado(s) com sucesso!`);
      return uploadedFiles;
    } catch (error: any) {
      console.error('[CreateProductModal] Erro no upload:', error);
      showToast.error('Erro', 'Erro ao fazer upload dos arquivos');
      return [];
    } finally {
      setUploadingFiles(false);
      setUploadProgress({});
    }
  };

  // Submit
  const handleSubmit = async () => {
    setShowValidationErrors(true);
    setTouchedFields((prev) => new Set([...prev, 'digitalContent']));

    const currentErrors = getValidationErrors();
    if (currentErrors.length > 0) {
      showToast.error('Erro', 'Corrija os erros antes de salvar');
      return;
    }

    setSaving(true);
    setOverallProgress(0);

    try {
      // Se há arquivos selecionados, criar produto primeiro para obter ID
      let productId = product?._id;

      if (selectedFiles.length > 0 && !productId) {
        // Criar produto temporário para obter ID
        setOverallProgress(10);
        const tempPayload = {
          ...formData,
          digital: {
            ...formData.digital,
            files: [],
          },
          subscriptionPlanId: formData.paymentMode === 'ASSINATURA' ? formData.subscriptionPlanId : undefined,
          subscriptionScope: formData.paymentMode === 'ASSINATURA' ? 'LOJA' : undefined,
          price: formData.paymentMode === 'ASSINATURA' ? 0 : formData.price,
        };

        const createResponse = await productsApi.createProduct(tempPayload);
        if (createResponse.success && createResponse.data) {
          productId = createResponse.data._id;
        } else {
          throw new Error('Erro ao criar produto');
        }
      }

      // Upload de arquivos
      let uploadedFiles: Array<{
        url: string;
        fileName: string;
        fileSize: number;
        fileType: 'image' | 'video' | 'document';
        thumbnail: string | null;
      }> = [];

      if (selectedFiles.length > 0 && productId) {
        setOverallProgress(30);
        uploadedFiles = await uploadFiles(productId);
        setOverallProgress(80);
      } else {
        setOverallProgress(50);
      }

      // Payload final
      const payload = {
        ...formData,
        digital:
          formData.type === 'DIGITAL_PACK'
            ? {
                ...formData.digital,
                files: uploadedFiles.length > 0 ? uploadedFiles : formData.digital.files,
              }
            : {},
        subscriptionPlanId: formData.paymentMode === 'ASSINATURA' ? formData.subscriptionPlanId : undefined,
        subscriptionScope: formData.paymentMode === 'ASSINATURA' ? 'LOJA' : undefined,
        price: formData.paymentMode === 'ASSINATURA' ? 0 : formData.price,
      };

      if (product && productId) {
        // Editar produto existente
        await productsApi.updateProduct(productId, payload);
        showToast.success('Sucesso', 'Produto atualizado com sucesso!');
      } else if (!productId) {
        // Criar novo produto
        await productsApi.createProduct(payload);
        showToast.success('Sucesso', 'Produto criado com sucesso!');
      }

      setOverallProgress(100);
      setTimeout(() => {
        onSave();
        onClose();
      }, 500);
    } catch (error: any) {
      console.error('[CreateProductModal] Erro ao salvar produto:', error);
      if (error.response?.data?.upgradeRequired) {
        const { currentPlan, nextPlan, message } = error.response.data;
        showToast.error(
          'Upgrade Necessário',
          `${message}\n\nFaça upgrade para ${nextPlan} e tenha acesso a mais recursos!`
        );
      } else {
        showToast.error('Erro', error.response?.data?.message || 'Erro ao salvar produto');
      }
    } finally {
      setSaving(false);
      setOverallProgress(0);
    }
  };

  const handleClose = () => {
    if (!saving && !uploadingFiles) {
      onClose();
    }
  };

  // Formatação de tamanho de arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
                {product ? '✏️ Editar Produto' : '➕ Criar Produto'}
              </Text>
              <TouchableOpacity onPress={handleClose} disabled={saving || uploadingFiles}>
                <Ionicons name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Loading Overlay */}
            {saving && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={COLORS.secondary.main} />
                <Text style={styles.loadingText}>Salvando produto...</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${overallProgress}%` }]} />
                </View>
                <Text style={styles.progressText}>{overallProgress}%</Text>
              </View>
            )}

            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Erros de validação */}
              {showValidationErrors && validationErrors.length > 0 && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorTitle}>Corrija os seguintes erros:</Text>
                  {validationErrors.map((error, index) => (
                    <Text key={index} style={styles.errorText}>
                      • {error}
                    </Text>
                  ))}
                </View>
              )}

              {/* Informação sobre Produto Digital */}
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>📦 Produto Digital</Text>
                <Text style={styles.infoText}>
                  Crie pacotes digitais com links externos, arquivos ou ambos. Você pode criar o produto vazio e
                  adicionar conteúdo depois.
                </Text>
              </View>

              {/* Título */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Título <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    showValidationErrors && !formData.title.trim() && styles.inputError,
                  ]}
                  value={formData.title}
                  onChangeText={(text) => {
                    const limitedText = text.slice(0, 100);
                    setFormData((prev) => ({ ...prev, title: limitedText }));
                  }}
                  onBlur={() => markFieldAsTouched('title')}
                  placeholder="Digite o título do produto"
                  placeholderTextColor={COLORS.text.tertiary}
                  maxLength={100}
                />
                <Text style={styles.helperText}>{formData.title.length}/100</Text>
              </View>

              {/* Descrição */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Descrição <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    showValidationErrors && !formData.description.trim() && styles.inputError,
                  ]}
                  value={formData.description}
                  onChangeText={(text) => {
                    let value = text.slice(0, 1000);
                    value = value.replace(/\s{3,}/g, '  ').replace(/\n\s*\n\s*\n/g, '\n\n');
                    setFormData((prev) => ({ ...prev, description: value }));
                  }}
                  onBlur={() => markFieldAsTouched('description')}
                  placeholder="Descreva o produto..."
                  placeholderTextColor={COLORS.text.tertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <Text style={styles.helperText}>{formData.description.length}/1000</Text>
              </View>

              {/* Preço e Modo de Pagamento */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>
                    Preço (R$) <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      showValidationErrors && formData.price < 10 && styles.inputError,
                    ]}
                    value={formData.price.toString()}
                    onChangeText={(text) => {
                      const numValue = Math.max(10, Number(text) || 10);
                      setFormData((prev) => ({ ...prev, price: numValue }));
                    }}
                    onBlur={() => markFieldAsTouched('price')}
                    placeholder="10.00"
                    placeholderTextColor={COLORS.text.tertiary}
                    keyboardType="numeric"
                  />
                  {!loadingFee && (
                    <View style={styles.feeInfo}>
                      <Text style={styles.feeText}>
                        💰 Você receberá: R$ {calculateSellerAmount(formData.price).toFixed(2)}
                      </Text>
                      {saleFee > 0 && (
                        <Text style={styles.feeSubtext}>
                          (Taxa da plataforma: {saleFee}% = R${' '}
                          {(formData.price * (saleFee / 100)).toFixed(2)})
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>
                    Modo de Pagamento <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.paymentMode}
                      onValueChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          paymentMode: value,
                          subscriptionPlanId: value === 'ASSINATURA' ? prev.subscriptionPlanId : undefined,
                        }));
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="💰 Pagamento Único" value="UNICO" />
                      <Picker.Item label="🔄 Assinatura Recorrente" value="ASSINATURA" />
                    </Picker>
                  </View>
                </View>
              </View>

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
                        onValueChange={(value) => {
                          setFormData((prev) => ({
                            ...prev,
                            subscriptionPlanId: value || undefined,
                          }));
                          markFieldAsTouched('subscriptionPlanId');
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

              {/* Categoria */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Categoria (Opcional)</Text>
                {loadingCategories ? (
                  <ActivityIndicator size="small" color={COLORS.secondary.main} />
                ) : (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.categoryId || ''}
                      onValueChange={(value) => {
                        setFormData((prev) => ({ ...prev, categoryId: value || '' }));
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="Sem categoria" value="" />
                      {categories.map((category) => (
                        <Picker.Item key={category._id} label={category.name} value={category._id} />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>

              {/* Imagem de Capa */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Imagem de Capa</Text>
                <TouchableOpacity
                  style={styles.imageUploadButton}
                  onPress={handlePickCoverImage}
                  disabled={uploadingImage}
                  activeOpacity={0.7}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={COLORS.secondary.main} />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={20} color={COLORS.secondary.main} />
                      <Text style={styles.imageUploadText}>
                        {formData.coverImage ? 'Trocar Capa' : 'Adicionar Capa'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {formData.coverImage && (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: getImageUrl(formData.coverImage) }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setFormData((prev) => ({ ...prev, coverImage: null }))}
                    >
                      <Ionicons name="close-circle" size={24} color={COLORS.states.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Conteúdo Digital */}
              {formData.type === 'DIGITAL_PACK' && (
                <>
                  <View style={styles.sectionTitle}>
                    <Text style={styles.sectionTitleText}>📦 Conteúdo Digital</Text>
                  </View>

                  {/* URL do Link */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      URL do Link (Google Drive, Dropbox, Mega, etc)
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        showValidationErrors &&
                          formData.digital.downloadUrl &&
                          (formData.digital.downloadUrl.length > 200 ||
                            formData.digital.downloadUrl.includes(' ')) &&
                          styles.inputError,
                      ]}
                      value={formData.digital.downloadUrl}
                      onChangeText={(text) => {
                        setFormData((prev) => ({
                          ...prev,
                          digital: {
                            ...prev.digital,
                            downloadUrl: text.slice(0, 200),
                            files: text.trim() ? [] : prev.digital.files, // Limpar arquivos quando adicionar link
                          },
                        }));
                      }}
                      onBlur={() => markFieldAsTouched('downloadUrl')}
                      placeholder="https://drive.google.com/file/d/..."
                      placeholderTextColor={COLORS.text.tertiary}
                      maxLength={200}
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                    <Text style={styles.helperText}>
                      Link para o conteúdo hospedado externamente ({formData.digital.downloadUrl.length}/200
                      caracteres)
                    </Text>
                  </View>

                  {/* Nome do Conteúdo */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nome do Conteúdo</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.digital.fileName}
                      onChangeText={(text) => {
                        setFormData((prev) => ({
                          ...prev,
                          digital: { ...prev.digital, fileName: text },
                        }));
                      }}
                      placeholder="Curso Completo de Marketing"
                      placeholderTextColor={COLORS.text.tertiary}
                    />
                  </View>

                  {/* Adicionar Arquivos */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Arquivos</Text>
                    <TouchableOpacity
                      style={styles.fileUploadButton}
                      onPress={handlePickFiles}
                      disabled={uploadingFiles}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="document-attach-outline" size={20} color={COLORS.secondary.main} />
                      <Text style={styles.fileUploadText}>Adicionar Arquivo</Text>
                    </TouchableOpacity>

                    {/* Lista de arquivos selecionados */}
                    {selectedFiles.length > 0 && (
                      <View style={styles.filesList}>
                        {selectedFiles.map((file, index) => (
                          <View key={index} style={styles.fileItem}>
                            <View style={styles.fileInfo}>
                              <Ionicons
                                name="document-outline"
                                size={20}
                                color={COLORS.text.secondary}
                              />
                              <View style={styles.fileDetails}>
                                <Text style={styles.fileName} numberOfLines={1}>
                                  {file.name}
                                </Text>
                                <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                              </View>
                            </View>
                            {uploadProgress[file.name] !== undefined ? (
                              <View style={styles.progressContainer}>
                                <View
                                  style={[
                                    styles.progressBarSmall,
                                    { width: `${uploadProgress[file.name]}%` },
                                  ]}
                                />
                                <Text style={styles.progressTextSmall}>
                                  {uploadProgress[file.name]}%
                                </Text>
                              </View>
                            ) : (
                              <TouchableOpacity
                                onPress={() => removeFile(index)}
                                style={styles.removeFileButton}
                              >
                                <Ionicons name="close-circle" size={20} color={COLORS.states.error} />
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Arquivos já existentes */}
                    {formData.digital.files && formData.digital.files.length > 0 && (
                      <View style={styles.filesList}>
                        <Text style={styles.existingFilesTitle}>Arquivos existentes:</Text>
                        {formData.digital.files.map((file, index) => (
                          <View key={index} style={styles.fileItem}>
                            <View style={styles.fileInfo}>
                              <Ionicons
                                name="document-outline"
                                size={20}
                                color={COLORS.text.secondary}
                              />
                              <View style={styles.fileDetails}>
                                <Text style={styles.fileName} numberOfLines={1}>
                                  {file.fileName}
                                </Text>
                                <Text style={styles.fileSize}>{formatFileSize(file.fileSize)}</Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Permitir Download */}
                  <View style={styles.switchGroup}>
                    <Text style={styles.switchLabel}>
                      Permitir download dos arquivos após compra
                    </Text>
                    <Switch
                      value={formData.digital.allowDownload}
                      onValueChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          digital: { ...prev.digital, allowDownload: value },
                        }));
                      }}
                      trackColor={{
                        false: COLORS.border.medium,
                        true: COLORS.secondary.main,
                      }}
                      thumbColor={formData.digital.allowDownload ? '#ffffff' : COLORS.text.tertiary}
                    />
                  </View>
                </>
              )}

              {/* Status */}
              <View style={styles.switchGroup}>
                <Text style={styles.switchLabel}>Produto ativo (visível na loja)</Text>
                <Switch
                  value={formData.status === 'APPROVED'}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      status: value ? 'APPROVED' : 'PENDING',
                    }));
                  }}
                  trackColor={{
                    false: COLORS.border.medium,
                    true: COLORS.states.success,
                  }}
                  thumbColor={formData.status === 'APPROVED' ? '#ffffff' : COLORS.text.tertiary}
                />
              </View>

              {/* Validações de Conteúdo */}
              <View style={styles.validationsContainer}>
                <Text style={styles.validationsTitle}>⚖️ Validações de Conteúdo</Text>
                <Text style={styles.validationsSubtitle}>
                  Confirme que seu conteúdo está em conformidade com nossas diretrizes:
                </Text>

                {/* Configurações de Interação */}
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>🔧 Configurações de Interação</Text>

                  {/* Comentários */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Comentários</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={formData.allowComments}
                        onValueChange={(value) => {
                          setFormData((prev) => ({
                            ...prev,
                            allowComments: value,
                          }));
                        }}
                        style={styles.picker}
                      >
                        <Picker.Item label="Todos" value="ALL" />
                        <Picker.Item label="Sob Análise" value="MODERATED" />
                        <Picker.Item label="Nenhum" value="NONE" />
                      </Picker>
                    </View>
                  </View>

                  {/* Visualizações e Curtidas */}
                  <View style={styles.row}>
                    <View style={styles.switchGroup}>
                      <Text style={styles.switchLabel}>Visualizações</Text>
                      <Switch
                        value={formData.showViews}
                        onValueChange={(value) => {
                          setFormData((prev) => ({ ...prev, showViews: value }));
                        }}
                        trackColor={{
                          false: COLORS.border.medium,
                          true: COLORS.secondary.main,
                        }}
                        thumbColor={formData.showViews ? '#ffffff' : COLORS.text.tertiary}
                      />
                    </View>

                    <View style={styles.switchGroup}>
                      <Text style={styles.switchLabel}>Curtidas</Text>
                      <Switch
                        value={formData.showLikes}
                        onValueChange={(value) => {
                          setFormData((prev) => ({ ...prev, showLikes: value }));
                        }}
                        trackColor={{
                          false: COLORS.border.medium,
                          true: COLORS.secondary.main,
                        }}
                        thumbColor={formData.showLikes ? '#ffffff' : COLORS.text.tertiary}
                      />
                    </View>
                  </View>
                </View>

                {/* Conteúdo Adulto */}
                <View style={styles.switchGroup}>
                  <Text style={styles.switchLabel}>
                    🔞 Conteúdo +18 (pornografia, nudez, etc.)
                  </Text>
                  <Switch
                    value={formData.isAdultContent}
                    onValueChange={(value) => {
                      setFormData((prev) => ({ ...prev, isAdultContent: value }));
                    }}
                    trackColor={{
                      false: COLORS.border.medium,
                      true: COLORS.states.warning,
                    }}
                    thumbColor={formData.isAdultContent ? '#ffffff' : COLORS.text.tertiary}
                  />
                </View>
                <Text style={styles.helperText}>
                  Marque apenas se o conteúdo contém material adulto. Conteúdo +18 é permitido, mas deve ser seu
                  próprio conteúdo.
                </Text>

                {/* Confirmações Obrigatórias */}
                <View style={styles.subsection}>
                  <Text style={styles.subsectionTitle}>✅ Confirmações Obrigatórias</Text>

                  {Object.entries({
                    readTerms: 'Li e aceito os termos de uso da plataforma',
                    ownContent: 'Sou o proprietário legítimo deste conteúdo',
                    noThirdParty: 'O conteúdo não é de terceiros (não é de outra pessoa)',
                    noViolence: 'O conteúdo não contém violência, gore ou material chocante',
                    noHateSpeech: 'O conteúdo não contém discurso de ódio ou discriminação',
                    noSpam: 'O conteúdo não é spam ou material promocional não autorizado',
                  }).map(([key, label]) => (
                    <View
                      key={key}
                      style={[
                        styles.validationSwitch,
                        showValidationErrors &&
                          !formData.contentValidations[key as keyof typeof formData.contentValidations] &&
                          styles.validationSwitchError,
                      ]}
                    >
                      <Text style={styles.validationLabel}>{label}</Text>
                      <Switch
                        value={formData.contentValidations[key as keyof typeof formData.contentValidations]}
                        onValueChange={(value) => {
                          setFormData((prev) => ({
                            ...prev,
                            contentValidations: {
                              ...prev.contentValidations,
                              [key]: value,
                            },
                          }));
                        }}
                        trackColor={{
                          false: COLORS.border.medium,
                          true: COLORS.secondary.main,
                        }}
                        thumbColor={
                          formData.contentValidations[key as keyof typeof formData.contentValidations]
                            ? '#ffffff'
                            : COLORS.text.tertiary
                        }
                      />
                    </View>
                  ))}
                </View>

                {/* Aviso */}
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    ⚠️ <Text style={styles.warningBold}>Importante:</Text> Conteúdo que viole estas diretrizes será
                    removido e pode resultar em suspensão da conta. Você é responsável por garantir que tem todos os
                    direitos sobre o conteúdo que publica.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={saving || uploadingFiles}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  (saving || uploadingFiles || validationErrors.length > 0) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={saving || uploadingFiles || validationErrors.length > 0}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {product ? 'Atualizar' : 'Criar'}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  progressBarContainer: {
    width: '60%',
    maxWidth: 300,
    height: 8,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.secondary.main,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  errorContainer: {
    backgroundColor: COLORS.states.error + '20',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.states.error,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.states.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.states.error,
    marginBottom: 4,
  },
  infoBox: {
    backgroundColor: COLORS.states.info + '20',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.states.info,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.states.info,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.text.secondary,
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
  inputError: {
    borderColor: COLORS.states.error,
  },
  textArea: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  feeInfo: {
    backgroundColor: COLORS.states.success + '20',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  feeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.states.success,
  },
  feeSubtext: {
    fontSize: 10,
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
    borderStyle: 'dashed',
  },
  imageUploadText: {
    fontSize: 14,
    color: COLORS.secondary.main,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    marginTop: 12,
    position: 'relative',
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
  sectionTitle: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  fileUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderStyle: 'dashed',
  },
  fileUploadText: {
    fontSize: 14,
    color: COLORS.secondary.main,
    fontWeight: '600',
  },
  filesList: {
    marginTop: 12,
    gap: 8,
  },
  existingFilesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  fileSize: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  progressContainer: {
    flex: 1,
    marginLeft: 12,
  },
  progressBarSmall: {
    height: 4,
    backgroundColor: COLORS.secondary.main,
    borderRadius: 2,
  },
  progressTextSmall: {
    fontSize: 10,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  removeFileButton: {
    padding: 4,
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
  validationsContainer: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  validationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  validationsSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginBottom: 16,
  },
  subsection: {
    marginTop: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  validationSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.paper,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  validationSwitchError: {
    borderColor: COLORS.states.error,
  },
  validationLabel: {
    fontSize: 12,
    color: COLORS.text.primary,
    flex: 1,
    marginRight: 12,
  },
  warningBox: {
    backgroundColor: COLORS.states.warning + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.states.warning,
  },
  warningText: {
    fontSize: 11,
    color: COLORS.text.primary,
    lineHeight: 16,
  },
  warningBold: {
    fontWeight: '600',
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
  cancelButton: {
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  submitButton: {
    backgroundColor: COLORS.secondary.main,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.border.medium,
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

// Continuar com os estilos na próxima parte...

