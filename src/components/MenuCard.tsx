import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../contexts/ThemeContext';
import type { AppPalette } from '../theme/palettes';

interface MenuCardProps {
  title: string;
  icon: string;
  onPress: () => void;
  badgeCount?: number;
  variant?: 'default' | 'danger';
  fullWidth?: boolean;
}

export function MenuCard({ 
  title, 
  icon, 
  onPress, 
  badgeCount, 
  variant = 'default',
  fullWidth = false,
}: MenuCardProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        variant === 'danger' && styles.cardDanger,
        fullWidth && styles.cardFullWidth,
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={28} color={colors.secondary.main} />
        {badgeCount !== undefined && badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
        )}
      </View>
      <Text 
        style={[
          styles.title,
          variant === 'danger' && styles.titleDanger
        ]} 
        numberOfLines={2}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (c: AppPalette) =>
  StyleSheet.create({
    card: {
      width: '100%',
      minHeight: 96,
      backgroundColor: c.background.paper,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 16,
      alignItems: 'flex-start',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: c.isDark ? 0 : 0.1,
      shadowRadius: 8,
      elevation: c.isDark ? 0 : 3,
      borderWidth: 1,
      borderColor: c.isDark ? c.divider : c.border.light,
    },
    cardFullWidth: {
      width: '100%',
    },
    cardDanger: {
      borderColor: c.states.error,
      borderWidth: 1.5,
    },
    iconContainer: {
      position: 'relative',
      marginBottom: 10,
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -8,
      backgroundColor: c.states.error,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    badgeText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: 'bold',
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: c.text.primary,
      textAlign: 'left',
    },
    titleDanger: {
      color: c.states.error,
    },
  });
