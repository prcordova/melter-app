import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemedStyles } from '../../contexts/ThemeContext';
import { SURFACE_RADIUS, type AppPalette } from '../../theme/palettes';
import { Avatar } from '../Avatar';
import { Button } from '../Button';
import { PlanLocker } from '../PlanLocker';

type PlanType = 'FREE' | 'LITE' | 'STARTER' | 'PRO' | 'PRO_PLUS';

type FeedComposerCardProps = {
  username: string;
  avatar?: string | null;
  currentPlan: PlanType;
  requiredPlan: PlanType;
  onOpen: () => void;
};

const SHOW_BUTTON_MIN_WIDTH = 600;

/** Entrada de "criar post" no topo do feed — espelha o web `FeedComposerCard`. */
export function FeedComposerCard({ username, avatar, currentPlan, requiredPlan, onOpen }: FeedComposerCardProps) {
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();

  return (
    <PlanLocker requiredPlan={requiredPlan} currentPlan={currentPlan}>
      <View style={styles.card}>
        <Avatar user={{ username, avatar }} size={40} disableNavigation />
        <TouchableOpacity
          style={styles.input}
          onPress={onOpen}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Criar post"
        >
          <Text style={styles.placeholder} numberOfLines={1}>
            No que você está pensando, {username}?
          </Text>
        </TouchableOpacity>
        {width >= SHOW_BUTTON_MIN_WIDTH ? (
          <Button
            size="sm"
            responsive={false}
            onPress={onOpen}
            icon={<Ionicons name="create-outline" size={18} color="#ffffff" />}
          >
            Criar post
          </Button>
        ) : null}
      </View>
    </PlanLocker>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: SURFACE_RADIUS,
    borderWidth: 1,
    borderColor: c.divider,
    backgroundColor: c.background.paper,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border.light,
    backgroundColor: c.background.tertiary,
  },
  placeholder: {
    fontSize: 15,
    color: c.text.secondary,
  },
});
