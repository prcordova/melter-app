import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { BackButton } from '../components/BackButton';
import { ThemedStatusBar } from '../components/ThemedStatusBar';
import { Button } from '../components/Button';
import { RichPostText } from '../components/RichPostText';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import { useAppUpdate } from '../contexts/AppUpdateContext';
import { appApi } from '../services/app/api';
import type { AppReleaseNote } from '../config/app/types';
import type { AppPalette } from '../theme/palettes';

type AppReleaseNotesRoute = RouteProp<{ AppReleaseNotes: { noteId?: string } | undefined }, 'AppReleaseNotes'>;

export function AppReleaseNotesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const route = useRoute<AppReleaseNotesRoute>();
  const highlightId = route.params?.noteId;
  const { status, latestVersion, installedVersion, openUpdate } = useAppUpdate();
  const hasUpdate = status === 'available' || status === 'required';

  const [notes, setNotes] = useState<AppReleaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await appApi.getDownloadInfo();
      setNotes(res.success && res.data ? res.data.releaseNotes : []);
      setError(!res.success);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedStatusBar />
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Novidades do app</Text>
        <Text style={styles.headerSubtitle}>Você está na versão {installedVersion}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />}
      >
        {hasUpdate && (
          <View style={styles.updateCard}>
            <Text style={styles.updateTitle}>
              Nova versão disponível{latestVersion ? ` (${latestVersion})` : ''}
            </Text>
            <Text style={styles.updateText}>Baixe e instale por cima: sua conta e seus dados continuam.</Text>
            <Button variant="primary" size="md" onPress={() => void openUpdate()}>
              Atualizar agora
            </Button>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={colors.primary.main} style={styles.loader} />
        ) : error && notes.length === 0 ? (
          <Text style={styles.emptyText}>Não foi possível carregar as novidades. Puxe para tentar de novo.</Text>
        ) : notes.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma novidade publicada ainda.</Text>
        ) : (
          notes.map((note) => (
            <View key={note.id} style={[styles.noteCard, note.id === highlightId && styles.noteCardHighlight]}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteTitle}>{note.title}</Text>
                {note.version ? <Text style={styles.versionChip}>v{note.version}</Text> : null}
              </View>
              {(() => {
                const d = note.publishedAt ? new Date(note.publishedAt) : null
                const ok = d && !Number.isNaN(d.getTime())
                return ok ? (
                  <Text style={styles.noteDate}>{format(d, 'dd/MM/yyyy')}</Text>
                ) : null
              })()}
              <RichPostText text={note.description} style={styles.noteDescription} color={colors.text.secondary} />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background.default,
    },
    header: {
      backgroundColor: c.background.paper,
      borderBottomWidth: 1,
      borderBottomColor: c.border.light,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: c.text.primary,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    headerSubtitle: {
      fontSize: 13,
      color: c.text.secondary,
      paddingHorizontal: 16,
      paddingTop: 4,
    },
    content: {
      padding: 16,
      gap: 12,
    },
    loader: {
      marginTop: 32,
    },
    emptyText: {
      color: c.text.secondary,
      textAlign: 'center',
      marginTop: 32,
    },
    updateCard: {
      backgroundColor: c.background.paper,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.primary.main,
      padding: 16,
      gap: 8,
    },
    updateTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text.primary,
    },
    updateText: {
      fontSize: 13,
      color: c.text.secondary,
      marginBottom: 4,
    },
    noteCard: {
      backgroundColor: c.background.paper,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border.light,
      padding: 16,
    },
    noteCardHighlight: {
      borderColor: c.primary.main,
      borderWidth: 2,
    },
    noteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    noteTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text.primary,
      flexShrink: 1,
    },
    versionChip: {
      fontSize: 12,
      fontWeight: '600',
      color: c.text.secondary,
      backgroundColor: c.action.selected,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    noteDate: {
      fontSize: 12,
      color: c.text.tertiary,
      marginTop: 4,
    },
    noteDescription: {
      fontSize: 14,
      marginTop: 8,
      lineHeight: 20,
    },
  });
