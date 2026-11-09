import React from 'react';
import { View, Text, Pressable, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CustomModal } from '../../CustomModal';
import { Button } from '../../Button';
import { useAppTheme, useThemedStyles } from '../../../contexts/ThemeContext';
import { SURFACE_RADIUS, type AppPalette } from '../../../theme/palettes';
import type { ProductDraftSummary } from '../../../services/products';

const STEP_LABELS = ['Conteúdo', 'Detalhes', 'Revisão'];

type ProductDraftResumeModalProps = {
  visible: boolean;
  drafts: ProductDraftSummary[];
  busy?: boolean;
  onClose: () => void;
  onContinue: (draftId: string) => void;
  onDiscard: (draftId: string) => void;
  onCreateNew: () => void;
};

function formatSavedAt(value?: string | null): string {
  if (!value) return 'salvo recentemente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'salvo recentemente';
  return `salvo em ${date.toLocaleDateString('pt-BR')}`;
}

/** Mesmo conteúdo do `ProductDraftResumeModal` web. */
export function ProductDraftResumeModal({
  visible,
  drafts,
  busy = false,
  onClose,
  onContinue,
  onDiscard,
  onCreateNew,
}: ProductDraftResumeModalProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <CustomModal visible={visible} onClose={busy ? undefined : onClose}>
      <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
        <View style={styles.header}>
          <Ionicons name="folder-open-outline" size={22} color={colors.secondary.main} />
          <Text style={styles.title}>Continuar um rascunho?</Text>
          {busy ? <ActivityIndicator size="small" color={colors.secondary.main} /> : null}
        </View>
        <Text style={styles.subtitle}>
          Você tem pacotes não publicados. Continue de onde parou, descarte ou comece um novo.
        </Text>

        {drafts.map((draft) => (
          <View key={draft._id} style={styles.draftRow}>
            <View style={styles.draftInfo}>
              <Text style={styles.draftTitle} numberOfLines={1}>
                {draft.title.trim() || 'Sem título'}
              </Text>
              <Text style={styles.draftMeta}>
                {draft.filesCount} arquivo(s) · passo{' '}
                {STEP_LABELS[draft.draftWizardStep ?? 0] ?? STEP_LABELS[0]} ·{' '}
                {formatSavedAt(draft.draftLastSavedAt)}
              </Text>
              <View style={styles.continueButton}>
                <Button size="sm" onPress={() => onContinue(draft._id)} disabled={busy} responsive={false}>
                  Continuar
                </Button>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => onDiscard(draft._id)}
              disabled={busy}
              accessibilityLabel="Descartar este rascunho"
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={20} color={colors.states.error} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.actions}>
          <Button variant="ghost" onPress={onClose} disabled={busy} responsive={false}>
            Cancelar
          </Button>
          <Button onPress={onCreateNew} disabled={busy} responsive={false}>
            Novo pacote
          </Button>
        </View>
      </Pressable>
    </CustomModal>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    card: {
      width: '90%',
      maxWidth: 420,
      backgroundColor: c.background.paper,
      borderRadius: SURFACE_RADIUS,
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: c.text.primary,
    },
    subtitle: {
      marginTop: 8,
      marginBottom: 14,
      fontSize: 14,
      color: c.text.secondary,
    },
    draftRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      marginBottom: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border.light,
    },
    draftInfo: {
      flex: 1,
      minWidth: 0,
    },
    draftTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text.primary,
    },
    draftMeta: {
      marginTop: 2,
      fontSize: 12,
      color: c.text.secondary,
    },
    continueButton: {
      marginTop: 10,
      alignSelf: 'flex-start',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 6,
    },
  });
