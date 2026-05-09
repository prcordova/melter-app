import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { COLORS } from '../../theme/colors';
import { userApi } from '../../services/api';
import { showToast } from '../../components/CustomToast';
import { FIXED_CATEGORIES } from '../../constants/categories';
import { Button } from '../../components/Button';
import { useCustomModal } from '../../components/CustomModal';
import Ionicons from '@expo/vector-icons/Ionicons';

interface CategoryPreferences {
  categoryInteractions: { [key: string]: number };
  blockedCategories: string[];
  categoryRanking: Array<{ category: string; count: number }>;
}

export function PreferencesScreen() {
  const renderPreferencesSkeleton = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.prefSkeletonDescription} />
      <View style={styles.prefSkeletonSection}>
        <View style={styles.prefSkeletonTitle} />
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={`pref-skeleton-${index}`} style={styles.prefSkeletonItem} />
        ))}
      </View>
    </ScrollView>
  );

  const insets = useSafeAreaInsets();
  const { showConfirm } = useCustomModal();

  const [preferences, setPreferences] = useState<CategoryPreferences | null>(null);
  const [localBlockedCategories, setLocalBlockedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailMarketingEnabled, setEmailMarketingEnabled] = useState<boolean | null>(null);
  const [savingEmailPref, setSavingEmailPref] = useState(false);
  const [emailNotifyFollowers, setEmailNotifyFollowers] = useState(true);
  const [emailNotifyFriendRequests, setEmailNotifyFriendRequests] = useState(true);
  const [emailNotifyOfflineMessages, setEmailNotifyOfflineMessages] = useState(true);
  const [savingTransactional, setSavingTransactional] = useState(false);
  const hasUnsavedChanges = useRef(false);

  useEffect(() => {
    fetchPreferences();
    fetchFullProfileEmailPrefs();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await userApi.getCategoryPreferences();

      if (response.success && response.data) {
        setPreferences(response.data);
        setLocalBlockedCategories(response.data.blockedCategories || []);
        hasUnsavedChanges.current = false;
      }
    } catch (error: any) {
      console.error('Erro ao buscar preferências:', error);
      showToast.error('Erro', 'Erro ao carregar preferências');
    } finally {
      setLoading(false);
    }
  };

  const fetchFullProfileEmailPrefs = async () => {
    try {
      const res = await userApi.getMyProfile({ scope: 'full' });
      if (res.success && res.data) {
        const d = res.data as {
          preferences?: {
            emailNotifyNewFollowers?: boolean;
            emailNotifyFriendRequests?: boolean;
            emailNotifyMessagesWhenOffline?: boolean;
          };
          termsAndPrivacy?: { emailMarketingConsent?: boolean };
        };
        if (d.preferences) {
          setEmailNotifyFollowers(d.preferences.emailNotifyNewFollowers !== false);
          setEmailNotifyFriendRequests(d.preferences.emailNotifyFriendRequests !== false);
          setEmailNotifyOfflineMessages(d.preferences.emailNotifyMessagesWhenOffline !== false);
        }
        setEmailMarketingEnabled(d.termsAndPrivacy?.emailMarketingConsent !== false);
      }
    } catch (error) {
      console.error('Erro ao buscar preferências de e-mail do perfil:', error);
    }
  };

  const patchTransactionalEmails = async (partial: {
    emailNotifyNewFollowers?: boolean;
    emailNotifyFriendRequests?: boolean;
    emailNotifyMessagesWhenOffline?: boolean;
  }): Promise<boolean> => {
    try {
      setSavingTransactional(true);
      const res = await userApi.updateTransactionalEmailPreferences(partial);
      if (res.success && res.data) {
        setEmailNotifyFollowers(res.data.emailNotifyNewFollowers !== false);
        setEmailNotifyFriendRequests(res.data.emailNotifyFriendRequests !== false);
        setEmailNotifyOfflineMessages(res.data.emailNotifyMessagesWhenOffline !== false);
        showToast.success('Sucesso', 'Preferências de e-mail atualizadas.');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Erro ao salvar e-mails transacionais:', e);
      showToast.error('Erro', 'Não foi possível salvar as preferências de e-mail.');
      return false;
    } finally {
      setSavingTransactional(false);
    }
  };

  const handleToggleCategory = (categoryId: string, enabled: boolean) => {
    const newBlockedCategories = enabled
      ? localBlockedCategories.filter(id => id !== categoryId)
      : [...localBlockedCategories, categoryId];
    
    setLocalBlockedCategories(newBlockedCategories);
    hasUnsavedChanges.current = true;
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      const response = await userApi.updateCategoryPreferences(localBlockedCategories);

      if (response.success) {
        await fetchPreferences();
        showToast.success('Sucesso', 'Preferências salvas com sucesso');
        hasUnsavedChanges.current = false;
      } else {
        showToast.error('Erro', response.message || 'Erro ao salvar preferências');
      }
    } catch (error: any) {
      console.error('Erro ao salvar preferências:', error);
      showToast.error('Erro', 'Erro ao salvar preferências');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      const response = await userApi.resetCategoryPreferences();

      if (response.success) {
        await fetchPreferences();
        showToast.success('Sucesso', 'Preferências resetadas com sucesso');
      } else {
        showToast.error('Erro', response.message || 'Erro ao resetar preferências');
      }
    } catch (error: any) {
      console.error('Erro ao resetar preferências:', error);
      showToast.error('Erro', 'Erro ao resetar preferências');
    } finally {
      setSaving(false);
    }
  };

  const openResetDialog = () => {
    showConfirm(
      'Resetar Preferências',
      'Tem certeza que deseja resetar todas as suas preferências de categorias? Isso irá desbloquear todas as categorias e limpar seu histórico de interações.',
      handleReset,
      {
        confirmText: 'Resetar',
        cancelText: 'Cancelar',
      }
    );
  };

  const handleToggleEmailMarketing = async (enabled: boolean) => {
    try {
      setSavingEmailPref(true);
      setEmailMarketingEnabled(enabled);

      const response = await userApi.updateEmailMarketing(enabled);

      if (response.success) {
        showToast.success('Sucesso', response.message || (enabled ? 'Você voltará a receber emails de marketing.' : 'Você não receberá mais emails de marketing.'));
      } else {
        setEmailMarketingEnabled(!enabled);
        showToast.error('Erro', response.message || 'Erro ao atualizar preferência');
      }
    } catch (error: any) {
      console.error('Erro ao atualizar preferência de email marketing:', error);
      setEmailMarketingEnabled(!enabled);
      showToast.error('Erro', 'Erro ao atualizar preferência de email');
    } finally {
      setSavingEmailPref(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return FIXED_CATEGORIES.find(c => c._id === categoryId)?.name || categoryId;
  };

  const hasChanges = JSON.stringify(localBlockedCategories.sort()) !== JSON.stringify((preferences?.blockedCategories || []).sort());

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <BackButton title="Configurações" />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>⚙️ Preferências</Text>
          </View>
        </View>
        {renderPreferencesSkeleton()}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton title="Configurações" />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>⚙️ Preferências</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Personalize suas preferências de conteúdo e notificações.
        </Text>

        {/* Ranking de Categorias */}
        {preferences && preferences.categoryRanking.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Categorias Favoritas</Text>
            <Text style={styles.sectionDescription}>
              Categorias com mais interações baseadas no seu histórico
            </Text>
            <View style={styles.chipsContainer}>
              {preferences.categoryRanking.map((item) => (
                <View key={item.category} style={styles.chip}>
                  <Text style={styles.chipText}>
                    {getCategoryName(item.category)} ({item.count})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bloquear / Permitir Categorias */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Categorias para Ver</Text>
          <Text style={styles.sectionDescription}>
            Desative categorias que você não deseja ver no feed. Categorias desativadas não aparecerão mais no seu feed.
          </Text>

          <View style={styles.categoriesList}>
            {FIXED_CATEGORIES.map((category) => {
              const isBlocked = localBlockedCategories.includes(category._id);
              const isEnabled = !isBlocked;
              return (
                <View key={category._id} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </View>
                  <Switch
                    value={isEnabled}
                    onValueChange={(checked) => handleToggleCategory(category._id, checked)}
                    disabled={saving}
                    trackColor={{ false: COLORS.border.medium, true: COLORS.secondary.main }}
                    thumbColor="#ffffff"
                  />
                </View>
              );
            })}
          </View>

          {hasChanges && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={20} color={COLORS.states.warning} />
              <Text style={styles.warningText}>
                Você tem alterações não salvas
              </Text>
            </View>
          )}

          <Button
            onPress={handleSavePreferences}
            disabled={saving || !hasChanges}
            loading={saving}
            style={styles.saveButton}
          >
            Salvar Preferências
          </Button>

          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary.main} />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Como funciona:</Text> Categorias desativadas não aparecerão no seu feed. Você pode reativá-las a qualquer momento.
            </Text>
          </View>

          <Button
            variant="outline"
            onPress={openResetDialog}
            disabled={saving}
            style={styles.resetButton}
          >
            Resetar Preferências
          </Button>
        </View>

        {/* E-mails de atividade (API Melter) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📧 Avisos por e-mail</Text>
          <Text style={styles.sectionDescription}>
            Novos seguidores: e-mail mesmo com o app aberto. Mensagens: só quando você não estiver com o chat ativo no Melter.
          </Text>

          <View style={styles.emailItem}>
            <View style={styles.emailInfo}>
              <Text style={styles.emailTitle}>Novos seguidores</Text>
              <Text style={styles.emailDescription}>
                Aviso quando alguém começar a te seguir.
              </Text>
            </View>
            <Switch
              value={emailNotifyFollowers}
              onValueChange={async (checked) => {
                const prev = emailNotifyFollowers;
                setEmailNotifyFollowers(checked);
                const ok = await patchTransactionalEmails({ emailNotifyNewFollowers: checked });
                if (!ok) setEmailNotifyFollowers(prev);
              }}
              disabled={savingTransactional}
              trackColor={{ false: COLORS.border.medium, true: COLORS.secondary.main }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.emailItem}>
            <View style={styles.emailInfo}>
              <Text style={styles.emailTitle}>Pedidos de amizade</Text>
              <Text style={styles.emailDescription}>
                Aviso quando alguém enviar um pedido de amizade.
              </Text>
            </View>
            <Switch
              value={emailNotifyFriendRequests}
              onValueChange={async (checked) => {
                const prev = emailNotifyFriendRequests;
                setEmailNotifyFriendRequests(checked);
                const ok = await patchTransactionalEmails({ emailNotifyFriendRequests: checked });
                if (!ok) setEmailNotifyFriendRequests(prev);
              }}
              disabled={savingTransactional}
              trackColor={{ false: COLORS.border.medium, true: COLORS.secondary.main }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.emailItem}>
            <View style={styles.emailInfo}>
              <Text style={styles.emailTitle}>Mensagens quando ausente</Text>
              <Text style={styles.emailDescription}>
                E-mail se um amigo enviar mensagem e você não estiver com o chat ativo.
              </Text>
            </View>
            <Switch
              value={emailNotifyOfflineMessages}
              onValueChange={async (checked) => {
                const prev = emailNotifyOfflineMessages;
                setEmailNotifyOfflineMessages(checked);
                const ok = await patchTransactionalEmails({ emailNotifyMessagesWhenOffline: checked });
                if (!ok) setEmailNotifyOfflineMessages(prev);
              }}
              disabled={savingTransactional}
              trackColor={{ false: COLORS.border.medium, true: COLORS.secondary.main }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Preferências de Email Marketing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📣 Email marketing</Text>
          
          <View style={styles.emailItem}>
            <View style={styles.emailInfo}>
              <Text style={styles.emailTitle}>Email Marketing</Text>
              <Text style={styles.emailDescription}>
                Receber emails promocionais e novidades sobre o Melter
              </Text>
            </View>
            <Switch
              value={emailMarketingEnabled ?? true}
              onValueChange={handleToggleEmailMarketing}
              disabled={savingEmailPref}
              trackColor={{ false: COLORS.border.medium, true: COLORS.secondary.main }}
              thumbColor="#ffffff"
            />
          </View>

          <View style={styles.emailNote}>
            <Ionicons name="mail-outline" size={16} color={COLORS.text.secondary} />
            <Text style={styles.emailNoteText}>
              Você continuará recebendo emails essenciais mesmo com esta opção desativada.
            </Text>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: 12,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  prefSkeletonDescription: {
    width: '100%',
    height: 42,
    borderRadius: 8,
    backgroundColor: COLORS.background.tertiary,
    marginBottom: 20,
  },
  prefSkeletonSection: {
    gap: 10,
  },
  prefSkeletonTitle: {
    width: '50%',
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.background.tertiary,
    marginBottom: 4,
  },
  prefSkeletonItem: {
    width: '100%',
    height: 52,
    borderRadius: 10,
    backgroundColor: COLORS.background.tertiary,
  },
  scrollContent: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primary.light,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  categoriesList: {
    gap: 12,
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.states.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: COLORS.states.warning,
    flex: 1,
  },
  saveButton: {
    marginBottom: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.primary.light + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  resetButton: {
    marginBottom: 0,
  },
  emailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    marginBottom: 12,
  },
  emailInfo: {
    flex: 1,
    marginRight: 16,
  },
  emailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  emailDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  emailNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  emailNoteText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
});

