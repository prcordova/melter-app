import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import {
  getNotificationSoundPrefs,
  setNotificationSoundPrefs,
  subscribeNotificationSoundPrefs,
  previewNotificationSoundCategory,
  type NotificationSoundCategory,
  type NotificationSoundPrefs,
} from '../../lib/notification-sounds';
import { ensurePushPreviewHiddenLoaded, setPushPreviewHidden } from '../../hooks/usePushNotifications';
import { showToast } from '../CustomToast';

const CATEGORIES: Array<{
  key: NotificationSoundCategory;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
}> = [
  {
    key: 'message',
    icon: 'chatbubble-outline',
    title: 'Mensagens',
    description: 'Novas mensagens de amigos',
  },
  {
    key: 'social',
    icon: 'people-outline',
    title: 'Social',
    description: 'Seguidores, pedidos e aceites de amizade',
  },
  {
    key: 'engagement',
    icon: 'heart-outline',
    title: 'Engajamento',
    description: 'Reações, comentários, menções e compartilhamentos',
  },
  {
    key: 'commerce',
    icon: 'storefront-outline',
    title: 'Comércio',
    description: 'Vendas, compras, doações e carteira',
  },
  {
    key: 'system',
    icon: 'settings-outline',
    title: 'Sistema',
    description: 'Avisos gerais da plataforma',
  },
];

export function NotificationSoundsPreferencesSection() {
  const styles = useThemedStyles(createStyles);
  const { colors } = useAppTheme();
  const [prefs, setPrefs] = useState<NotificationSoundPrefs>(() => getNotificationSoundPrefs());
  const [showPushPreview, setShowPushPreview] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void ensurePushPreviewHiddenLoaded().then((hidden) => {
      if (!cancelled) setShowPushPreview(!hidden);
    });
    const unsubscribe = subscribeNotificationSoundPrefs(() => {
      setPrefs(getNotificationSoundPrefs());
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const handleTogglePushPreview = async (show: boolean) => {
    setShowPushPreview(show);
    try {
      await setPushPreviewHidden(!show);
    } catch {
      setShowPushPreview(!show);
      showToast.error('Erro', 'Não foi possível salvar a preferência.');
    }
  };

  const persist = async (next: NotificationSoundPrefs) => {
    setPrefs(next);
    await setNotificationSoundPrefs(next);
  };

  const setMaster = async (enabled: boolean) => {
    await persist({ ...prefs, enabled });
    if (enabled) {
      void previewNotificationSoundCategory('system');
    }
  };

  const setCategory = async (category: NotificationSoundCategory, enabled: boolean) => {
    const next = {
      ...prefs,
      categories: { ...prefs.categories, [category]: enabled },
    };
    await persist(next);
    if (enabled && prefs.enabled) {
      void previewNotificationSoundCategory(category);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🔔 Notificações</Text>
      <Text style={styles.sectionDescription}>
        Os sons valem quando o app está aberto. Notificações push no sistema seguem as permissões do
        dispositivo.
      </Text>

      <View style={styles.item}>
        <Ionicons name="eye-outline" size={22} color={colors.primary.main} style={styles.itemIcon} />
        <View style={styles.itemText}>
          <Text style={styles.itemTitle}>Mostrar conteúdo nas notificações</Text>
          <Text style={styles.itemDesc}>
            Exibe quem enviou e o texto na notificação. Desligado, você continua sendo avisado, mas a notificação
            mostra só “Você tem uma nova mensagem/notificação”.
          </Text>
        </View>
        <Switch
          value={showPushPreview}
          onValueChange={(v) => void handleTogglePushPreview(v)}
          trackColor={{ false: colors.border.medium, true: colors.secondary.main }}
          thumbColor="#ffffff"
        />
      </View>

      <View style={styles.item}>
        <View style={styles.itemText}>
          <Text style={styles.itemTitle}>Sons ativados</Text>
          <Text style={styles.itemDesc}>Desliga todos os sons de notificação no app</Text>
        </View>
        <Switch
          value={prefs.enabled}
          onValueChange={(v) => void setMaster(v)}
          trackColor={{ false: colors.border.medium, true: colors.secondary.main }}
          thumbColor="#ffffff"
        />
      </View>

      {CATEGORIES.map(({ key, icon, title, description }) => (
        <View key={key} style={styles.item}>
          <Ionicons name={icon} size={22} color={colors.primary.main} style={styles.itemIcon} />
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>{title}</Text>
            <Text style={styles.itemDesc}>{description}</Text>
          </View>
          <Switch
            value={prefs.enabled && prefs.categories[key] !== false}
            onValueChange={(v) => void setCategory(key, v)}
            disabled={!prefs.enabled}
            trackColor={{ false: colors.border.medium, true: colors.secondary.main }}
            thumbColor="#ffffff"
          />
        </View>
      ))}
    </View>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: c.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border.light,
    marginBottom: 12,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemText: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    color: c.text.secondary,
    lineHeight: 18,
  },
});
