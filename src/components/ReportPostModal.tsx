import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from './Button';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';
import { postsApi } from '../services/api';

interface ReportPostModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postAuthorUsername: string;
}

type ReportCategory = 'HARASSMENT' | 'PORNOGRAPHY' | 'VIOLENCE' | 'SPAM' | 'HATE_SPEECH' | 'FAKE_PROFILE' | 'SCAM' | 'OTHER';

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  HARASSMENT: 'Assédio',
  PORNOGRAPHY: 'Pornografia',
  VIOLENCE: 'Violência',
  SPAM: 'Spam',
  HATE_SPEECH: 'Discurso de Ódio',
  FAKE_PROFILE: 'Perfil Falso',
  SCAM: 'Golpe/Fraude',
  OTHER: 'Outro',
};

export function ReportPostModal({
  visible,
  onClose,
  postId,
  postAuthorUsername,
}: ReportPostModalProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
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
      await postsApi.reportPost(postId, {
        category: selectedCategory,
        description: description.trim(),
        targetUsername: postAuthorUsername,
      });

      Alert.alert(
        'Denúncia Enviada',
        'Sua denúncia foi enviada com sucesso! Nossa equipe analisará em breve.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (error) {
      console.error('[ReportPostModal] Erro ao denunciar:', error);
      Alert.alert('Erro', 'Não foi possível enviar a denúncia');
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory(null);
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
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Denunciar @{postAuthorUsername}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Alert Info */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={colors.states.info} />
              <Text style={styles.infoText}>
                Sua denúncia será analisada por nossa equipe. Mantenha a descrição clara e objetiva.
              </Text>
            </View>

            {/* Categorias */}
            <Text style={styles.sectionTitle}>Categoria</Text>
            <View style={styles.categoriesContainer}>
              {(Object.entries(CATEGORY_LABELS) as [ReportCategory, string][]).map(
                ([category, label]) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category && styles.categoryButtonActive,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                    disabled={submitting}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        selectedCategory === category && styles.categoryTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            {/* Descrição */}
            <Text style={styles.sectionTitle}>Descrição do problema</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Descreva o que aconteceu..."
              placeholderTextColor={colors.text.tertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={1000}
              editable={!submitting}
            />
            <Text style={styles.charCount}>{description.length}/1000</Text>

            {/* Botão Enviar */}
            <Button
              onPress={handleSubmit}
              loading={submitting}
              disabled={!selectedCategory || !description.trim() || submitting}
              style={styles.submitButton}
            >
              Enviar Denúncia
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: c.background.paper,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border.light,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: c.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: c.states.info + '15',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: c.states.info,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border.medium,
    backgroundColor: c.background.default,
  },
  categoryButtonActive: {
    borderColor: c.secondary.main,
    borderWidth: 2,
    backgroundColor: c.background.paper,
  },
  categoryText: {
    fontSize: 14,
    color: c.text.secondary,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: c.secondary.main,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: c.border.light,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 14,
    color: c.text.primary,
    backgroundColor: c.background.tertiary,
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: c.text.secondary,
    textAlign: 'right',
    marginBottom: 20,
  },
  submitButton: {
    marginTop: 8,
  },
});

