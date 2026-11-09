import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from './BackButton';
import { ThemedStatusBar } from './ThemedStatusBar';
import { useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';

interface SettingsScreenTemplateProps {
  title: string;
  emoji: string;
  children: ReactNode;
}

export function SettingsScreenTemplate({
  title,
  emoji,
  children,
}: SettingsScreenTemplateProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedStatusBar />
      <View style={styles.header}>
        <BackButton title="Configurações" />
        <Text style={styles.headerTitle}>{emoji} {title}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {children}
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
    content: {
      padding: 16,
    },
  });
