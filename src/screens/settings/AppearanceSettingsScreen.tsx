import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { BackButton } from '../../components/BackButton';
import { ColorPickerField } from '../../components/ColorPickerField';
import { PlanLocker } from '../../components/PlanLocker';
import { EditableAvatar } from '../../components/EditableAvatar';
import { profileApi, userApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../theme/colors';
import { showToast } from '../../components/CustomToast';
import { getImageUrl } from '../../utils/image';

interface ProfileSettings {
  backgroundColor: string;
  cardColor: string;
  textColor: string;
  cardTextColor: string;
  displayMode: 'list' | 'grid';
  gridAlignment: 'flex-start' | 'center' | 'flex-end';
  cardStyle: 'rounded' | 'square' | 'pill';
  animation: 'none' | 'fade' | 'slide' | 'bounce';
  font: 'default' | 'serif' | 'mono';
  spacing: number;
  sortMode: 'custom' | 'date' | 'name' | 'likes';
  likesColor: string;
  backgroundImage: string | null;
  backgroundMode: 'full' | 'top';
  backgroundOverlay: boolean;
  backgroundOverlayOpacity: number;
  showLikes: boolean;
  showViews: boolean;
  showPosts: boolean;
  postsLimit: number;
  buttonBackgroundColor: string | null;
  buttonTextColor: string | null;
}

interface UserStatus {
  visibility: 'online' | 'busy' | 'offline';
  customMessage: string;
}

export function AppearanceSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [settings, setSettings] = useState<ProfileSettings>({
    backgroundColor: '#ffffff',
    cardColor: '#f5f5f5',
    textColor: '#000000',
    cardTextColor: '#000000',
    displayMode: 'list',
    gridAlignment: 'center',
    cardStyle: 'rounded',
    animation: 'none',
    font: 'default',
    spacing: 16,
    sortMode: 'custom',
    likesColor: '#ff0000',
    backgroundImage: null,
    backgroundMode: 'full',
    backgroundOverlay: true,
    backgroundOverlayOpacity: 90,
    showLikes: true,
    showViews: true,
    showPosts: false,
    postsLimit: 5,
    buttonBackgroundColor: null,
    buttonTextColor: null,
  });

  const [userStatus, setUserStatus] = useState<UserStatus>({
    visibility: 'online',
    customMessage: '',
  });

  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [pendingBackground, setPendingBackground] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await userApi.getMyProfile();

      if (response.success) {
        const data = response.data;
        setProfileData(data);
        
        // Carregar bio
        setBio(data.bio || '');

        // Carregar settings do perfil
        const profile = data.profile || {};
        setSettings((prev) => ({
          ...prev,
          backgroundColor: profile.backgroundColor || prev.backgroundColor,
          cardColor: profile.cardColor || prev.cardColor,
          textColor: profile.textColor || prev.textColor,
          cardTextColor: profile.cardTextColor || prev.cardTextColor,
          displayMode: profile.displayMode || prev.displayMode,
          gridAlignment: profile.gridAlignment || prev.gridAlignment,
          cardStyle: profile.cardStyle || prev.cardStyle,
          animation: profile.animation || prev.animation,
          font: profile.font || prev.font,
          spacing: profile.spacing !== undefined ? profile.spacing : prev.spacing,
          sortMode: profile.sortMode || prev.sortMode,
          likesColor: profile.likesColor || prev.likesColor,
          backgroundImage: profile.backgroundImage || null,
          backgroundMode: profile.backgroundMode || prev.backgroundMode,
          backgroundOverlay: profile.backgroundOverlay !== undefined ? profile.backgroundOverlay : prev.backgroundOverlay,
          backgroundOverlayOpacity: profile.backgroundOverlayOpacity !== undefined ? profile.backgroundOverlayOpacity : prev.backgroundOverlayOpacity,
          showLikes: profile.showLikes !== undefined ? profile.showLikes : prev.showLikes,
          showViews: profile.showViews !== undefined ? profile.showViews : prev.showViews,
          showPosts: profile.showPosts !== undefined ? profile.showPosts : prev.showPosts,
          postsLimit: profile.postsLimit || prev.postsLimit,
          buttonBackgroundColor: profile.buttonBackgroundColor || null,
          buttonTextColor: profile.buttonTextColor || null,
        }));

        // Carregar status
        const status = data.status || {};
        setUserStatus({
          visibility: status.visibility || 'online',
          customMessage: status.customMessage || '',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      showToast.error('Erro', 'Não foi possível carregar o perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (updates: Partial<ProfileSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleStatusChange = (updates: Partial<UserStatus>) => {
    setUserStatus((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleBioChange = (text: string) => {
    setBio(text);
    setHasChanges(true);
  };

  const handleAvatarChange = async (imageUri: string) => {
    try {
      setPendingAvatar(imageUri);
      setAvatarPreview(imageUri);
      setHasChanges(true);
    } catch (error) {
      console.error('Erro ao processar avatar:', error);
    }
  };

  const handleBackgroundPicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast.error('Permissão negada', 'É necessário permitir acesso à galeria');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPendingBackground(result.assets[0].uri);
        setBackgroundPreview(result.assets[0].uri);
        handleSettingsChange({ backgroundImage: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Erro ao selecionar background:', error);
      showToast.error('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const handleRemoveBackground = () => {
    setPendingBackground(null);
    setBackgroundPreview(null);
    handleSettingsChange({ backgroundImage: null });
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);

      // 1. Upload avatar se houver
      let uploadedAvatarUrl: string | null = null;
      if (pendingAvatar) {
        try {
          const avatarResponse = await profileApi.uploadAvatar(pendingAvatar);
          if (avatarResponse.success) {
            uploadedAvatarUrl = avatarResponse.avatarUrl;
            setPendingAvatar(null);
            setAvatarPreview(null);
            showToast.success('Sucesso', 'Avatar atualizado');
          }
        } catch (error) {
          console.error('Erro ao fazer upload do avatar:', error);
          showToast.error('Erro', 'Não foi possível atualizar o avatar');
        }
      }

      // 2. Upload background se houver
      let uploadedBackgroundUrl: string | null = null;
      if (pendingBackground) {
        try {
          const backgroundResponse = await profileApi.uploadBackground(pendingBackground);
          if (backgroundResponse.success) {
            uploadedBackgroundUrl = backgroundResponse.backgroundUrl;
            setPendingBackground(null);
            setBackgroundPreview(null);
            showToast.success('Sucesso', 'Background atualizado');
          }
        } catch (error) {
          console.error('Erro ao fazer upload do background:', error);
          showToast.error('Erro', 'Não foi possível atualizar o background');
        }
      }

      // 3. Remover background se necessário
      if (!pendingBackground && !backgroundPreview && settings.backgroundImage === null && profileData?.profile?.backgroundImage) {
        try {
          await profileApi.deleteBackground();
        } catch (error) {
          console.error('Erro ao remover background:', error);
        }
      }

      // 4. Preparar payload do perfil
      const profilePayload: any = {
        backgroundColor: settings.backgroundColor || '#ffffff',
        cardColor: settings.cardColor || '#f5f5f5',
        textColor: settings.textColor || '#000000',
        cardTextColor: settings.cardTextColor || '#000000',
        displayMode: settings.displayMode,
        gridAlignment: settings.gridAlignment,
        cardStyle: settings.cardStyle,
        animation: settings.animation,
        font: settings.font,
        spacing: settings.spacing,
        sortMode: settings.sortMode,
        likesColor: settings.likesColor || '#ff0000',
        showLikes: settings.showLikes,
        showViews: settings.showViews,
        showPosts: settings.showPosts,
        postsLimit: settings.postsLimit,
      };

      // Background image (apenas para STARTER, PRO, PRO_PLUS)
      if (user?.plan?.type === 'STARTER' || user?.plan?.type === 'PRO' || user?.plan?.type === 'PRO_PLUS') {
        if (uploadedBackgroundUrl) {
          profilePayload.backgroundImage = uploadedBackgroundUrl;
        } else if (settings.backgroundImage && typeof settings.backgroundImage === 'string') {
          profilePayload.backgroundImage = settings.backgroundImage;
        } else if (settings.backgroundImage === null) {
          profilePayload.backgroundImage = null;
        }
      }

      // Background mode e overlay (baseado no plano)
      if (user?.plan?.type === 'PRO' || user?.plan?.type === 'PRO_PLUS') {
        profilePayload.backgroundMode = settings.backgroundMode || 'full';
        profilePayload.backgroundOverlay = settings.backgroundOverlay !== undefined ? settings.backgroundOverlay : true;
        profilePayload.backgroundOverlayOpacity = settings.backgroundOverlayOpacity ?? 90;
      } else if (user?.plan?.type === 'STARTER') {
        profilePayload.backgroundMode = 'full';
        profilePayload.backgroundOverlay = true;
        profilePayload.backgroundOverlayOpacity = settings.backgroundOverlayOpacity ?? 90;
      } else {
        profilePayload.backgroundMode = 'full';
        profilePayload.backgroundOverlay = true;
        profilePayload.backgroundOverlayOpacity = 90;
      }

      // Cores dos botões (apenas para STARTER, PRO, PRO_PLUS)
      if (user?.plan?.type === 'STARTER' || user?.plan?.type === 'PRO' || user?.plan?.type === 'PRO_PLUS') {
        profilePayload.buttonBackgroundColor = settings.buttonBackgroundColor || null;
        profilePayload.buttonTextColor = settings.buttonTextColor || null;
      }

      // 5. Salvar perfil
      const updateResponse = await profileApi.updateProfile({
        bio,
        profile: profilePayload,
        status: userStatus,
      });

      if (!updateResponse.success) {
        throw new Error('Erro ao salvar alterações');
      }

      // 6. Recarregar dados do usuário
      await refreshUser();
      await loadProfile();

      setHasChanges(false);
      showToast.success('Sucesso', 'Alterações salvas com sucesso');
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      showToast.error('Erro', 'Não foi possível salvar as alterações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <BackButton title="Configurações" />
          <Text style={styles.headerTitle}>Aparência</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton title="Configurações" />
        <Text style={styles.headerTitle}>Aparência</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Seção: Background */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Background</Text>
          
          <PlanLocker requiredPlan="FREE" currentPlan={user?.plan?.type}>
            <ColorPickerField
              label="Cor de Fundo"
              value={settings.backgroundColor}
              onChange={(color) => handleSettingsChange({ backgroundColor: color })}
            />
          </PlanLocker>

          <PlanLocker requiredPlan="STARTER" currentPlan={user?.plan?.type}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Imagem de Fundo</Text>
              {(backgroundPreview || settings.backgroundImage) ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: backgroundPreview || getImageUrl(settings.backgroundImage || '') || '' }}
                    style={styles.backgroundPreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={handleRemoveBackground}
                  >
                    <Ionicons name="close-circle" size={24} color={COLORS.states.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleBackgroundPicker}
                >
                  <Ionicons name="image-outline" size={20} color={COLORS.primary.main} />
                  <Text style={styles.uploadButtonText}>Adicionar Imagem</Text>
                </TouchableOpacity>
              )}
            </View>
          </PlanLocker>

          <PlanLocker requiredPlan="STARTER" currentPlan={user?.plan?.type}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                Opacidade do Overlay: {Math.round(settings.backgroundOverlayOpacity)}%
              </Text>
              <View style={styles.sliderContainer}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => {
                    const newValue = Math.max(0, settings.backgroundOverlayOpacity - 5);
                    handleSettingsChange({ backgroundOverlayOpacity: newValue });
                  }}
                >
                  <Ionicons name="remove" size={20} color={COLORS.text.primary} />
                </TouchableOpacity>
                <View style={styles.sliderTrack}>
                  <View style={styles.sliderTrackBackground} />
                  <View
                    style={[
                      styles.sliderTrackFill,
                      {
                        width: `${settings.backgroundOverlayOpacity}%`,
                        backgroundColor: COLORS.primary.main,
                      },
                    ]}
                  />
                </View>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => {
                    const newValue = Math.min(100, settings.backgroundOverlayOpacity + 5);
                    handleSettingsChange({ backgroundOverlayOpacity: newValue });
                  }}
                >
                  <Ionicons name="add" size={20} color={COLORS.text.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>0%</Text>
                <Text style={styles.sliderLabel}>100%</Text>
              </View>
            </View>
          </PlanLocker>

          {(backgroundPreview || settings.backgroundImage) && (
            <PlanLocker requiredPlan="PRO" currentPlan={user?.plan?.type}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Modo de Exibição</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={settings.backgroundMode}
                    onValueChange={(value) => handleSettingsChange({ backgroundMode: value })}
                    style={styles.picker}
                    dropdownIconColor={COLORS.text.secondary}
                  >
                    <Picker.Item label="Tela Inteira" value="full" />
                    <Picker.Item label="Apenas Topo" value="top" />
                  </Picker>
                </View>
              </View>
            </PlanLocker>
          )}
        </View>

        {/* Seção: Cores dos Textos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Cores dos Textos</Text>
          
          <PlanLocker requiredPlan="FREE" currentPlan={user?.plan?.type}>
            <ColorPickerField
              label="Cor do Texto"
              value={settings.textColor}
              onChange={(color) => handleSettingsChange({ textColor: color })}
            />
          </PlanLocker>
        </View>

        {/* Seção: Cores dos Botões */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎨 Cores dos Botões</Text>
          
          <PlanLocker requiredPlan="STARTER" currentPlan={user?.plan?.type}>
            <ColorPickerField
              label="Cor de Fundo do Botão"
              value={settings.buttonBackgroundColor || '#667eea'}
              onChange={(color) => handleSettingsChange({ buttonBackgroundColor: color })}
            />
          </PlanLocker>

          <PlanLocker requiredPlan="STARTER" currentPlan={user?.plan?.type}>
            <ColorPickerField
              label="Cor do Texto do Botão"
              value={settings.buttonTextColor || '#ffffff'}
              onChange={(color) => handleSettingsChange({ buttonTextColor: color })}
            />
          </PlanLocker>
        </View>

        {/* Seção: Avatar e Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Avatar e Bio</Text>
          
          <View style={styles.avatarContainer}>
            <EditableAvatar
              src={avatarPreview || user?.avatar || null}
              username={user?.username}
              planType={user?.plan?.type}
              editable
              onAvatarChange={handleAvatarChange}
              size={96}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Biografia</Text>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={handleBioChange}
              placeholder="Escreva uma biografia..."
              placeholderTextColor={COLORS.text.tertiary}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <Text style={styles.charCount}>{bio.length}/500</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Status de Visibilidade</Text>
            <View style={styles.statusContainer}>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  userStatus.visibility === 'online' && styles.statusOptionActive,
                ]}
                onPress={() => handleStatusChange({ visibility: 'online' })}
              >
                <View style={[styles.statusDot, { backgroundColor: '#4caf50' }]} />
                <Text style={styles.statusText}>Online</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  userStatus.visibility === 'busy' && styles.statusOptionActive,
                ]}
                onPress={() => handleStatusChange({ visibility: 'busy' })}
              >
                <View style={[styles.statusDot, { backgroundColor: '#f44336' }]} />
                <Text style={styles.statusText}>Ausente</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  userStatus.visibility === 'offline' && styles.statusOptionActive,
                ]}
                onPress={() => handleStatusChange({ visibility: 'offline' })}
              >
                <View style={[styles.statusDot, { backgroundColor: '#9e9e9e' }]} />
                <Text style={styles.statusText}>Offline</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Mensagem Personalizada</Text>
            <TextInput
              style={styles.bioInput}
              value={userStatus.customMessage}
              onChangeText={(text) => handleStatusChange({ customMessage: text.slice(0, 100) })}
              placeholder="Ex: Trabalhando..."
              placeholderTextColor={COLORS.text.tertiary}
              maxLength={100}
            />
            <Text style={styles.charCount}>{userStatus.customMessage.length}/100</Text>
          </View>

          <View style={styles.fieldContainer}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Mostrar Visualizações</Text>
              <Switch
                value={settings.showViews}
                onValueChange={(value) => handleSettingsChange({ showViews: value })}
                trackColor={{ false: COLORS.border.medium, true: COLORS.primary.main }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Mostrar Likes</Text>
              <Switch
                value={settings.showLikes}
                onValueChange={(value) => handleSettingsChange({ showLikes: value })}
                trackColor={{ false: COLORS.border.medium, true: COLORS.primary.main }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Seção: Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎴 Cards</Text>
          
          <PlanLocker requiredPlan="FREE" currentPlan={user?.plan?.type}>
            <ColorPickerField
              label="Cor de Fundo do Card"
              value={settings.cardColor}
              onChange={(color) => handleSettingsChange({ cardColor: color })}
            />
          </PlanLocker>

          <PlanLocker requiredPlan="STARTER" currentPlan={user?.plan?.type}>
            <ColorPickerField
              label="Cor do Texto do Card"
              value={settings.cardTextColor}
              onChange={(color) => handleSettingsChange({ cardTextColor: color })}
            />
          </PlanLocker>

          <PlanLocker requiredPlan="STARTER" currentPlan={user?.plan?.type}>
            <ColorPickerField
              label="Cor dos Likes"
              value={settings.likesColor}
              onChange={(color) => handleSettingsChange({ likesColor: color })}
            />
          </PlanLocker>

          <PlanLocker requiredPlan="STARTER" currentPlan={user?.plan?.type}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Modo de Exibição</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={settings.displayMode}
                  onValueChange={(value) => handleSettingsChange({ displayMode: value })}
                  style={styles.picker}
                  dropdownIconColor={COLORS.text.secondary}
                >
                  <Picker.Item label="Lista" value="list" />
                  <Picker.Item label="Grade" value="grid" />
                </Picker>
              </View>
            </View>
          </PlanLocker>

          <PlanLocker requiredPlan="STARTER" currentPlan={user?.plan?.type}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Estilo do Card</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={settings.cardStyle}
                  onValueChange={(value) => handleSettingsChange({ cardStyle: value })}
                  style={styles.picker}
                  dropdownIconColor={COLORS.text.secondary}
                >
                  <Picker.Item label="Arredondado" value="rounded" />
                  <Picker.Item label="Quadrado" value="square" />
                  <Picker.Item label="Pílula" value="pill" />
                </Picker>
              </View>
            </View>
          </PlanLocker>

          <PlanLocker requiredPlan="STARTER" currentPlan={user?.plan?.type}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Espaçamento</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={settings.spacing}
                  onValueChange={(value) => handleSettingsChange({ spacing: value })}
                  style={styles.picker}
                  dropdownIconColor={COLORS.text.secondary}
                >
                  <Picker.Item label="Pequeno (8px)" value={8} />
                  <Picker.Item label="Médio (16px)" value={16} />
                  <Picker.Item label="Grande (24px)" value={24} />
                </Picker>
              </View>
            </View>
          </PlanLocker>

          {settings.displayMode === 'grid' && (
            <PlanLocker requiredPlan="STARTER" currentPlan={user?.plan?.type}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Alinhamento da Grade</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={settings.gridAlignment}
                    onValueChange={(value) => handleSettingsChange({ gridAlignment: value })}
                    style={styles.picker}
                    dropdownIconColor={COLORS.text.secondary}
                  >
                    <Picker.Item label="Esquerda" value="flex-start" />
                    <Picker.Item label="Centro" value="center" />
                    <Picker.Item label="Direita" value="flex-end" />
                  </Picker>
                </View>
              </View>
            </PlanLocker>
          )}
        </View>

        {/* Seção: Posts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Posts</Text>
          
          <View style={styles.fieldContainer}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Mostrar Posts Recentes</Text>
              <Switch
                value={settings.showPosts}
                onValueChange={(value) => handleSettingsChange({ showPosts: value, postsLimit: value ? 5 : 0 })}
                trackColor={{ false: COLORS.border.medium, true: COLORS.primary.main }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Botão Salvar */}
      {hasChanges && (
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveChanges}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>Salvar Alterações</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.background.paper,
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  pickerWrapper: {
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    color: COLORS.text.primary,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bioInput: {
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
  },
  statusOptionActive: {
    borderColor: COLORS.primary.main,
    backgroundColor: COLORS.primary.light,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 8,
  },
  backgroundPreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.background.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary.main,
    paddingVertical: 14,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sliderContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrackBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: COLORS.border.medium,
    borderRadius: 2,
    top: '50%',
    marginTop: -2,
  },
  sliderTrackFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    top: '50%',
    marginTop: -2,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
});

