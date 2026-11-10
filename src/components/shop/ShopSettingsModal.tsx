import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import { showToast } from '../CustomToast';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '../Button';
import { shopApi } from '../../services/api';
import { useCustomModal, CustomModal } from '../CustomModal';
import { CustomToggle } from '../CustomToggle';
import { CustomSelect } from '../CustomSelect';
import { formatPlanTypeForDisplay } from '../../config/plan-features';
import {
  ShopAppearanceSettingsSection,
  DEFAULT_SHOP_APPEARANCE,
  type ShopAppearanceSettings,
} from './ShopAppearanceSettingsSection';
import { SubscriptionPlansContent } from './SubscriptionPlansContent';
import type { UsernameDisplayEffectConfig } from '../../types/username-display-effect';

type ShopVisibility = 'public' | 'preview' | 'friends' | 'followers';
type SettingsPanel = 'general' | 'subscriptions';
type SellerSubscriptionPlanTier = 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS';

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
  /** Plano da plataforma Melter (upgrade / gate de publicação). */
  onNavigateToPlans?: () => void;
  /** 403 `requiresSellerVerification` ao ativar a loja. */
  onOpenVerification?: () => void;
  /** Pré-checagem ao ativar (= web): KYC aprovado e plano mínimo. */
  sellerVerificationStatus?: string | null;
  shopPlanGate?: { canCreateShop?: boolean; minPlanToCreateShop?: string | null } | null;
}

function resolveSellerSubscriptionPlanTier(plan?: string): SellerSubscriptionPlanTier {
  if (plan === 'STARTER' || plan === 'PRO' || plan === 'PRO_PLUS') return plan;
  return 'FREE';
}

const VISIBILITY_OPTIONS: Array<{ value: ShopVisibility; label: string }> = [
  { value: 'public', label: 'Público' },
  { value: 'followers', label: 'Seguidores' },
  { value: 'friends', label: 'Amigos' },
  { value: 'preview', label: 'Preview' },
];

function publishBlockedByKycMessage(status?: string | null): string {
  switch (status) {
    case 'pending':
      return 'Cadastro da loja em análise. A publicação só libera depois da aprovação — não é possível ativar agora.';
    case 'needs_review':
      return 'Há correções pendentes no cadastro. Resolva a revisão antes de publicar a loja.';
    case 'appeal':
      return 'Sua reivindicação está em análise. A publicação libera após a decisão.';
    case 'rejected':
    case 'disabled':
      return 'Cadastro rejeitado ou loja desabilitada. Corrija o cadastro antes de publicar.';
    default:
      return 'Envie o cadastro da loja antes de publicar no marketplace.';
  }
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
  onOpenVerification,
  sellerVerificationStatus,
  shopPlanGate,
}: ShopSettingsModalProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shopEnabled, setShopEnabled] = useState(false);
  const [visibility, setVisibility] = useState<ShopVisibility>('preview');
  const [saleNotifications, setSaleNotifications] = useState(false);
  const [shopAppearance, setShopAppearance] =
    useState<ShopAppearanceSettings>(DEFAULT_SHOP_APPEARANCE);
  const [panel, setPanel] = useState<SettingsPanel>('general');
  const { showConfirm, modalProps, hideModal } = useCustomModal();
  const sellerPlanTier = resolveSellerSubscriptionPlanTier(currentPlan);

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
      setPanel('general');
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
    let nextVisibility = visibility;
    if (shopEnabled && !initialSettings?.isEnabled) {
      nextVisibility = 'public';
      if (sellerVerificationStatus !== 'approved') {
        const message = publishBlockedByKycMessage(sellerVerificationStatus);
        setShopEnabled(false);
        const canOpenForm =
          !sellerVerificationStatus || !['pending', 'needs_review', 'appeal'].includes(sellerVerificationStatus);
        if (canOpenForm && onOpenVerification) {
          showConfirm('Verificação necessária', message, onOpenVerification, {
            confirmText: 'Enviar documentos',
          });
        } else {
          showToast.error('Não é possível ativar', message);
        }
        return;
      }
      if (shopPlanGate && shopPlanGate.canCreateShop === false) {
        const message = `Cadastro aprovado. Para ativar a loja no marketplace, assine o plano ${formatPlanTypeForDisplay(shopPlanGate.minPlanToCreateShop || 'STARTER')} (obrigatório).`;
        setShopEnabled(false);
        if (onNavigateToPlans) {
          showConfirm('Plano necessário', message, onNavigateToPlans, { confirmText: 'Ver planos' });
        } else {
          showToast.error('Plano necessário', message);
        }
        return;
      }
    }

    try {
      setSaving(true);
      const response = await shopApi.updateSettings({
        isEnabled: shopEnabled,
        visibility: nextVisibility,
        saleNotifications: saleNotifications,
        backgroundMode: shopAppearance.backgroundMode,
        backgroundOverlay: shopAppearance.backgroundOverlay,
        backgroundOverlayOpacity: shopAppearance.backgroundOverlayOpacity,
        titleColor: shopAppearance.titleColor,
        titleDisplayEffect: shopAppearance.titleDisplayEffect,
      });

      if (response.success) {
        showToast.success('Sucesso', 'Configurações atualizadas com sucesso!');
        onSettingsUpdated();
        onClose();
        return;
      }

      const gate = response as typeof response & {
        upgradeRequired?: boolean;
        requiresSellerVerification?: boolean;
      };
      const message = response.message || 'Erro ao atualizar configurações';
      if (gate.upgradeRequired && onNavigateToPlans) {
        showConfirm('Plano necessário', message, onNavigateToPlans, { confirmText: 'Ver planos' });
      } else if (gate.requiresSellerVerification && onOpenVerification) {
        showConfirm('Verificação necessária', message, onOpenVerification, {
          confirmText: 'Enviar documentos',
        });
      } else {
        showToast.error('Erro', message);
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
    <>
      <CustomModal
        visible={visible}
        onClose={saving ? undefined : onClose}
        closeOnBackdropPress={!saving}
        animationType="fade"
        overlayStyle={styles.overlay}
      >
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            {panel === 'subscriptions' ? (
              <Button
                variant="ghost"
                size="sm"
                responsive={false}
                onPress={() => setPanel('general')}
                icon={<Ionicons name="arrow-back" size={18} color={colors.secondary.main} />}
              >
                Voltar
              </Button>
            ) : null}
            <Text style={styles.headerTitle} numberOfLines={1}>
              {panel === 'subscriptions' ? 'Assinaturas da loja' : 'Configurações da Loja'}
            </Text>
            <Button variant="ghost" size="sm" responsive={false} onPress={onClose} disabled={saving}>
              Fechar
            </Button>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.secondary.main} />
              <Text style={styles.loadingText}>Carregando configurações...</Text>
            </View>
          ) : panel === 'subscriptions' ? (
            <View style={styles.content}>
              <Text style={styles.subscriptionsHint}>
                Planos que seus clientes assinam na sua loja (inscrição comprador → vendedor). Não é o
                plano da plataforma Melter.
              </Text>
              <SubscriptionPlansContent userPlan={sellerPlanTier} />
            </View>
          ) : (
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentInner}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name={shopEnabled ? 'storefront' : 'storefront-outline'}
                    size={22}
                    color={shopEnabled ? colors.states.success : colors.text.secondary}
                  />
                  <Text style={styles.sectionTitle} numberOfLines={2}>
                    Status da Loja
                  </Text>
                </View>
                <CustomToggle
                  checked={shopEnabled}
                  onChange={setShopEnabled}
                  label={shopEnabled ? 'Loja Ativa' : 'Loja Desativada'}
                  disabled={saving}
                />
                <View style={[styles.alertBox, shopEnabled ? styles.alertSuccess : styles.alertInfo]}>
                  <Ionicons
                    name={shopEnabled ? 'checkmark-circle' : 'information-circle'}
                    size={16}
                    color={shopEnabled ? colors.states.success : colors.primary.main}
                  />
                  <Text style={styles.alertText}>
                    {shopEnabled
                      ? 'Sua loja está ativa! Os visitantes podem ver seus produtos.'
                      : 'Loja desativada. Apenas você pode visualizar no modo preview.'}
                  </Text>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="eye-outline" size={22} color={colors.text.primary} />
                  <Text style={styles.sectionTitle} numberOfLines={2}>
                    Visibilidade da Loja
                  </Text>
                </View>
                <CustomSelect
                  label="Quem pode ver"
                  value={visibility}
                  options={VISIBILITY_OPTIONS}
                  onChange={(value) => setVisibility(value as ShopVisibility)}
                  helperText={getVisibilityDescription(visibility)}
                  disabled={saving}
                />
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="notifications-outline" size={22} color={colors.text.primary} />
                  <Text style={styles.sectionTitle} numberOfLines={2}>
                    Notificações de Vendas
                  </Text>
                </View>
                <CustomToggle
                  checked={saleNotifications}
                  onChange={setSaleNotifications}
                  label="Notificações de vendas"
                  description="Receba notificações quando alguém comprar seus produtos"
                  disabled={saving}
                />
              </View>

              <View style={styles.section}>
                <ShopAppearanceSettingsSection
                  currentPlan={currentPlan}
                  username={username}
                  isAdultShop={isAdultShop}
                  value={shopAppearance}
                  onChange={setShopAppearance}
                  hideInlineSaveButton
                />
              </View>

              <View style={styles.section}>
                <Button
                  variant="outline"
                  size="sm"
                  responsive={false}
                  onPress={() => setPanel('subscriptions')}
                  icon={<Ionicons name="card-outline" size={18} color={colors.secondary.main} />}
                  style={styles.fullWidthBtn}
                >
                  Gerenciar assinaturas da loja
                </Button>
                <Text style={styles.subscriptionsHintInline}>
                  Crie planos para clientes assinarem seus pacotes — separado do plano Melter.
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.dangerTitle}>Zona de Perigo</Text>
                <Button
                  variant="danger"
                  size="sm"
                  responsive={false}
                  disabled={saving}
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
                  icon={<Ionicons name="trash-outline" size={18} color={colors.states.error} />}
                  style={styles.fullWidthBtn}
                >
                  Excluir Loja
                </Button>
                <Text style={styles.dangerDescription}>
                  Isso desativará todos os seus produtos. Você precisará solicitar a abertura da loja novamente.
                </Text>
              </View>
            </ScrollView>
          )}

          {panel === 'general' ? (
            <View style={styles.footer}>
              <Button
                variant="ghost"
                size="sm"
                responsive={false}
                onPress={onClose}
                disabled={saving}
                style={styles.footerButton}
              >
                Fechar
              </Button>
              <Button
                variant="primary"
                size="sm"
                responsive={false}
                onPress={() => void handleSave()}
                loading={saving}
                disabled={saving || loading}
                style={styles.footerButton}
              >
                Salvar
              </Button>
            </View>
          ) : null}
        </Pressable>
      </CustomModal>

      <CustomModal {...modalProps} onClose={hideModal} />
    </>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    overlay: {
      paddingHorizontal: 12,
      paddingVertical: 16,
    },
    sheet: {
      width: '100%',
      maxWidth: 560,
      height: '90%',
      maxHeight: '90%',
      alignSelf: 'center',
      backgroundColor: c.background.paper,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border.light,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border.light,
      minWidth: 0,
    },
    headerTitle: {
      flex: 1,
      minWidth: 0,
      fontSize: 17,
      fontWeight: '700',
      color: c.text.primary,
    },
    loadingContainer: {
      paddingVertical: 48,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: c.text.secondary,
    },
    content: {
      flex: 1,
      minHeight: 0,
    },
    contentInner: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 12,
    },
    section: {
      width: '100%',
      minWidth: 0,
      backgroundColor: c.background.default,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border.light,
      padding: 14,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      minWidth: 0,
    },
    sectionTitle: {
      flex: 1,
      minWidth: 0,
      fontSize: 16,
      fontWeight: '700',
      color: c.text.primary,
    },
    alertBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      borderRadius: 8,
      marginTop: 12,
      minWidth: 0,
    },
    alertSuccess: {
      backgroundColor: c.states.success + '20',
    },
    alertInfo: {
      backgroundColor: c.primary.main + '20',
    },
    alertText: {
      flex: 1,
      minWidth: 0,
      fontSize: 12,
      color: c.text.primary,
      lineHeight: 16,
    },
    fullWidthBtn: {
      width: '100%',
    },
    subscriptionsHint: {
      fontSize: 12,
      lineHeight: 16,
      color: c.text.secondary,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
      flexShrink: 1,
    },
    subscriptionsHintInline: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: 16,
      color: c.text.secondary,
      flexShrink: 1,
    },
    dangerTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.states.error,
      marginBottom: 12,
    },
    dangerDescription: {
      marginTop: 8,
      fontSize: 12,
      color: c.text.secondary,
      lineHeight: 16,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border.light,
      minWidth: 0,
    },
    footerButton: {
      flex: 1,
      minWidth: 0,
    },
  });
