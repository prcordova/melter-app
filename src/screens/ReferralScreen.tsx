import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BackButton } from '../components/BackButton';
import { referralsApi } from '../services/api';
import { showToast } from '../components/CustomToast';
import { COLORS } from '../theme/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../contexts/AuthContext';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalPoints: number;
  totalSpent: number;
  currentLevel: string;
  nextLevel?: {
    name: string;
    referralsNeeded: number;
    spentNeeded: number;
    pointsNeeded: number;
  };
  topSpenders: Array<{
    username: string;
    avatar?: string;
    totalSpent: number;
    points: number;
  }>;
  recentActivity: Array<{
    username: string;
    action: string;
    amount?: number;
    points?: number;
    date: string;
  }>;
  referralLink: string;
  availableReward?: {
    level: string;
    rewards: string[];
    canClaim: boolean;
  } | null;
}

export function ReferralScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);
  const [systemActive, setSystemActive] = useState(true);

  // Gerar link de referência usando o username do usuário logado
  const referralLink = user?.username 
    ? `https://melter.com.br/register?ref=${user.username}`
    : null;

  useEffect(() => {
    fetchStatus();
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStatus = async () => {
    try {
      const response = await referralsApi.getStatus();
      if (response.success && response.data) {
        setSystemActive(response.data.isActive);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await referralsApi.getMyStats();
      if (response.success && response.data) {
        setStats({
          ...response.data,
          referralLink: referralLink || response.data.referralLink,
        });
      } else {
        showToast.error('Erro', response.message || 'Erro ao carregar estatísticas');
      }
    } catch (error: any) {
      console.error('Erro ao carregar estatísticas:', error);
      showToast.error('Erro', 'Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const copyReferralLink = async () => {
    const linkToCopy = referralLink || stats?.referralLink;
    if (linkToCopy) {
      try {
        await Clipboard.setStringAsync(linkToCopy);
        showToast.success('Sucesso', 'Link copiado para a área de transferência!');
      } catch (error) {
        console.error('Erro ao copiar link:', error);
        showToast.error('Erro', 'Erro ao copiar link');
      }
    }
  };

  const handleClaimReward = async () => {
    try {
      setClaimingReward(true);
      const response = await referralsApi.claimReward();
      if (response.success) {
        showToast.success('Sucesso', response.message || 'Prêmio resgatado com sucesso!');
        await fetchStats();
      } else {
        showToast.error('Erro', response.message || 'Erro ao resgatar prêmio');
      }
    } catch (error: any) {
      console.error('Erro ao resgatar prêmio:', error);
      showToast.error('Erro', 'Erro ao resgatar prêmio');
    } finally {
      setClaimingReward(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Bronze': return '#cd7f32';
      case 'Prata': return '#c0c0c0';
      case 'Ouro': return '#ffd700';
      case 'Diamante': return '#b9f2ff';
      default: return COLORS.secondary.main;
    }
  };

  if (!systemActive) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <BackButton title="Perfil" />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.emptyContainer}>
            <Ionicons name="information-circle-outline" size={64} color={COLORS.text.secondary} />
            <Text style={styles.emptyTitle}>Sistema Indisponível</Text>
            <Text style={styles.emptyText}>
              O sistema de indicações está temporariamente desativado.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <BackButton title="Perfil" />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.secondary.main} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton title="Perfil" />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Indique e Ganhe</Text>
          <Text style={styles.subtitle}>
            Compartilhe seu link e ganhe recompensas
          </Text>
        </View>

        {/* Seu Link de Indicação */}
        {stats && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="link" size={24} color={COLORS.secondary.main} />
              <Text style={styles.cardTitle}>Seu Link de Indicação</Text>
            </View>
            
            <View style={styles.linkContainer}>
              <Text style={styles.linkText} numberOfLines={1}>
                {referralLink || stats.referralLink}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.copyButton}
              onPress={copyReferralLink}
            >
              <Ionicons name="copy-outline" size={20} color="#ffffff" />
              <Text style={styles.copyButtonText}>Copiar Link</Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={COLORS.secondary.main} />
              <Text style={styles.infoText}>
                Compartilhe este link com seus amigos. Quando eles se cadastrarem e fizerem compras, você ganha pontos e recompensas!
              </Text>
            </View>
          </View>
        )}

        {/* Estado vazio */}
        {stats && stats.totalReferrals === 0 && (
          <View style={styles.card}>
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={48} color={COLORS.text.secondary} />
              <Text style={styles.emptyCardTitle}>Nenhuma indicação ainda</Text>
              <Text style={styles.emptyCardText}>
                Compartilhe seu link para começar a ganhar recompensas!
              </Text>
            </View>
          </View>
        )}

        {/* Estatísticas */}
        {stats && stats.totalReferrals > 0 && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="people" size={32} color={COLORS.secondary.main} />
                <Text style={styles.statValue}>{stats.totalReferrals}</Text>
                <Text style={styles.statLabel}>Total de Indicações</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="trending-up" size={32} color={COLORS.secondary.main} />
                <Text style={styles.statValue}>{stats.activeReferrals}</Text>
                <Text style={styles.statLabel}>Indicações Ativas</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="trophy" size={32} color={COLORS.secondary.main} />
                <Text style={styles.statValue}>{stats.totalPoints}</Text>
                <Text style={styles.statLabel}>Pontos Totais</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="cash" size={32} color={COLORS.secondary.main} />
                <Text style={styles.statValue}>R$ {stats.totalSpent.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total Gasto</Text>
              </View>
            </View>

            {/* Nível Atual */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="medal" size={24} color={COLORS.secondary.main} />
                <Text style={styles.cardTitle}>Seu Nível Atual</Text>
              </View>
              
              <View style={styles.levelContainer}>
                <View
                  style={[
                    styles.levelBadge,
                    { backgroundColor: getLevelColor(stats.currentLevel) },
                  ]}
                >
                  <Text style={styles.levelText}>{stats.currentLevel}</Text>
                </View>
                <Text style={styles.levelInfo}>
                  {stats.activeReferrals} indicações ativas
                </Text>
              </View>

              {stats.nextLevel && (
                <View style={styles.nextLevelContainer}>
                  <Text style={styles.nextLevelLabel}>Próximo nível:</Text>
                  <Text style={styles.nextLevelText}>
                    {stats.nextLevel.name}: {stats.nextLevel.referralsNeeded} indicações, R$ {stats.nextLevel.spentNeeded.toFixed(2)}, {stats.nextLevel.pointsNeeded} pontos
                  </Text>
                </View>
              )}

              {/* Botão de Resgatar Prêmio */}
              {stats.availableReward && stats.availableReward.canClaim && (
                <TouchableOpacity
                  style={styles.claimButton}
                  onPress={handleClaimReward}
                  disabled={claimingReward}
                >
                  {claimingReward ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="gift" size={20} color="#ffffff" />
                      <Text style={styles.claimButtonText}>Resgatar Prêmio</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {stats.availableReward && !stats.availableReward.canClaim && (
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardInfoText}>
                    Prêmio do nível {stats.availableReward.level} já foi resgatado este mês.
                  </Text>
                </View>
              )}
            </View>

            {/* Progresso para o Próximo Nível */}
            {stats.nextLevel && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="flag" size={24} color={COLORS.secondary.main} />
                  <Text style={styles.cardTitle}>
                    Progresso para {stats.nextLevel.name}
                  </Text>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Indicações</Text>
                    <Text style={styles.progressValue}>
                      {stats.totalReferrals} / {stats.nextLevel.referralsNeeded}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, (stats.totalReferrals / stats.nextLevel.referralsNeeded) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Total Gasto</Text>
                    <Text style={styles.progressValue}>
                      R$ {stats.totalSpent.toFixed(2)} / R$ {stats.nextLevel.spentNeeded.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, (stats.totalSpent / stats.nextLevel.spentNeeded) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Pontos</Text>
                    <Text style={styles.progressValue}>
                      {stats.totalPoints} / {stats.nextLevel.pointsNeeded}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, (stats.totalPoints / stats.nextLevel.pointsNeeded) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Como Funciona */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={24} color={COLORS.secondary.main} />
            <Text style={styles.cardTitle}>Como Funciona</Text>
          </View>

          <View style={styles.howItWorksContainer}>
            <View style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Compartilhe</Text>
                <Text style={styles.stepDescription}>
                  Compartilhe seu link de indicação com seus amigos
                </Text>
              </View>
            </View>

            <View style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Eles se Cadastram</Text>
                <Text style={styles.stepDescription}>
                  Seus amigos se cadastram usando seu link
                </Text>
              </View>
            </View>

            <View style={styles.stepContainer}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Você Ganha</Text>
                <Text style={styles.stepDescription}>
                  Quando eles fazem compras, você ganha pontos e recompensas
                </Text>
              </View>
            </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  headerSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  linkContainer: {
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary.main,
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background.tertiary,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
  },
  emptyCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCardText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  levelContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  levelInfo: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  nextLevelContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.light,
  },
  nextLevelLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  nextLevelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  claimButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  rewardInfo: {
    backgroundColor: COLORS.background.tertiary,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  rewardInfoText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  progressValue: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary.main,
    borderRadius: 4,
  },
  howItWorksContainer: {
    gap: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary.main,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
});

