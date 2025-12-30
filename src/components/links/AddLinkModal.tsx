import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';

interface AddLinkModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (linkData: { title: string; url: string; visible: boolean }) => Promise<void>;
  loading?: boolean;
}

export function AddLinkModal({ visible, onClose, onAdd, loading = false }: AddLinkModalProps) {
  const insets = useSafeAreaInsets();
  const [linkData, setLinkData] = useState({
    title: '',
    url: '',
    visible: true,
  });

  const handleSubmit = async () => {
    if (!linkData.title.trim() || !linkData.url.trim()) {
      return;
    }
    await onAdd(linkData);
    // Limpar form após adicionar
    setLinkData({ title: '', url: '', visible: true });
  };

  const handleClose = () => {
    if (!loading) {
      setLinkData({ title: '', url: '', visible: true });
      onClose();
    }
  };

  const isValid = linkData.title.trim().length > 0 && linkData.url.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Adicionar Link</Text>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                value={linkData.title}
                onChangeText={(text) => setLinkData((prev) => ({ ...prev, title: text }))}
                placeholder="Ex: Meu Instagram"
                placeholderTextColor={COLORS.text.tertiary}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>URL *</Text>
              <TextInput
                style={styles.input}
                value={linkData.url}
                onChangeText={(text) => setLinkData((prev) => ({ ...prev, url: text }))}
                placeholder="https://..."
                placeholderTextColor={COLORS.text.tertiary}
                keyboardType="url"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.switchGroup}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.label}>Visível</Text>
                <Text style={styles.switchDescription}>
                  {linkData.visible ? 'Link será exibido no seu perfil' : 'Link ficará oculto'}
                </Text>
              </View>
              <Switch
                value={linkData.visible}
                onValueChange={(value) => setLinkData((prev) => ({ ...prev, visible: value }))}
                trackColor={{ false: COLORS.border.medium, true: COLORS.secondary.main }}
                thumbColor="#ffffff"
                disabled={loading}
              />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, !isValid && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading || !isValid}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Adicionar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  input: {
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchDescription: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  submitButton: {
    backgroundColor: COLORS.primary.main,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

