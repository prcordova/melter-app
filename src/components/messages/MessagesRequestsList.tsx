import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { InboxRequestItem } from '../../types/messages-inbox';
import { getAvatarUrl, getUserInitials } from '../../utils/image';
import { COLORS } from '../../theme/colors';

type Props = {
  items: InboxRequestItem[];
  loading?: boolean;
  actionLoadingId?: string | null;
  onAccept: (item: InboxRequestItem) => void;
  onReject: (item: InboxRequestItem) => void;
};

export function MessagesRequestsList({
  items,
  loading = false,
  actionLoadingId = null,
  onAccept,
  onReject,
}: Props) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.secondary.main} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Nenhuma solicitação pendente.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.friendshipId}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const busy = actionLoadingId === item.friendshipId;
        const avatarUri = getAvatarUrl(item.requesterAvatar);

        return (
          <View style={styles.row}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarLetter}>
                  {getUserInitials(item.requesterUsername)}
                </Text>
              </View>
            )}
            <View style={styles.body}>
              <Text style={styles.username}>@{item.requesterUsername}</Text>
              {item.hasMessageRequest && item.messagePreview ? (
                <Text style={styles.preview} numberOfLines={3}>
                  “{item.messagePreview}”
                </Text>
              ) : (
                <Text style={styles.previewMuted}>Pedido de amizade</Text>
              )}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnAccept]}
                disabled={busy}
                onPress={() => onAccept(item)}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark" size={22} color="#fff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnReject]}
                disabled={busy}
                onPress={() => onReject(item)}
              >
                <Ionicons name="close" size={22} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 24 },
  center: { padding: 32, alignItems: 'center' },
  emptyText: { color: COLORS.text.secondary, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontWeight: '700', fontSize: 16 },
  body: { flex: 1, minWidth: 0 },
  username: { fontWeight: '700', fontSize: 15, color: COLORS.text.primary },
  preview: { marginTop: 4, fontSize: 13, color: COLORS.text.secondary, lineHeight: 18 },
  previewMuted: { marginTop: 4, fontSize: 13, color: COLORS.text.tertiary },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAccept: { backgroundColor: COLORS.secondary.main },
  btnReject: {
    backgroundColor: COLORS.background.paper,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
});
