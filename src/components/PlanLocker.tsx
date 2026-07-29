import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { showToast } from './CustomToast';

function formatPlanLabel(plan: string): string {
  return plan === 'PRO_PLUS' ? 'PRO+' : plan;
}

interface PlanLockerProps {
  children: React.ReactNode;
  requiredPlan: 'FREE' | 'LITE' | 'STARTER' | 'PRO' | 'PRO_PLUS';
  currentPlan?: 'FREE' | 'LITE' | 'STARTER' | 'PRO' | 'PRO_PLUS';
  isAdmin?: boolean;
  /** `compact` — badge menor para toolbars/botões de ação. */
  variant?: 'default' | 'compact';
}

const planValues = {
  FREE: 0,
  LITE: 1,
  STARTER: 2,
  PRO: 3,
  PRO_PLUS: 4,
};

export function PlanLocker({
  children,
  requiredPlan,
  currentPlan = 'FREE',
  isAdmin = false,
  variant = 'default',
}: PlanLockerProps) {
  const navigation = useNavigation();
  const isCompact = variant === 'compact';

  const hasAccess = isAdmin || planValues[currentPlan] >= planValues[requiredPlan];

  const handleUpgradePress = () => {
    (navigation as any).navigate('Plans');
    showToast.info('Upgrade necessário', `Este recurso está disponível no plano ${formatPlanLabel(requiredPlan)}`);
  };

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content} pointerEvents="none">
        {children}
      </View>
      <TouchableOpacity
        style={styles.overlay}
        onPress={handleUpgradePress}
        activeOpacity={0.8}
      >
        <View style={isCompact ? styles.lockBadgeCompact : styles.lockBadge}>
          <Ionicons name="lock-closed" size={isCompact ? 11 : 16} color="#ffffff" />
          <Text style={isCompact ? styles.lockTextCompact : styles.lockText}>
            {formatPlanLabel(requiredPlan)}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  content: {
    opacity: 0.5,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.secondary.main,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  lockBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.secondary.main,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    maxWidth: '100%',
  },
  lockText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  lockTextCompact: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});
