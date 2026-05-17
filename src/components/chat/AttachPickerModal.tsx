import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';

export type AttachPickerOption = 'photo' | 'document';

interface AttachPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: AttachPickerOption) => void;
}

export function AttachPickerModal({ visible, onClose, onSelect }: AttachPickerModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Anexar</Text>
          <Text style={styles.subtitle}>Escolha o tipo de arquivo</Text>

          <TouchableOpacity
            style={styles.option}
            onPress={() => {
              onClose();
              onSelect('photo');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: 'rgba(182, 51, 133, 0.12)' }]}>
              <Ionicons name="image-outline" size={24} color={COLORS.secondary.main} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Foto</Text>
              <Text style={styles.optionDescription}>Galeria de imagens</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => {
              onClose();
              onSelect('document');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: 'rgba(35, 4, 53, 0.08)' }]}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.primary.main} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Documento</Text>
              <Text style={styles.optionDescription}>PDF, arquivos e outros</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border.light,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  optionDescription: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
});
