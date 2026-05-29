import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import { PROFILE_CONTENT_SAFETY_STRINGS } from '../../config/profile-content-safety-strings';

type Props = {
  visible: boolean;
  title?: string;
  body?: string;
};

export function ProfileAiModerationModal({
  visible,
  title = PROFILE_CONTENT_SAFETY_STRINGS.ai.modalTitle,
  body = PROFILE_CONTENT_SAFETY_STRINGS.ai.modalBody,
}: Props) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => {
      animation.stop();
      spin.setValue(0);
    };
  }, [visible, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Animated.View style={[styles.iconWrap, { transform: [{ rotate }] }]}>
            <Ionicons name="sparkles" size={28} color={COLORS.primary.main} />
          </Animated.View>
          <View style={styles.textCol}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.background.paper,
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(129, 140, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
});
