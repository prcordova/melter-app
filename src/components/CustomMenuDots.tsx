import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';

export type CustomMenuDotsItem = {
  key: string;
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  danger?: boolean;
  onPress: () => void;
};

type Props = {
  items: CustomMenuDotsItem[];
  /** Ícone do gatilho (padrão: ellipsis vertical, igual MoreVert do web). */
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel?: string;
  /** Estilo do botão gatilho (ex.: posição absoluta no card). */
  triggerStyle?: StyleProp<ViewStyle>;
  /** Fundo branco no gatilho (overlay sobre capa). */
  elevated?: boolean;
};

/**
 * Menu ⋮ — espelha o MoreVert + Menu do web (shop product cards, etc.).
 */
export function CustomMenuDots({
  items,
  iconName = 'ellipsis-vertical',
  accessibilityLabel = 'Mais opções',
  triggerStyle,
  elevated = true,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);

  if (!items.length) return null;

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, elevated && styles.triggerElevated, triggerStyle]}
        onPress={() => setOpen(true)}
        hitSlop={10}
        accessibilityLabel={accessibilityLabel}
        activeOpacity={0.85}
      >
        <Ionicons name={iconName} size={18} color={colors.text.primary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            {items.map((item, index) => (
              <React.Fragment key={item.key}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    setOpen(false);
                    item.onPress();
                  }}
                  activeOpacity={0.75}
                >
                  {item.icon ? (
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={item.danger ? colors.states.error : colors.text.primary}
                    />
                  ) : null}
                  <Text
                    style={[styles.itemLabel, item.danger && { color: colors.states.error }]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    trigger: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    triggerElevated: {
      backgroundColor: c.background.paper,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    sheet: {
      width: '100%',
      maxWidth: 320,
      backgroundColor: c.background.paper,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border.light,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    itemLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: c.text.primary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border.light,
    },
  });
