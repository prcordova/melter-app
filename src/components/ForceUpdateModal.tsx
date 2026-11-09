import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from './Button';
import { useAppUpdate } from '../contexts/AppUpdateContext';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import { SURFACE_RADIUS, type AppPalette } from '../theme/palettes';

/** Bloqueia o uso do app quando o build instalado está abaixo do versionCode mínimo definido no admin. */
export function ForceUpdateModal() {
  const { status, latestVersion, installedVersion, openUpdate } = useAppUpdate();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal visible={status === 'required'} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-download-outline" size={34} color={colors.states.error} />
          </View>
          <Text style={styles.title}>Atualização obrigatória</Text>
          <Text style={styles.description}>
            Sua versão do Melter ({installedVersion}) não é mais suportada. Baixe a versão
            {latestVersion ? ` ${latestVersion}` : ' mais recente'} e instale por cima — sua conta e seus dados
            continuam.
          </Text>
          <Button
            variant="primary"
            responsive={false}
            onPress={() => void openUpdate()}
            icon={<Ionicons name="download-outline" size={18} color="#ffffff" />}
            style={styles.button}
          >
            Atualizar agora
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: c.background.paper,
      borderRadius: SURFACE_RADIUS,
      borderWidth: 1,
      borderColor: c.divider,
      padding: 24,
      alignItems: 'center',
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.action.hover,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: c.text.primary,
      marginBottom: 8,
      textAlign: 'center',
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
      color: c.text.secondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    button: {
      width: '100%',
    },
  });
