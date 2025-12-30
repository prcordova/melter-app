import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BackButton } from '../../components/BackButton';
import { AddBalanceModal } from '../../components/wallet/AddBalanceModal';
import { WithdrawModal } from '../../components/wallet/WithdrawModal';
import { PaymentStatusModal } from '../../components/wallet/PaymentStatusModal';
import { WalletHistory } from '../../components/wallet/WalletHistory';
import { walletApi } from '../../services/api';
import { COLORS } from '../../theme/colors';
import { showToast } from '../../components/CustomToast';
import { Linking } from 'react-native';

interface WalletData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  username: string;
}

export function WalletSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [addBalanceModalOpen, setAddBalanceModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'pending' | 'cancelled' | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingRef = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchWalletData();
      return () => {
        // Cleanup ao sair da tela
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        pollingRef.current = false;
      };
    }, [])
  );

  // Verificar URL de retorno do pagamento (deep linking)
  useEffect(() => {
    const checkPaymentReturn = async () => {
      // No mobile, podemos usar deep linking ou parâmetros de navegação
      // Por enquanto, vamos verificar se há algum estado salvo
      try {
        // Implementar lógica de deep linking se necessário
      } catch (error) {
        console.error('Erro ao verificar retorno do pagamento:', error);
      }
    };

    checkPaymentReturn();
  }, []);

  // Polling do status do pagamento quando está pendente
  useEffect(() => {
    if (paymentStatus === 'pending' && !pollingRef.current && walletData) {
      const initialBalance = walletData.balance;

      if (pendingPaymentId) {
        pollingRef.current = true;

        const checkPaymentStatus = async () => {
          try {
            const response = await walletApi.getPaymentStatus(pendingPaymentId);
            if (response.success && response.data) {
              const status = response.data.status;

              if (status === 'approved') {
                setPaymentStatus('success');
                fetchWalletData();
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
              } else if (status === 'rejected' || status === 'cancelled') {
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
              }
            }
          } catch (error) {
            console.error('[WALLET] Erro ao verificar status do pagamento:', error);
          }
        };

        checkPaymentStatus();
        const interval = setInterval(checkPaymentStatus, 5000);
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
  }, [paymentStatus, pendingPaymentId, walletData]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const response = await walletApi.getBalance();
      if (response.success && response.data) {
        setWalletData(response.data);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Erro ao buscar dados da carteira:', error);
      showToast.error('Erro ao carregar dados da carteira');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBalanceSuccess = () => {
    setPaymentStatus('pending');
    fetchWalletData();
  };

  const handleWithdrawSuccess = () => {
    fetchWalletData();
  };

  if (loading && !walletData) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <BackButton />
            <Text style={styles.headerTitle}>Carteira</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.secondary.main} />
        </View>
      </View>
    );
  }

  if (!walletData) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
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
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet" size={28} color="#ffffff" />
            <Text style={styles.balanceTitle}>Saldo Disponível</Text>
          </View>
          <Text style={styles.balanceAmount}>R$ {walletData.balance.toFixed(2)}</Text>
          <View style={styles.balanceActions}>
            <TouchableOpacity
              style={[styles.balanceButton, styles.addButton]}
              onPress={() => setAddBalanceModalOpen(true)}
            >
              <Ionicons name="add" size={20} color={COLORS.states.success} />
              <Text style={[styles.balanceButtonText, styles.addButtonText]}>
                💰 Adicionar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.balanceButton, styles.withdrawButton]}
              onPress={() => setWithdrawModalOpen(true)}
            >
              <Ionicons name="send" size={20} color={COLORS.primary.main} />
              <Text style={[styles.balanceButtonText, styles.withdrawButtonText]}>
                💸 Solicitar Saque
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Estatísticas */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.statIconSuccess]}>
              <Ionicons name="trending-up" size={24} color={COLORS.states.success} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Recebido</Text>
              <Text style={[styles.statValue, styles.statValueSuccess]}>
                R$ {walletData.totalEarned.toFixed(2)}
              </Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.statIconError]}>
              <Ionicons name="trending-down" size={24} color={COLORS.states.error} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Gasto</Text>
              <Text style={[styles.statValue, styles.statValueError]}>
                R$ {walletData.totalSpent.toFixed(2)}
              </Text>
            </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
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
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  balanceCard: {
    margin: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: COLORS.primary.main,
    position: 'relative',
    overflow: 'hidden',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 20,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  balanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  addButton: {
    backgroundColor: '#ffffff',
  },
  withdrawButton: {
    backgroundColor: '#ffffff',
  },
  balanceButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonText: {
    color: COLORS.states.success,
  },
  withdrawButtonText: {
    color: COLORS.primary.main,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconSuccess: {
    backgroundColor: COLORS.states.success + '20',
  },
  statIconError: {
    backgroundColor: COLORS.states.error + '20',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statValueSuccess: {
    color: COLORS.states.success,
  },
  statValueError: {
    color: COLORS.states.error,
  },
  historySection: {
    paddingHorizontal: 20,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  historySubtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 16,
  },
});

