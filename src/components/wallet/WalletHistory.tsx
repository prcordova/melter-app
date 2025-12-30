import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Ionicons from '@expo/vector-icons/Ionicons';
import { walletApi } from '../../services/api';
import { COLORS } from '../../theme/colors';

interface WalletHistoryProps {
  refreshTrigger?: number;
}

enum TransactionType {
  BALANCE_PURCHASE = 'BALANCE_PURCHASE',
  BALANCE_REFUND = 'BALANCE_REFUND',
  PRODUCT_PURCHASE = 'PRODUCT_PURCHASE',
  PRODUCT_SALE = 'PRODUCT_SALE',
  DONATION = 'DONATION',
  TRANSFER = 'TRANSFER',
  POST_TIP = 'POST_TIP',
  ADMIN_CREDIT = 'ADMIN_CREDIT',
  ADMIN_DEBIT = 'ADMIN_DEBIT',
  WITHDRAWAL_REQUEST = 'WITHDRAWAL_REQUEST',
  WITHDRAWAL_APPROVED = 'WITHDRAWAL_APPROVED',
  WITHDRAWAL_REJECTED = 'WITHDRAWAL_REJECTED',
  WITHDRAWAL_COMPLETED = 'WITHDRAWAL_COMPLETED',
}

interface Transaction {
  _id: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  fromUserId?: {
    username: string;
    avatar?: string;
  };
  toUserId?: {
    username: string;
    avatar?: string;
  };
  metadata?: {
    withdrawalId?: string;
    [key: string]: any;
  };
}

const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: TransactionType.BALANCE_PURCHASE, label: 'Recargas' },
  { value: TransactionType.PRODUCT_SALE, label: 'Produtos' },
  { value: TransactionType.TRANSFER, label: 'Transferências' },
  { value: TransactionType.ADMIN_CREDIT, label: 'Admin' },
];

export function WalletHistory({ refreshTrigger }: WalletHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchTransactions();
    }
  }, [refreshTrigger]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await walletApi.getTransactions(filter, 50);
      if (response.success && response.data) {
        setTransactions(response.data.transactions || []);
      }
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: TransactionType, amount: number) => {
    const isPositive = amount > 0;
    switch (type) {
      case TransactionType.BALANCE_PURCHASE:
        return { name: 'add-circle', color: COLORS.states.success };
      case TransactionType.PRODUCT_SALE:
        return { name: 'storefront', color: COLORS.states.success };
      case TransactionType.DONATION:
      case TransactionType.TRANSFER:
      case TransactionType.POST_TIP:
        return { name: isPositive ? 'arrow-down-circle' : 'arrow-up-circle', color: isPositive ? COLORS.states.success : COLORS.states.error };
      case TransactionType.WITHDRAWAL_REQUEST:
      case TransactionType.WITHDRAWAL_APPROVED:
      case TransactionType.WITHDRAWAL_COMPLETED:
        return { name: 'cash-outline', color: COLORS.states.warning };
      case TransactionType.ADMIN_CREDIT:
        return { name: 'gift', color: COLORS.states.success };
      case TransactionType.ADMIN_DEBIT:
        return { name: 'remove-circle', color: COLORS.states.error };
      default:
        return { name: 'swap-horizontal', color: COLORS.text.secondary };
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch {
      return 'Agora';
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.secondary.main} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTERS.map((filterOption) => (
          <TouchableOpacity
            key={filterOption.value}
            style={[styles.filterChip, filter === filterOption.value && styles.filterChipActive]}
            onPress={() => setFilter(filterOption.value)}
          >
            <Text style={[styles.filterChipText, filter === filterOption.value && styles.filterChipTextActive]}>
              {filterOption.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista de Transações */}
      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={48} color={COLORS.text.secondary} />
          <Text style={styles.emptyText}>Nenhuma transação encontrada</Text>
        </View>
      ) : (
        <ScrollView style={styles.transactionsList} showsVerticalScrollIndicator={false}>
          {transactions.map((transaction) => {
            const icon = getTransactionIcon(transaction.type, transaction.amount);
            const isPositive = transaction.amount > 0;

            return (
              <View key={transaction._id} style={styles.transactionCard}>
                <View style={styles.transactionIconContainer}>
                  <Ionicons name={icon.name as any} size={24} color={icon.color} />
                </View>
                <View style={styles.transactionContent}>
                  <Text style={styles.transactionDescription} numberOfLines={1}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
                </View>
                <View style={styles.transactionAmountContainer}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      isPositive ? styles.transactionAmountPositive : styles.transactionAmountNegative,
                    ]}
                  >
                    {isPositive ? '+' : ''}R$ {Math.abs(transaction.amount).toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  filterChipActive: {
    backgroundColor: COLORS.secondary.main,
    borderColor: COLORS.secondary.main,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 12,
  },
  transactionsList: {
    flex: 1,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionAmountPositive: {
    color: COLORS.states.success,
  },
  transactionAmountNegative: {
    color: COLORS.states.error,
  },
});

