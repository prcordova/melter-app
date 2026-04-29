import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationModal } from './NotificationModal';
import { COLORS } from '../theme/colors';

interface NotificationButtonProps {
  onPress?: () => void;
}

export function NotificationButton({ onPress }: NotificationButtonProps) {
  const { unreadCount } = useNotifications();
  const [showModal, setShowModal] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    setShowModal(true);
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.container}
        activeOpacity={0.7}
      >
        <Ionicons
          name="notifications-outline"
          size={24}
          color={COLORS.secondary.main}
        />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <NotificationModal
        visible={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
    marginRight: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.states.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background.paper,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

