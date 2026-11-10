import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { PlanLocker } from '../PlanLocker';
import { ColorPickerField } from '../ColorPickerField';
import { ProfileGradientEffectSection } from '../../screens/settings/ProfileGradientEffectSection';
import { shopApi } from '../../services/api';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import { showToast } from '../CustomToast';
import { getImageUrl } from '../../utils/image';
import { hasFeatureAccess, resolveUserPlanType, type PlanType } from '../../config/plan-features';
import type { UsernameDisplayEffectConfig } from '../../types/username-display-effect';
import {
  DEFAULT_USERNAME_DISPLAY_EFFECT,
  normalizeUsernameDisplayEffect,
} from '../../types/username-display-effect';
import { Button } from '../Button';
import { CustomSelect } from '../CustomSelect';
import { CustomSlider } from '../CustomSlider';

export type ShopAppearanceSettings = {
  backgroundImage: string | null;
  backgroundImageUrl?: string | null;
  backgroundMode: 'full' | 'top';
  backgroundOverlay: boolean;
  backgroundOverlayOpacity: number;
  titleColor: string | null;
  titleDisplayEffect: UsernameDisplayEffectConfig | null;
};

export const DEFAULT_SHOP_APPEARANCE: ShopAppearanceSettings = {
  backgroundImage: null,
  backgroundImageUrl: null,
  backgroundMode: 'full',
  backgroundOverlay: false,
  backgroundOverlayOpacity: 0,
  titleColor: null,
  titleDisplayEffect: null,
};

function mergeTitleDisplayEffect(raw: unknown): UsernameDisplayEffectConfig {
  const normalized = normalizeUsernameDisplayEffect(raw);
  if (!normalized) return { ...DEFAULT_USERNAME_DISPLAY_EFFECT };
  return { ...DEFAULT_USERNAME_DISPLAY_EFFECT, ...normalized };
}

type Props = {
  currentPlan?: string;
  username?: string;
  isAdultShop?: boolean;
  value: ShopAppearanceSettings;
  onChange: (next: ShopAppearanceSettings) => void;
  hideInlineSaveButton?: boolean;
};

export function ShopAppearanceSettingsSection({
  currentPlan = 'FREE',
  username,
  isAdultShop = false,
  value,
  onChange,
  hideInlineSaveButton = false,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [titleEffect, setTitleEffect] = useState<UsernameDisplayEffectConfig>(() =>
    mergeTitleDisplayEffect(value.titleDisplayEffect)
  );

  const planType = resolveUserPlanType(currentPlan) as PlanType;
  const canEditBackground = hasFeatureAccess(planType, 'canUploadShopBackgroundImage');
  const canEditTitleColor = hasFeatureAccess(planType, 'canCustomizeShopTitleColor');
  const canEditTitleEffect = hasFeatureAccess(planType, 'canCustomizeShopTitleDisplayEffect');

  useEffect(() => {
    setTitleEffect(mergeTitleDisplayEffect(value.titleDisplayEffect));
  }, [value.titleDisplayEffect]);

  const backgroundPreviewUrl = useMemo(() => {
    if (localPreview) return localPreview;
    if (value.backgroundImageUrl) return value.backgroundImageUrl;
    if (value.backgroundImage) {
      return getImageUrl(value.backgroundImage) ?? value.backgroundImage;
    }
    return null;
  }, [localPreview, value.backgroundImage, value.backgroundImageUrl]);

  const hasCustomBackground = Boolean(value.backgroundImage || localPreview);

  const patch = useCallback(
    (partial: Partial<ShopAppearanceSettings>) => {
      onChange({ ...value, ...partial });
    },
    [onChange, value]
  );

  const handleBackgroundPick = async () => {
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

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const imageUri = result.assets[0].uri;
      setLocalPreview(imageUri);

      try {
        setUploadingBackground(true);
        const response = await shopApi.uploadShopBackground(imageUri);
        if (!response.success) {
          throw new Error(response.message || 'Falha no upload');
        }

        patch({
          backgroundImage: response.data?.backgroundImage ?? value.backgroundImage,
          backgroundImageUrl: response.data?.backgroundUrl ?? null,
        });
        setLocalPreview(null);
        showToast.success('Sucesso', 'Imagem de fundo da loja atualizada');
      } catch (error: unknown) {
        setLocalPreview(null);
        showToast.error('Erro', readApiError(error) || 'Não foi possível enviar a imagem de fundo');
      } finally {
        setUploadingBackground(false);
      }
    } catch {
      showToast.error('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const handleRemoveBackground = async () => {
    try {
      setUploadingBackground(true);
      await shopApi.deleteShopBackground();
      setLocalPreview(null);
      patch({ backgroundImage: null, backgroundImageUrl: null });
      showToast.success('Sucesso', 'Imagem de fundo removida');
    } catch {
      showToast.error('Erro', 'Não foi possível remover a imagem de fundo');
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleSaveAppearance = async () => {
    try {
      setSavingAppearance(true);
      const response = await shopApi.updateAppearance({
        ...(canEditBackground
          ? {
              backgroundMode: value.backgroundMode,
              backgroundOverlay: value.backgroundOverlay,
              backgroundOverlayOpacity: value.backgroundOverlayOpacity,
            }
          : {}),
        titleColor: value.titleColor,
        ...(canEditTitleEffect ? { titleDisplayEffect: titleEffect } : {}),
      });

      if (response.success && response.data) {
        const data = response.data;
        onChange({
          ...value,
          backgroundMode: data.backgroundMode ?? value.backgroundMode,
          backgroundOverlay: data.backgroundOverlay ?? value.backgroundOverlay,
          backgroundOverlayOpacity: data.backgroundOverlayOpacity ?? value.backgroundOverlayOpacity,
          titleColor: data.titleColor ?? value.titleColor,
          titleDisplayEffect: mergeTitleDisplayEffect(data.titleDisplayEffect),
          backgroundImage: data.backgroundImage ?? value.backgroundImage,
          backgroundImageUrl: data.backgroundImageUrl ?? value.backgroundImageUrl,
        });
        setTitleEffect(mergeTitleDisplayEffect(data.titleDisplayEffect ?? titleEffect));
      }

      showToast.success('Sucesso', 'Aparência da loja salva');
    } catch (error: unknown) {
      showToast.error('Erro', readApiError(error) || 'Erro ao salvar aparência');
    } finally {
      setSavingAppearance(false);
    }
  };

  const busy = uploadingBackground || savingAppearance;
  const overlayValue = Math.max(0, Math.min(100, value.backgroundOverlayOpacity ?? 0));

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} numberOfLines={2}>
        Aparência da vitrine
      </Text>
      <Text style={styles.sectionCaption}>
        Personalize o fundo e o título da sua loja (separado do perfil).
      </Text>

      {isAdultShop ? (
        <Text style={styles.adultHint}>
          Loja +18: imagens explícitas podem exigir revisão ou ficar restritas a visitantes logados.
        </Text>
      ) : null}

      <View style={[styles.inner, busy && styles.innerBusy]}>
        <PlanLocker requiredPlan="PRO" currentPlan={planType}>
          <View style={styles.block}>
            {uploadingBackground ? (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="large" color={colors.primary.main} />
              </View>
            ) : null}

            <Text style={styles.subsectionTitle}>Imagem de fundo</Text>
            <TouchableOpacity
              style={styles.backgroundPreviewWrap}
              onPress={() => void handleBackgroundPick()}
              disabled={busy}
              activeOpacity={0.85}
            >
              {backgroundPreviewUrl ? (
                <Image source={{ uri: backgroundPreviewUrl }} style={styles.backgroundPreview} />
              ) : (
                <View style={styles.backgroundPlaceholder}>
                  <Ionicons name="image-outline" size={32} color={colors.text.secondary} />
                  <Text style={styles.backgroundPlaceholderText}>Toque para escolher imagem</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.backgroundActions}>
              <Button
                variant="outline"
                size="sm"
                responsive={false}
                onPress={() => void handleBackgroundPick()}
                disabled={busy}
                style={styles.flexBtn}
              >
                {hasCustomBackground ? 'Trocar imagem' : 'Escolher imagem'}
              </Button>
              {hasCustomBackground ? (
                <Button
                  variant="danger"
                  size="sm"
                  responsive={false}
                  onPress={() => void handleRemoveBackground()}
                  disabled={busy}
                >
                  Remover
                </Button>
              ) : null}
            </View>

            {hasCustomBackground ? (
              <CustomSelect
                label="Modo de exibição"
                value={value.backgroundMode}
                options={[
                  { value: 'full', label: 'Página inteira' },
                  { value: 'top', label: 'Até antes das abas' },
                ]}
                onChange={(mode) => patch({ backgroundMode: mode as 'full' | 'top' })}
                helperText={
                  value.backgroundMode === 'top'
                    ? 'A imagem aparece só no topo da vitrine, antes das abas.'
                    : 'A imagem cobre toda a área rolável da loja.'
                }
                disabled={busy}
              />
            ) : null}

            <CustomSlider
              label="Opacidade do overlay"
              value={overlayValue}
              valueSuffix="%"
              min={0}
              max={100}
              step={1}
              steppersStep={5}
              disabled={busy}
              onChange={(next) =>
                patch({
                  backgroundOverlayOpacity: next,
                  backgroundOverlay: next > 0,
                })
              }
            />
          </View>
        </PlanLocker>

        <View style={styles.divider} />

        <Text style={styles.subsectionTitle}>Título da loja</Text>
        <PlanLocker requiredPlan="STARTER" currentPlan={planType}>
          <ColorPickerField
            label="Cor do título"
            value={value.titleColor || '#9333ea'}
            onChange={(color) => patch({ titleColor: color })}
          />
        </PlanLocker>

        <ProfileGradientEffectSection
          title="Efeito no título"
          caption="Gradiente no texto “Loja de @user” (mesmo sistema do perfil, via SVG)."
          planType={planType}
          effect={titleEffect}
          setEffect={(updater) => {
            setTitleEffect((prev) => {
              const next = typeof updater === 'function' ? updater(prev) : updater;
              patch({ titleDisplayEffect: next });
              return next;
            });
          }}
          setHasChanges={() => {}}
          previewUsername={username || 'username'}
          previewPrefix="Loja de "
        />

        {!hideInlineSaveButton && canEditTitleColor ? (
          <Button
            variant="primary"
            size="sm"
            responsive={false}
            onPress={() => void handleSaveAppearance()}
            loading={savingAppearance}
            disabled={busy}
            style={styles.saveBtn}
          >
            Salvar aparência
          </Button>
        ) : null}
      </View>
    </View>
  );
}

function readApiError(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const data = (error as { response?: { data?: { message?: string } } }).response?.data;
    if (data?.message) return String(data.message);
  }
  if (error instanceof Error && error.message) return error.message;
  return undefined;
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  section: {
    marginTop: 0,
    width: '100%',
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.text.primary,
    marginBottom: 4,
    flexShrink: 1,
  },
  sectionCaption: {
    fontSize: 12,
    color: c.text.secondary,
    lineHeight: 16,
    marginBottom: 12,
    flexShrink: 1,
  },
  adultHint: {
    fontSize: 12,
    color: c.states.warning,
    marginBottom: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  inner: {
    position: 'relative',
    width: '100%',
    minWidth: 0,
  },
  innerBusy: {
    opacity: 0.85,
  },
  block: {
    width: '100%',
    minWidth: 0,
    position: 'relative',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    backgroundColor: c.isDark ? c.overlay : 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 8,
    marginTop: 4,
    flexShrink: 1,
  },
  backgroundPreviewWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.border.light,
    marginBottom: 10,
    width: '100%',
  },
  backgroundPreview: {
    width: '100%',
    height: 140,
    backgroundColor: c.background.tertiary,
  },
  backgroundPlaceholder: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.background.default,
    paddingHorizontal: 12,
  },
  backgroundPlaceholderText: {
    fontSize: 13,
    color: c.text.secondary,
    textAlign: 'center',
  },
  backgroundActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    width: '100%',
    minWidth: 0,
  },
  flexBtn: {
    flex: 1,
    minWidth: 0,
  },
  divider: {
    height: 1,
    backgroundColor: c.border.light,
    marginVertical: 12,
  },
  saveBtn: {
    marginTop: 8,
    width: '100%',
  },
});
