import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { storiesApi } from '../../services/api';
import { COLORS } from '../../theme/colors';
import { showToast } from '../CustomToast';
import { Select } from '../ui/Select';

interface ReportStoryModalProps {
  visible: boolean;
  onClose: () => void;
  storyId: string;
  storyOwnerUsername: string;
}

type ReportCategory = 'HARASSMENT' | 'PORNOGRAPHY' | 'VIOLENCE' | 'SPAM' | 'HATE_SPEECH' | 'FAKE_PROFILE' | 'SCAM' | 'OTHER';

const CATEGORY_OPTIONS = [
  { label: 'Assédio', value: 'HARASSMENT' },
  { label: 'Pornografia', value: 'PORNOGRAPHY' },
  { label: 'Violência', value: 'VIOLENCE' },
  { label: 'Spam', value: 'SPAM' },
  { label: 'Discurso de Ódio', value: 'HATE_SPEECH' },
  { label: 'Perfil Falso', value: 'FAKE_PROFILE' },
  { label: 'Golpe/Fraude', value: 'SCAM' },
  { label: 'Outro', value: 'OTHER' },
];

export function ReportStoryModal({
  visible,
  onClose,
  storyId,
  storyOwnerUsername,
}: ReportStoryModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Atenção', 'Selecione uma categoria');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Atenção', 'Descreva o problema');
      return;
    }

    try {
      setSubmitting(true);
      const response = await storiesApi.reportStory(storyId, {
        category: selectedCategory,
        description: description.trim(),
      });

      if (response.success) {
        showToast.success('Sucesso', 'Denúncia enviada com sucesso!');
        handleClose();
      } else {
        throw new Error(response.message || 'Erro ao enviar denúncia');
      }
    } catch (error: any) {
      console.error('[ReportStoryModal] Erro ao denunciar:', error);
      showToast.error('Erro', error.message || 'Não foi possível enviar a denúncia');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory('');
    setDescription('');
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Denunciar Story</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>
              Por que você está denunciando este story de @{storyOwnerUsername}?
            </Text>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.states.info} />
              <Text style={styles.infoText}>
                Sua denúncia será analisada por nossa equipe. Mantenha a descrição clara e objetiva.
              </Text>
            </View>

            {/* Categoria */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Categoria *</Text>
              <Select
                selectedValue={selectedCategory}
                onValueChange={(value) => setSelectedCategory(value as ReportCategory)}
                items={CATEGORY_OPTIONS}
                placeholder="Selecione uma categoria"
                wrapperStyle={styles.selectWrapper}
              />
            </View>

            {/* Descrição */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Descrição do problema *</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Descreva o que aconteceu..."
                placeholderTextColor={COLORS.text.tertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{description.length}/1000 caracteres</Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[styles.cancelButton, submitting && styles.buttonDisabled]}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedCategory || !description.trim() || submitting) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedCategory || !description.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Enviar Denúncia</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    maxHeight: 500,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.states.info + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.states.info,
    lineHeight: 18,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  selectWrapper: {
    marginBottom: 0,
  },
  textArea: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text.primary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    marginTop: 4,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.states.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

