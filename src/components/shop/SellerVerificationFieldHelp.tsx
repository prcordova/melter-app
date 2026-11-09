import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';

type Props = {
  text: string;
};

export function SellerVerificationFieldHelp({ text }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Ver dicas para este envio"
        style={styles.btn}
      >
        <Ionicons name="help-circle-outline" size={16} color={colors.text.secondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Dicas</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
                <Ionicons name="close" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.body}>{text}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  btn: {
    padding: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: c.background.paper,
    borderRadius: 12,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text.primary,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: c.text.secondary,
  },
});
