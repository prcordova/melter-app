import React, { type Dispatch, type SetStateAction } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PlanLocker } from '../../components/PlanLocker';
import { ColorPickerField } from '../../components/ColorPickerField';
import { UsernameGradientText } from '../../components/UsernameGradientText';
import { CustomToggle } from '../../components/CustomToggle';
import { CustomSelect } from '../../components/CustomSelect';
import { CustomSlider } from '../../components/CustomSlider';
import { useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import type { UsernameDisplayEffectConfig } from '../../types/username-display-effect';
import { DEFAULT_USERNAME_DISPLAY_EFFECT } from '../../types/username-display-effect';
import type { PlanType } from '../../config/plan-features';

type Plan = PlanType | undefined;

type Props = {
  title: string;
  caption: string;
  planType: Plan;
  effect: UsernameDisplayEffectConfig;
  setEffect: Dispatch<SetStateAction<UsernameDisplayEffectConfig>>;
  setHasChanges: (v: boolean) => void;
  previewUsername: string;
  previewPrefix: string;
};

export function ProfileGradientEffectSection({
  title,
  caption,
  planType,
  effect,
  setEffect,
  setHasChanges,
  previewUsername,
  previewPrefix,
}: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <>
      <Text style={styles.sectionTitle} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.helperCaption}>{caption}</Text>

      <PlanLocker requiredPlan="PRO" currentPlan={planType}>
        <CustomToggle
          checked={effect.enabled}
          label="Ativar efeito"
          onChange={(value) => {
            setEffect((prev) =>
              value
                ? { ...DEFAULT_USERNAME_DISPLAY_EFFECT, ...prev, enabled: true }
                : { ...prev, enabled: false }
            );
            setHasChanges(true);
          }}
          style={styles.toggle}
        />

        {effect.enabled ? (
          <>
            <CustomSelect
              label="Movimento do gradiente"
              value={effect.motionMode}
              options={[
                { value: 'static', label: 'Estático' },
                { value: 'animated', label: 'Animado' },
              ]}
              onChange={(value) => {
                setEffect((p) => ({
                  ...p,
                  motionMode: value as UsernameDisplayEffectConfig['motionMode'],
                }));
                setHasChanges(true);
              }}
            />

            <View style={styles.colorPairRow}>
              <ColorPickerField
                label="Cor inicial do gradiente"
                value={effect.gradientFrom}
                onChange={(color) => {
                  setEffect((p) => ({ ...p, gradientFrom: color }));
                  setHasChanges(true);
                }}
                fieldContainerStyle={styles.colorPairField}
              />
              <ColorPickerField
                label="Cor final do gradiente"
                value={effect.gradientTo}
                onChange={(color) => {
                  setEffect((p) => ({ ...p, gradientTo: color }));
                  setHasChanges(true);
                }}
                fieldContainerStyle={styles.colorPairField}
              />
            </View>
            <View style={styles.colorPairRow}>
              <ColorPickerField
                label="Cor inicial (hover — web)"
                value={effect.gradientHoverFrom}
                onChange={(color) => {
                  setEffect((p) => ({ ...p, gradientHoverFrom: color }));
                  setHasChanges(true);
                }}
                fieldContainerStyle={styles.colorPairField}
              />
              <ColorPickerField
                label="Cor final (hover — web)"
                value={effect.gradientHoverTo}
                onChange={(color) => {
                  setEffect((p) => ({ ...p, gradientHoverTo: color }));
                  setHasChanges(true);
                }}
                fieldContainerStyle={styles.colorPairField}
              />
            </View>

            <CustomSlider
              label="Intensidade do brilho"
              value={effect.glowIntensity}
              min={0}
              max={100}
              step={1}
              steppersStep={5}
              onChange={(v) => {
                setEffect((p) => ({ ...p, glowIntensity: v }));
                setHasChanges(true);
              }}
            />

            <CustomSlider
              label="Brilho no hover (web)"
              value={effect.hoverGlowIntensity}
              min={0}
              max={100}
              step={1}
              steppersStep={5}
              onChange={(v) => {
                setEffect((p) => ({ ...p, hoverGlowIntensity: v }));
                setHasChanges(true);
              }}
            />

            <CustomToggle
              checked={effect.applyHover}
              label="Cores alternam ao passar o rato (web)"
              onChange={(value) => {
                setEffect((p) => ({ ...p, applyHover: value }));
                setHasChanges(true);
              }}
              style={styles.toggle}
            />

            <CustomSelect
              label="Modo em listagens explorar (web)"
              value={effect.explorerMode}
              options={[
                { value: 'always', label: 'Gradiente sempre visível' },
                { value: 'hover_only', label: 'Só ao passar o rato (hover)' },
              ]}
              onChange={(value) => {
                setEffect((p) => ({
                  ...p,
                  explorerMode: value as UsernameDisplayEffectConfig['explorerMode'],
                }));
                setHasChanges(true);
              }}
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Pré-visualização</Text>
              <UsernameGradientText
                username={previewUsername}
                prefix={previewPrefix}
                effect={effect}
                fontSize={18}
                fontWeight="700"
              />
            </View>
          </>
        ) : null}
      </PlanLocker>
    </>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text.primary,
      marginBottom: 8,
      flexShrink: 1,
    },
    helperCaption: {
      fontSize: 13,
      color: c.text.secondary,
      marginBottom: 12,
      lineHeight: 18,
      flexShrink: 1,
    },
    toggle: {
      marginBottom: 12,
    },
    colorPairRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
      alignItems: 'flex-start',
      width: '100%',
      minWidth: 0,
    },
    colorPairField: {
      flex: 1,
      marginBottom: 0,
      minWidth: 0,
    },
    fieldContainer: {
      marginBottom: 16,
      width: '100%',
      minWidth: 0,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: c.text.primary,
      marginBottom: 8,
      flexShrink: 1,
    },
  });
