import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { PlanLocker } from '../PlanLocker';
import { ColorPickerField } from '../ColorPickerField';
import { ProfileGradientEffectSection } from '../../screens/settings/ProfileGradientEffectSection';
import { shopApi } from '../../services/api';
import { COLORS } from '../../theme/colors';
import { showToast } from '../CustomToast';
import { getImageUrl } from '../../utils/image';
import { resolveUserPlanType, type PlanType } from '../../config/plan-features';
import type { UsernameDisplayEffectConfig } from '../../types/username-display-effect';
import {
  DEFAULT_USERNAME_DISPLAY_EFFECT,
  normalizeUsernameDisplayEffect,
} from '../../types/username-display-effect';

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
};

export function ShopAppearanceSettingsSection({
  currentPlan = 'FREE',
  username,
  isAdultShop = false,
  value,
  onChange,
}: Props) {
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [titleEffect, setTitleEffect] = useState<UsernameDisplayEffectConfig>(() =>
    mergeTitleDisplayEffect(value.titleDisplayEffect)
  );

  const planType = resolveUserPlanType(currentPlan) as PlanType;

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
        backgroundMode: value.backgroundMode,
        backgroundOverlay: value.backgroundOverlay,
        backgroundOverlayOpacity: value.backgroundOverlayOpacity,
        titleColor: value.titleColor,
        titleDisplayEffect: titleEffect,
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
      <Text style={styles.sectionTitle}>Aparência da vitrine</Text>
      <Text style={styles.sectionCaption}>
        Personalize o fundo e o título da sua loja (separado do perfil).
      </Text>

      {isAdultShop ? (
        <Text style={styles.adultHint}>
          Loja +18: imagens explícitas podem exigir revisão ou ficar restritas a visitantes logados.
        </Text>
      ) : null}

      <PlanLocker requiredPlan="PRO" currentPlan={planType}>
        <View style={[styles.inner, busy && styles.innerBusy]}>
          {uploadingBackground ? (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary.main} />
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
                <Ionicons name="image-outline" size={32} color={COLORS.text.secondary} />
                <Text style={styles.backgroundPlaceholderText}>Toque para escolher imagem</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.backgroundActions}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => void handleBackgroundPick()}
              disabled={busy}
            >
              <Text style={styles.secondaryBtnText}>
                {hasCustomBackground ? 'Trocar imagem' : 'Escolher imagem'}
              </Text>
            </TouchableOpacity>
            {hasCustomBackground ? (
              <TouchableOpacity
                style={styles.dangerOutlineBtn}
                onPress={() => void handleRemoveBackground()}
                disabled={busy}
              >
                <Text style={styles.dangerOutlineBtnText}>Remover</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {hasCustomBackground ? (
            <>
              <Text style={styles.fieldLabel}>Modo de exibição</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={value.backgroundMode}
                  onValueChange={(mode) => patch({ backgroundMode: mode as 'full' | 'top' })}
                  style={styles.picker}
                  dropdownIconColor={COLORS.text.secondary}
                  enabled={!busy}
                >
                  <Picker.Item label="Página inteira" value="full" />
                  <Picker.Item label="Até antes das abas" value="top" />
                </Picker>
              </View>
              <Text style={styles.helperText}>
                {value.backgroundMode === 'top'
                  ? 'A imagem aparece só no topo da vitrine, antes das abas.'
                  : 'A imagem cobre toda a área rolável da loja.'}
              </Text>
            </>
          ) : null}

          <Text style={styles.fieldLabel}>Opacidade do overlay: {overlayValue}%</Text>
          <View style={styles.sliderRow}>
            <TouchableOpacity
              style={styles.sliderBtn}
              onPress={() =>
                patch({
                  backgroundOverlayOpacity: Math.max(0, overlayValue - 5),
                  backgroundOverlay: overlayValue - 5 > 0,
                })
              }
              disabled={busy}
            >
              <Ionicons name="remove" size={20} color={COLORS.text.primary} />
            </TouchableOpacity>
            <View style={styles.sliderTrack}>
              <View style={styles.sliderTrackBg} />
              <View
                style={[
                  styles.sliderTrackFill,
                  { width: `${overlayValue}%`, backgroundColor: COLORS.primary.main },
                ]}
              />
            </View>
            <TouchableOpacity
              style={styles.sliderBtn}
              onPress={() =>
                patch({
                  backgroundOverlayOpacity: Math.min(100, overlayValue + 5),
                  backgroundOverlay: true,
                })
              }
              disabled={busy}
            >
              <Ionicons name="add" size={20} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.subsectionTitle}>Título da loja</Text>
          <ColorPickerField
            label="Cor do título"
            value={value.titleColor || '#9333ea'}
            onChange={(color) => patch({ titleColor: color })}
          />

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

          <TouchableOpacity
            style={[styles.saveBtn, busy && styles.saveBtnDisabled]}
            onPress={() => void handleSaveAppearance()}
            disabled={busy}
          >
            {savingAppearance ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Salvar aparência</Text>
            )}
          </TouchableOpacity>
        </View>
      </PlanLocker>
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

const styles = StyleSheet.create({
  section: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  sectionCaption: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  adultHint: {
    fontSize: 12,
    color: COLORS.states.warning,
    marginBottom: 12,
    lineHeight: 16,
  },
  inner: {
    position: 'relative',
  },
  innerBusy: {
    opacity: 0.85,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
    marginTop: 4,
  },
  backgroundPreviewWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    marginBottom: 10,
  },
  backgroundPreview: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.background.tertiary,
  },
  backgroundPlaceholder: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.background.default,
  },
  backgroundPlaceholderText: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  backgroundActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  dangerOutlineBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.states.error,
    alignItems: 'center',
  },
  dangerOutlineBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.states.error,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
    marginTop: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 6,
  },
  picker: {
    color: COLORS.text.primary,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sliderBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  sliderTrackBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background.tertiary,
  },
  sliderTrackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border.light,
    marginVertical: 12,
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary.main,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
