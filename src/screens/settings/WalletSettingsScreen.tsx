import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BackButton } from '../../components/BackButton';
import { Button } from '../../components/Button';
import { AddBalanceModal } from '../../components/wallet/AddBalanceModal';
import { WithdrawModal } from '../../components/wallet/WithdrawModal';
import { PaymentStatusModal } from '../../components/wallet/PaymentStatusModal';
import { WalletHistory } from '../../components/wallet/WalletHistory';
import { walletApi } from '../../services/api';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import { ThemedStatusBar } from '../../components/ThemedStatusBar';
import { showToast } from '../../components/CustomToast';
import {
  clearPendingMpDeposit,
  getPendingMpDepositIds,
} from '../../lib/wallet-pending-deposit';
import { useWalletDepositCompleted } from '../../hooks/useWalletDepositCompleted';

interface WalletData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  username: string;
}

export function WalletSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [addBalanceModalOpen, setAddBalanceModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'cancelled' | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRef = useRef(false);

  const fetchWalletData = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await walletApi.getBalance();
      if (response.success && response.data) {
        setWalletData(response.data);
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Erro ao buscar dados da carteira:', error);
      showToast.error('Erro ao carregar dados da carteira');
    } finally {
      setLoading(false);
    }
  }, []);

  const reconcilePendingDeposit = React.useCallback(async () => {
    const { paymentId, pendingDepositId } = await getPendingMpDepositIds();
    if (!paymentId && !pendingDepositId) return;

    try {
      if (paymentId) {
        const response = await walletApi.getPaymentStatus(paymentId, { confirm: true });
        if (response.success && response.data) {
          const outcome = response.data.confirmation?.outcome;
          if (outcome === 'credited' || outcome === 'already_processed') {
            await clearPendingMpDeposit();
            await fetchWalletData();
            showToast.success('Recarga aprovada com sucesso!');
            setPaymentStatus(null);
            setPendingPaymentId(null);
            return;
          }
        }
      }

      if (pendingDepositId) {
        const syncRes = await walletApi.syncPendingDeposit(pendingDepositId);
        if (syncRes.success) {
          const outcome = syncRes.data?.outcome;
          if (outcome === 'credited' || outcome === 'already_processed') {
            await clearPendingMpDeposit();
            await fetchWalletData();
            showToast.success('Recarga aprovada com sucesso!');
            setPaymentStatus(null);
            setPendingPaymentId(null);
          }
        }
      }
    } catch (error) {
      console.error('[WALLET] Erro ao reconciliar recarga pendente:', error);
    }
  }, [fetchWalletData]);

  useWalletDepositCompleted({
    showToastOnComplete: true,
    toastMessage: 'Recarga aprovada com sucesso!',
    onBalanceUpdated: () => {
      void clearPendingMpDeposit();
      void fetchWalletData();
      setPaymentStatus(null);
      setPendingPaymentId(null);
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      void fetchWalletData();
      void reconcilePendingDeposit();
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        pollingRef.current = false;
      };
    }, [fetchWalletData, reconcilePendingDeposit])
  );

  // Polling do status do pagamento quando está pendente
  useEffect(() => {
    if (paymentStatus === 'pending' && !pollingRef.current && walletData) {
      const initialBalance = walletData.balance;

      if (pendingPaymentId) {
        pollingRef.current = true;

        const checkPendingDeposit = async () => {
          try {
            const { paymentId } = await getPendingMpDepositIds();

            if (paymentId) {
              const response = await walletApi.getPaymentStatus(paymentId, { confirm: true });
              if (response.success && response.data) {
                const status = response.data.status;
                const outcome = response.data.confirmation?.outcome;
                const credited =
                  status === 'approved' ||
                  outcome === 'credited' ||
                  outcome === 'already_processed';

                if (credited) {
                  await clearPendingMpDeposit();
                  setPaymentStatus('success');
                  void fetchWalletData();
                  showToast.success('Pagamento aprovado com sucesso!');
                  if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                  }
                  pollingRef.current = false;
                  setTimeout(() => {
                    setPaymentStatus(null);
                    setPendingPaymentId(null);
                  }, 3000);
                  return;
                }
                if (status === 'rejected' || status === 'cancelled') {
                  await clearPendingMpDeposit();
                  setPaymentStatus('cancelled');
                  if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                  }
                  pollingRef.current = false;
                  setTimeout(() => {
                    setPaymentStatus(null);
                    setPendingPaymentId(null);
                  }, 3000);
                  return;
                }
              }
            }

            const syncRes = await walletApi.syncPendingDeposit(pendingPaymentId);
            if (syncRes.success) {
              const outcome = syncRes.data?.outcome;
              if (outcome === 'credited' || outcome === 'already_processed') {
                await clearPendingMpDeposit();
                setPaymentStatus('success');
                void fetchWalletData();
                showToast.success('Pagamento aprovado com sucesso!');
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                pollingRef.current = false;
                setTimeout(() => {
                  setPaymentStatus(null);
                  setPendingPaymentId(null);
                }, 3000);
              }
            }
          } catch (error) {
            console.error('[WALLET] Erro ao verificar recarga pendente:', error);
          }
        };

        void checkPendingDeposit();
        const interval = setInterval(() => void checkPendingDeposit(), 5000);
        pollingIntervalRef.current = interval;

        setTimeout(() => {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          pollingRef.current = false;
          if (paymentStatus === 'pending') {
            showToast.error('Tempo limite excedido. Verifique o status do pagamento manualmente.');
            setPaymentStatus(null);
            setPendingPaymentId(null);
          }
        }, 5 * 60 * 1000);
      } else {
        // Se não temos payment_id, fazer polling do saldo
        pollingRef.current = true;

        const checkBalance = async () => {
          try {
            const response = await walletApi.getBalance();
            if (response.success && response.data) {
              const newBalance = response.data.balance;
              if (newBalance > initialBalance) {
                setPaymentStatus('success');
                fetchWalletData();
                showToast.success('Pagamento aprovado com sucesso!');
                pollingRef.current = false;

                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }

                setTimeout(() => {
                  setPaymentStatus(null);
                }, 3000);
              }
            }
          } catch (error) {
            console.error('[WALLET] Erro ao verificar saldo:', error);
          }
        };

        checkBalance();
        const interval = setInterval(checkBalance, 5000);
        pollingIntervalRef.current = interval;

        setTimeout(() => {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          pollingRef.current = false;
          if (paymentStatus === 'pending') {
            showToast.error('Tempo limite excedido. Verifique o status do pagamento manualmente.');
            setPaymentStatus(null);
          }
        }, 5 * 60 * 1000);
      }

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        pollingRef.current = false;
      };
    }
  }, [paymentStatus, pendingPaymentId, walletData, fetchWalletData]);

  const handleAddBalanceSuccess = async (pendingDepositId?: string) => {
    setPaymentStatus('pending');
    if (pendingDepositId) {
      setPendingPaymentId(pendingDepositId);
    }
    await fetchWalletData();
    void reconcilePendingDeposit();
  };

  const handleWithdrawSuccess = () => {
    fetchWalletData();
  };

  if (loading && !walletData) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedStatusBar />
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <BackButton />
            <Text style={styles.headerTitle}>Carteira</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary.main} />
        </View>
      </View>
    );
  }

  if (!walletData) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedStatusBar />
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <BackButton />
            <Text style={styles.headerTitle}>Carteira</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erro ao carregar dados da carteira</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedStatusBar />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <BackButton />
          <Text style={styles.headerTitle}>Carteira</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card Principal de Saldo */}
        <View style={styles.balanceCard}>
          <LinearGradient
            colors={colors.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.balanceAccent}
          />
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet-outline" size={18} color={colors.secondary.main} />
            <Text style={styles.balanceTitle}>Saldo disponível</Text>
          </View>
          <Text style={styles.balanceAmount} numberOfLines={1} adjustsFontSizeToFit>
            R$ {walletData.balance.toFixed(2)}
          </Text>
          <View style={styles.balanceActions}>
            <Button
              size="sm"
              responsive={false}
              style={styles.balanceButton}
              icon={<Ionicons name="add" size={18} color="#ffffff" />}
              onPress={() => setAddBalanceModalOpen(true)}
            >
              Adicionar saldo
            </Button>
            <Button
              variant="outline"
              size="sm"
              responsive={false}
              style={styles.balanceButton}
              icon={<Ionicons name="arrow-up" size={18} color={colors.secondary.main} />}
              onPress={() => setWithdrawModalOpen(true)}
            >
              Solicitar saque
            </Button>
          </View>
        </View>

        {/* Estatísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="trending-up" size={16} color={colors.states.success} />
              <Text style={styles.statLabel} numberOfLines={1}>Total recebido</Text>
            </View>
            <Text style={[styles.statValue, styles.statValueSuccess]} numberOfLines={1} adjustsFontSizeToFit>
              R$ {walletData.totalEarned.toFixed(2)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="trending-down" size={16} color={colors.states.error} />
              <Text style={styles.statLabel} numberOfLines={1}>Total gasto</Text>
            </View>
            <Text style={[styles.statValue, styles.statValueError]} numberOfLines={1} adjustsFontSizeToFit>
              R$ {walletData.totalSpent.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Histórico */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Histórico de Transações</Text>
          <Text style={styles.historySubtitle}>Todas as suas transações financeiras</Text>
          <WalletHistory refreshTrigger={refreshTrigger} />
        </View>
      </ScrollView>

      {/* Modals */}
      <AddBalanceModal
        visible={addBalanceModalOpen}
        onClose={() => setAddBalanceModalOpen(false)}
        onSuccess={handleAddBalanceSuccess}
      />
      <WithdrawModal
        visible={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        currentBalance={walletData.balance}
        onSuccess={handleWithdrawSuccess}
      />
      <PaymentStatusModal
        visible={paymentStatus !== null}
        status={paymentStatus}
        onClose={() => {
          setPaymentStatus(null);
          setPendingPaymentId(null);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          pollingRef.current = false;
        }}
      />
    </View>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background.default,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border.light,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: c.text.secondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  balanceCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
    padding: 20,
    paddingTop: 22,
    borderRadius: 16,
    backgroundColor: c.background.paper,
    borderWidth: 1,
    borderColor: c.border.light,
    position: 'relative',
    overflow: 'hidden',
  },
  balanceAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  balanceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: c.text.secondary,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: c.text.primary,
    marginBottom: 16,
  },
  balanceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  balanceButton: {
    flexGrow: 1,
    flexBasis: 140,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: c.background.paper,
    borderWidth: 1,
    borderColor: c.border.light,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: c.text.secondary,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  statValueSuccess: {
    color: c.states.success,
  },
  statValueError: {
    color: c.states.error,
  },
  historySection: {
    paddingHorizontal: 20,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.text.primary,
    marginBottom: 4,
  },
  historySubtitle: {
    fontSize: 14,
    color: c.text.secondary,
    marginBottom: 16,
  },
});

