import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../../theme/colors';
import { showToast } from '../CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import { shopApi } from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import { useCustomModal, CustomModal } from '../CustomModal';
import {
  ShopAppearanceSettingsSection,
  DEFAULT_SHOP_APPEARANCE,
  type ShopAppearanceSettings,
} from './ShopAppearanceSettingsSection';
import type { UsernameDisplayEffectConfig } from '../../types/username-display-effect';

type ShopVisibility = 'public' | 'preview' | 'friends' | 'followers';

interface ShopSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onSettingsUpdated: () => void;
  currentPlan?: string;
  username?: string;
  isAdultShop?: boolean;
  initialSettings?: {
    isEnabled: boolean;
    visibility: ShopVisibility;
    saleNotifications: boolean;
    backgroundImage?: string | null;
    backgroundImageUrl?: string | null;
    backgroundMode?: 'full' | 'top';
    backgroundOverlay?: boolean;
    backgroundOverlayOpacity?: number;
    titleColor?: string | null;
    titleDisplayEffect?: UsernameDisplayEffectConfig | null;
  } | null;
  onNavigateToPlans?: () => void;
}

export function ShopSettingsModal({
  visible,
  onClose,
  onSettingsUpdated,
  currentPlan = 'FREE',
  username,
  isAdultShop = false,
  initialSettings,
  onNavigateToPlans,
}: ShopSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shopEnabled, setShopEnabled] = useState(false);
  const [visibility, setVisibility] = useState<ShopVisibility>('preview');
  const [saleNotifications, setSaleNotifications] = useState(false);
  const [shopAppearance, setShopAppearance] =
    useState<ShopAppearanceSettings>(DEFAULT_SHOP_APPEARANCE);
  const { showConfirm, modalProps, hideModal } = useCustomModal();

  const applyAppearanceFromSettings = (data: ShopSettingsModalProps['initialSettings']) => {
    if (!data) {
      setShopAppearance(DEFAULT_SHOP_APPEARANCE);
      return;
    }
    setShopAppearance({
      backgroundImage: data.backgroundImage ?? null,
      backgroundImageUrl: data.backgroundImageUrl ?? null,
      backgroundMode: data.backgroundMode ?? 'full',
      backgroundOverlay: Boolean(data.backgroundOverlay),
      backgroundOverlayOpacity: data.backgroundOverlayOpacity ?? 0,
      titleColor: data.titleColor ?? null,
      titleDisplayEffect: data.titleDisplayEffect ?? null,
    });
  };

  useEffect(() => {
    if (visible) {
      if (initialSettings) {
        setShopEnabled(initialSettings.isEnabled);
        setVisibility(initialSettings.visibility);
        setSaleNotifications(initialSettings.saleNotifications);
        applyAppearanceFromSettings(initialSettings);
      } else {
        fetchSettings();
      }
    }
  }, [visible, initialSettings]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await shopApi.getSettings();
      if (response.success && response.data) {
        setShopEnabled(response.data.isEnabled || false);
        setVisibility(response.data.visibility || 'preview');
        setSaleNotifications(response.data.saleNotifications || false);
        applyAppearanceFromSettings(response.data);
      }
    } catch (error: any) {
      console.error('[ShopSettingsModal] Erro ao carregar configurações:', error);
      showToast.error('Erro', 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await shopApi.updateSettings({
        isEnabled: shopEnabled,
        visibility: visibility,
        saleNotifications: saleNotifications,
      });

      if (response.success) {
        showToast.success('Sucesso', 'Configurações atualizadas com sucesso!');
        onSettingsUpdated();
        onClose();
      } else {
        showToast.error('Erro', response.message || 'Erro ao atualizar configurações');
      }
    } catch (error: any) {
      console.error('[ShopSettingsModal] Erro ao salvar configurações:', error);
      showToast.error('Erro', 'Erro ao atualizar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShop = async () => {
    try {
      setSaving(true);
      const response = await shopApi.deleteShop();
      if (response.success) {
        showToast.success('Sucesso', 'Loja excluída com sucesso');
        onSettingsUpdated();
        onClose();
      } else {
        showToast.error('Erro', response.message || 'Erro ao excluir loja');
      }
    } catch (error: any) {
      console.error('[ShopSettingsModal] Erro ao excluir loja:', error);
      showToast.error('Erro', 'Erro ao excluir loja');
    } finally {
      setSaving(false);
    }
  };

  const getVisibilityDescription = (vis: ShopVisibility): string => {
    switch (vis) {
      case 'public':
        return 'Qualquer pessoa pode ver sua loja';
      case 'followers':
        return 'Apenas quem te segue pode ver';
      case 'friends':
        return 'Somente seus amigos podem ver';
      case 'preview':
        return 'Apenas você pode ver (modo teste)';
      default:
        return '';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configurações da Loja</Text>
          <View style={styles.backButton} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.secondary.main} />
            <Text style={styles.loadingText}>Carregando configurações...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Status da Loja */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name={shopEnabled ? 'storefront' : 'storefront-outline'}
                  size={24}
                  color={shopEnabled ? COLORS.states.success : COLORS.text.secondary}
                />
                <Text style={styles.sectionTitle}>Status da Loja</Text>
              </View>
              <View style={styles.switchGroup}>
                <Text style={styles.switchLabel}>
                  {shopEnabled ? 'Loja Ativa' : 'Loja Desativada'}
                </Text>
                <Switch
                  value={shopEnabled}
                  onValueChange={setShopEnabled}
                  disabled={saving}
                />
              </View>
              <View style={[styles.alertBox, shopEnabled ? styles.alertSuccess : styles.alertInfo]}>
                <Ionicons
                  name={shopEnabled ? 'checkmark-circle' : 'information-circle'}
                  size={16}
                  color={shopEnabled ? COLORS.states.success : COLORS.primary.main}
                />
                <Text style={styles.alertText}>
                  {shopEnabled
                    ? 'Sua loja está ativa! Os visitantes podem ver seus produtos.'
                    : 'Loja desativada. Apenas você pode visualizar no modo preview.'}
                </Text>
              </View>
            </View>

            {/* Visibilidade */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="eye-outline" size={24} color={COLORS.text.primary} />
                <Text style={styles.sectionTitle}>Visibilidade da Loja</Text>
              </View>
              <Text style={styles.label}>Quem pode ver</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={visibility}
                  onValueChange={(value) => setVisibility(value)}
                  style={styles.picker}
                  enabled={!saving}
                >
                  <Picker.Item label="Público" value="public" />
                  <Picker.Item label="Seguidores" value="followers" />
                  <Picker.Item label="Amigos" value="friends" />
                  <Picker.Item label="Preview" value="preview" />
                </Picker>
              </View>
              <Text style={styles.helperText}>{getVisibilityDescription(visibility)}</Text>
            </View>

            {/* Notificações de Vendas */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="notifications-outline" size={24} color={COLORS.text.primary} />
                <Text style={styles.sectionTitle}>Notificações de Vendas</Text>
              </View>
              <View style={styles.switchGroup}>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.switchLabel}>
                    {saleNotifications ? 'Ativadas' : 'Desativadas'}
                  </Text>
                  <Text style={styles.switchDescription}>
                    Receba notificações quando alguém comprar seus produtos
                  </Text>
                </View>
                <Switch
                  value={saleNotifications}
                  onValueChange={setSaleNotifications}
                  disabled={saving}
                />
              </View>
            </View>

            <ShopAppearanceSettingsSection
              currentPlan={currentPlan}
              username={username}
              isAdultShop={isAdultShop}
              value={shopAppearance}
              onChange={setShopAppearance}
            />

            {/* Botão Gerenciar Planos */}
            {onNavigateToPlans && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    onClose();
                    onNavigateToPlans();
                  }}
                >
                  <Ionicons name="card-outline" size={20} color={COLORS.primary.main} />
                  <Text style={styles.actionButtonText}>Gerenciar assinaturas da loja</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Zona de Perigo */}
            <View style={styles.section}>
              <Text style={styles.dangerTitle}>Zona de Perigo</Text>
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={() => {
                  showConfirm(
                    'Confirmar Exclusão',
                    'Tem certeza que deseja excluir sua loja? Isso desativará todos os seus produtos. Você precisará solicitar a abertura da loja novamente.',
                    handleDeleteShop,
                    {
                      confirmText: 'Excluir Loja',
                      cancelText: 'Cancelar',
                      destructive: true,
                    }
                  );
                }}
                disabled={saving}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.states.error} />
                <Text style={styles.dangerButtonText}>Excluir Loja</Text>
              </TouchableOpacity>
              <Text style={styles.dangerDescription}>
                Isso desativará todos os seus produtos. Você precisará solicitar a abertura da loja novamente.
              </Text>
            </View>
          </ScrollView>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Salvar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Confirmação Customizado */}
      <CustomModal {...modalProps} onClose={hideModal} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background.tertiary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.background.paper,
    marginBottom: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  alertSuccess: {
    backgroundColor: COLORS.states.success + '20',
  },
  alertInfo: {
    backgroundColor: COLORS.primary.main + '20',
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text.primary,
    lineHeight: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: COLORS.background.default,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.background.tertiary,
    marginBottom: 8,
    overflow: 'hidden',
  },
  picker: {
    color: COLORS.text.primary,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.background.default,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.background.tertiary,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.states.error,
    marginBottom: 12,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.background.default,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.states.error,
    marginBottom: 8,
  },
  dangerButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.states.error,
  },
  dangerDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.background.paper,
    borderTopWidth: 1,
    borderTopColor: COLORS.background.tertiary,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.background.tertiary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  saveButton: {
    backgroundColor: COLORS.primary.main,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

