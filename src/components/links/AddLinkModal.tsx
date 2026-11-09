import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import { ModalBottom } from '../ModalBottom';

interface AddLinkModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (linkData: { title: string; url: string; visible: boolean }) => Promise<void>;
  loading?: boolean;
}

export function AddLinkModal({ visible, onClose, onAdd, loading = false }: AddLinkModalProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
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
    <ModalBottom
      visible={visible}
      onClose={handleClose}
      maxHeight="90%"
    >
      <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Adicionar Link</Text>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
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
                placeholderTextColor={colors.text.tertiary}
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
                placeholderTextColor={colors.text.tertiary}
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
                trackColor={{ false: colors.border.medium, true: colors.secondary.main }}
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
                <ActivityIndicator size="small" color={colors.primary.contrastText} />
              ) : (
                <Text style={styles.submitButtonText}>Adicionar</Text>
              )}
            </TouchableOpacity>
          </View>
      </View>
    </ModalBottom>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  modalContainer: {
    backgroundColor: c.background.paper,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.border.light,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: c.text.primary,
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
    color: c.text.primary,
  },
  input: {
    backgroundColor: c.background.default,
    borderWidth: 1,
    borderColor: c.border.medium,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: c.text.primary,
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
    color: c.text.secondary,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: c.border.light,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: c.background.default,
    borderWidth: 1,
    borderColor: c.border.medium,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text.primary,
  },
  submitButton: {
    backgroundColor: c.primary.main,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.primary.contrastText,
  },
});

