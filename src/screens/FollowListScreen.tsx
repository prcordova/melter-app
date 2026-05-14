import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import axios from 'axios';
import { BackButton } from '../components/BackButton';
import { COLORS } from '../theme/colors';
import { userApi } from '../services/api';
import { getAvatarUrl, getUserInitials } from '../utils/image';

export type FollowListRouteParams = {
  username: string;
  list: 'followers' | 'following';
};

export function FollowListScreen() {
  const route = useRoute<RouteProp<{ FollowList: FollowListRouteParams }, 'FollowList'>>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { username, list } = route.params;

  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(
    async (pageNum: number, append: boolean) => {
      const fn = list === 'followers' ? userApi.getFollowers : userApi.getFollowing;
      const res = await fn(username, { page: pageNum, limit: 30 });
      if (res?.success && res.data) {
        const chunk = res.data.items || [];
        setItems((prev) => (append ? [...prev, ...chunk] : chunk));
        setHasMore(Boolean(res.data.hasMore));
        return;
      }
      if (!append) {
        setItems([]);
        setHasMore(false);
      }
    },
    [username, list]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setForbidden(false);
      setPage(1);
      try {
        await load(1, false);
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 403) {
          setForbidden(true);
          setItems([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || forbidden || loading) return;
    setLoadingMore(true);
    const next = page + 1;
    try {
      await load(next, true);
      setPage(next);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  const openProfile = (uname: string) => {
    if (!uname) return;
    if (typeof navigation.push === 'function') {
      navigation.push('UserProfile', { username: uname });
      return;
    }
    navigation.navigate({ name: 'UserProfile', params: { username: uname }, merge: false } as never);
  };

  const title =
    list === 'followers'
      ? `Seguidores (@${username})`
      : `Seguindo (@${username})`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton title="Voltar" />
        <Text style={styles.title}>{title}</Text>
      </View>

      {forbidden ? (
        <Text style={styles.muted}>
          Este utilizador não permite ver esta lista. Os números podem continuar visíveis no perfil.
        </Text>
      ) : loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={COLORS.secondary.main} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id || it._id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 32,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <Text style={styles.muted}>Nenhum resultado nesta página.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.75}
              onPress={() => openProfile(item.username)}
            >
              {item.avatar ? (
                <Image source={{ uri: getAvatarUrl(item.avatar) }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarLetter}>{getUserInitials(item.username)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.username}>@{item.username}</Text>
                {item.bio ? (
                  <Text style={styles.bio} numberOfLines={2}>
                    {item.bio}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            hasMore && items.length > 0 ? (
              <TouchableOpacity
                style={styles.loadMore}
                onPress={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator color={COLORS.secondary.main} />
                ) : (
                  <Text style={styles.loadMoreText}>Carregar mais</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  muted: {
    marginTop: 24,
    paddingHorizontal: 20,
    color: COLORS.text.secondary,
    fontSize: 15,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  username: {
    fontWeight: '600',
    fontSize: 16,
    color: COLORS.text.primary,
  },
  bio: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  loadMore: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadMoreText: {
    color: COLORS.secondary.main,
    fontWeight: '600',
  },
});
