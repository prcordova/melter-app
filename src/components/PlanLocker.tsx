import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { showToast } from './CustomToast';

interface PlanLockerProps {
  children: React.ReactNode;
  requiredPlan: 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS';
  currentPlan?: 'FREE' | 'STARTER' | 'PRO' | 'PRO_PLUS';
}

const planValues = {
  FREE: 0,
  STARTER: 1,
  PRO: 2,
  PRO_PLUS: 3,
};

export function PlanLocker({ children, requiredPlan, currentPlan = 'FREE' }: PlanLockerProps) {
  const navigation = useNavigation();
  
  const hasAccess = planValues[currentPlan] >= planValues[requiredPlan];

  const handleUpgradePress = () => {
    (navigation as any).navigate('Plans');
    showToast.info('Upgrade necessário', `Este recurso está disponível no plano ${requiredPlan}`);
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
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={16} color="#ffffff" />
          <Text style={styles.lockText}>{requiredPlan}</Text>
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
  lockText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

