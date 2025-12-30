import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../theme/colors';

interface ColorPickerFieldProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  compact?: boolean;
}

// Converter HEX para RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Converter RGB para HEX
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Cores predefinidas
const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000',
];

export function ColorPickerField({ label, value, onChange, compact = false }: ColorPickerFieldProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const [rgbInput, setRgbInput] = useState(() => {
    const rgb = hexToRgb(value);
    return rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '';
  });

  const handleHexChange = (text: string) => {
    // Remover caracteres inválidos
    let cleaned = text.replace(/[^0-9A-Fa-f#]/g, '');
    if (!cleaned.startsWith('#')) {
      cleaned = '#' + cleaned;
    }
    if (cleaned.length > 7) {
      cleaned = cleaned.slice(0, 7);
    }
    setHexInput(cleaned);

    // Validar e atualizar se for válido
    if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
      onChange(cleaned);
      const rgb = hexToRgb(cleaned);
      if (rgb) {
        setRgbInput(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
    }
  };

  const handleRgbChange = (text: string) => {
    setRgbInput(text);
    const parts = text.split(',').map((p) => parseInt(p.trim()));
    if (parts.length === 3 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
      const hex = rgbToHex(parts[0], parts[1], parts[2]);
      setHexInput(hex);
      onChange(hex);
    }
  };

  const handlePresetColorPress = (color: string) => {
    setHexInput(color);
    onChange(color);
    const rgb = hexToRgb(color);
    if (rgb) {
      setRgbInput(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
  };

  const openModal = () => {
    setHexInput(value);
    const rgb = hexToRgb(value);
    setRgbInput(rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '');
    setModalVisible(true);
  };

  return (
    <>
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={styles.colorButton}
          onPress={openModal}
          activeOpacity={0.7}
        >
          <View style={[styles.colorPreview, { backgroundColor: value }]} />
          <Text style={styles.colorValue}>{value.toUpperCase()}</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.text.secondary} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Preview da cor */}
              <View style={[styles.colorPreviewLarge, { backgroundColor: value }]} />

              {/* Input HEX */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>HEX</Text>
                <TextInput
                  style={styles.input}
                  value={hexInput}
                  onChangeText={handleHexChange}
                  placeholder="#000000"
                  placeholderTextColor={COLORS.text.tertiary}
                  autoCapitalize="characters"
                  maxLength={7}
                />
              </View>

              {/* Input RGB */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>RGB</Text>
                <TextInput
                  style={styles.input}
                  value={rgbInput}
                  onChangeText={handleRgbChange}
                  placeholder="0, 0, 0"
                  placeholderTextColor={COLORS.text.tertiary}
                  keyboardType="numeric"
                />
              </View>

              {/* Cores predefinidas */}
              <View style={styles.presetSection}>
                <Text style={styles.presetLabel}>Cores Predefinidas</Text>
                <View style={styles.presetGrid}>
                  {PRESET_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.presetColor,
                        { backgroundColor: color },
                        value === color && styles.presetColorSelected,
                      ]}
                      onPress={() => handlePresetColorPress(color)}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.saveButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  colorValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  modalBody: {
    padding: 16,
  },
  colorPreviewLarge: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  presetSection: {
    marginTop: 8,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetColor: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetColorSelected: {
    borderColor: COLORS.primary.main,
    borderWidth: 3,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  saveButton: {
    backgroundColor: COLORS.primary.main,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

