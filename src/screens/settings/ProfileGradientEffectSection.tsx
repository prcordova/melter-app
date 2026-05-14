import React, { type Dispatch, type SetStateAction } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PlanLocker } from '../../components/PlanLocker';
import { ColorPickerField } from '../../components/ColorPickerField';
import { UsernameGradientText } from '../../components/UsernameGradientText';
import { COLORS } from '../../theme/colors';
import type { UsernameDisplayEffectConfig } from '../../types/username-display-effect';
import { DEFAULT_USERNAME_DISPLAY_EFFECT } from '../../types/username-display-effect';

type Plan = 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS' | undefined;

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
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.helperCaption}>{caption}</Text>

      <PlanLocker requiredPlan="PRO" currentPlan={planType}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Ativar efeito</Text>
          <Switch
            value={effect.enabled}
            onValueChange={(value) => {
              setEffect((prev) =>
                value
                  ? { ...DEFAULT_USERNAME_DISPLAY_EFFECT, ...prev, enabled: true }
                  : { ...prev, enabled: false }
              );
              setHasChanges(true);
            }}
            trackColor={{ false: COLORS.border.medium, true: COLORS.primary.main }}
            thumbColor="#ffffff"
          />
        </View>

        {effect.enabled ? (
          <>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Movimento do gradiente</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={effect.motionMode}
                  onValueChange={(value) => {
                    setEffect((p) => ({
                      ...p,
                      motionMode: value as UsernameDisplayEffectConfig['motionMode'],
                    }));
                    setHasChanges(true);
                  }}
                  style={styles.picker}
                  dropdownIconColor={COLORS.text.secondary}
                >
                  <Picker.Item label="Estático" value="static" />
                  <Picker.Item label="Animado" value="animated" />
                </Picker>
              </View>
            </View>

            <ColorPickerField
              label="Cor inicial do gradiente"
              value={effect.gradientFrom}
              onChange={(color) => {
                setEffect((p) => ({ ...p, gradientFrom: color }));
                setHasChanges(true);
              }}
            />
            <ColorPickerField
              label="Cor final do gradiente"
              value={effect.gradientTo}
              onChange={(color) => {
                setEffect((p) => ({ ...p, gradientTo: color }));
                setHasChanges(true);
              }}
            />
            <ColorPickerField
              label="Cor inicial (hover — web)"
              value={effect.gradientHoverFrom}
              onChange={(color) => {
                setEffect((p) => ({ ...p, gradientHoverFrom: color }));
                setHasChanges(true);
              }}
            />
            <ColorPickerField
              label="Cor final (hover — web)"
              value={effect.gradientHoverTo}
              onChange={(color) => {
                setEffect((p) => ({ ...p, gradientHoverTo: color }));
                setHasChanges(true);
              }}
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Intensidade do brilho: {effect.glowIntensity}</Text>
              <View style={styles.sliderContainer}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => {
                    const v = Math.max(0, effect.glowIntensity - 5);
                    setEffect((p) => ({ ...p, glowIntensity: v }));
                    setHasChanges(true);
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
                        width: `${Math.max(0, Math.min(100, effect.glowIntensity))}%`,
                        backgroundColor: COLORS.primary.main,
                      },
                    ]}
                  />
                </View>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => {
                    const v = Math.min(100, effect.glowIntensity + 5);
                    setEffect((p) => ({ ...p, glowIntensity: v }));
                    setHasChanges(true);
                  }}
                >
                  <Ionicons name="add" size={20} color={COLORS.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Brilho no hover (web): {effect.hoverGlowIntensity}</Text>
              <View style={styles.sliderContainer}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => {
                    const v = Math.max(0, effect.hoverGlowIntensity - 5);
                    setEffect((p) => ({ ...p, hoverGlowIntensity: v }));
                    setHasChanges(true);
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
                        width: `${Math.max(0, Math.min(100, effect.hoverGlowIntensity))}%`,
                        backgroundColor: COLORS.primary.main,
                      },
                    ]}
                  />
                </View>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => {
                    const v = Math.min(100, effect.hoverGlowIntensity + 5);
                    setEffect((p) => ({ ...p, hoverGlowIntensity: v }));
                    setHasChanges(true);
                  }}
                >
                  <Ionicons name="add" size={20} color={COLORS.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Cores alternam ao passar o rato (web)</Text>
              <Switch
                value={effect.applyHover}
                onValueChange={(value) => {
                  setEffect((p) => ({ ...p, applyHover: value }));
                  setHasChanges(true);
                }}
                trackColor={{ false: COLORS.border.medium, true: COLORS.primary.main }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Modo em listagens explorar (web)</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={effect.explorerMode}
                  onValueChange={(value) => {
                    setEffect((p) => ({
                      ...p,
                      explorerMode: value as UsernameDisplayEffectConfig['explorerMode'],
                    }));
                    setHasChanges(true);
                  }}
                  style={styles.picker}
                  dropdownIconColor={COLORS.text.secondary}
                >
                  <Picker.Item label="Gradiente sempre visível" value="always" />
                  <Picker.Item label="Só ao passar o rato (hover)" value="hover_only" />
                </Picker>
              </View>
            </View>

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

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  helperCaption: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginBottom: 16,
    lineHeight: 18,
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
});
