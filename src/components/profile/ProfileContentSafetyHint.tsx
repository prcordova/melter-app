import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../../theme/colors';
import { CustomModal } from '../CustomModal';
import {
  PROFILE_CONTENT_SAFETY_STRINGS,
  resolveProfileContentSafetyDetailKey,
} from '../../config/profile-content-safety-strings';
import type { ProfileContentSafetyReason } from '../../types/profile-content-safety';

type Props = {
  restrictedForGuests: boolean;
  reasons?: ProfileContentSafetyReason[];
  style?: { marginTop?: number };
};

export function ProfileContentSafetyHint({ restrictedForGuests, reasons, style }: Props) {
  const [infoVisible, setInfoVisible] = useState(false);

  if (!restrictedForGuests) return null;

  const detailKey = resolveProfileContentSafetyDetailKey(reasons);
  const detailText = PROFILE_CONTENT_SAFETY_STRINGS.hint[detailKey];

  return (
    <>
      <View style={[styles.row, style?.marginTop != null ? { marginTop: style.marginTop } : null]}>
        <Text style={styles.summary}>{PROFILE_CONTENT_SAFETY_STRINGS.hint.summary}</Text>
        <TouchableOpacity
          accessibilityLabel={PROFILE_CONTENT_SAFETY_STRINGS.hint.infoAria}
          onPress={() => setInfoVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.infoButton}
        >
          <Ionicons name="information-circle-outline" size={18} color={COLORS.text.secondary} />
        </TouchableOpacity>
      </View>

      <CustomModal
        visible={infoVisible}
        title={PROFILE_CONTENT_SAFETY_STRINGS.hint.infoAria}
        message={detailText}
        onClose={() => setInfoVisible(false)}
        closeOnBackdropPress
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  summary: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  infoButton: {
    marginTop: -2,
  },
});
