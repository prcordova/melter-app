import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Ionicons from '@expo/vector-icons/Ionicons';
import { walletApi } from '../../services/api';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import { CustomModal } from '../CustomModal';
import { Button } from '../Button';
import { WalletFilterTabs } from './WalletFilterTabs';

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
  PLAN_PURCHASE = 'PLAN_PURCHASE',
  AFFILIATE_COMMISSION = 'AFFILIATE_COMMISSION',
}

type WithdrawalDetails = {
  status: string;
  withdrawalFee?: number;
  netAmount?: number;
  pixKeyType?: string;
  receiptUrl?: string;
};

const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  PROCESSING: 'Processando',
  COMPLETED: 'Concluído',
  REJECTED: 'Recusado',
  CANCELLED: 'Cancelado',
};

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

interface TransactionDayGroup {
  key: string;
  label: string;
  total: number;
  items: Transaction[];
}

const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: TransactionType.BALANCE_PURCHASE, label: 'Recargas' },
  { value: TransactionType.PRODUCT_SALE, label: 'Produtos' },
  { value: TransactionType.TRANSFER, label: 'Transferências' },
  { value: TransactionType.ADMIN_CREDIT, label: 'Admin' },
];

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.BALANCE_PURCHASE]: 'Recarga de saldo',
  [TransactionType.BALANCE_REFUND]: 'Estorno de recarga',
  [TransactionType.PRODUCT_PURCHASE]: 'Compra de produto',
  [TransactionType.PRODUCT_SALE]: 'Venda de produto',
  [TransactionType.DONATION]: 'Doação',
  [TransactionType.TRANSFER]: 'Transferência',
  [TransactionType.POST_TIP]: 'Gorjeta em post',
  [TransactionType.ADMIN_CREDIT]: 'Crédito do admin',
  [TransactionType.ADMIN_DEBIT]: 'Débito do admin',
  [TransactionType.WITHDRAWAL_REQUEST]: 'Saque solicitado',
  [TransactionType.WITHDRAWAL_APPROVED]: 'Saque aprovado',
  [TransactionType.WITHDRAWAL_REJECTED]: 'Saque recusado',
  [TransactionType.WITHDRAWAL_COMPLETED]: 'Saque concluído',
  [TransactionType.PLAN_PURCHASE]: 'Assinatura de plano',
  [TransactionType.AFFILIATE_COMMISSION]: 'Comissão de afiliado',
};

const formatCurrency = (value: number) => `R$ ${Math.abs(value).toFixed(2)}`;

const formatSignedCurrency = (value: number) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${formatCurrency(value)}`;

function getDayLabel(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return format(date, sameYear ? "EEEE, d 'de' MMMM" : "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

function groupTransactionsByDay(transactions: Transaction[]): TransactionDayGroup[] {
  const groups = new Map<string, TransactionDayGroup>();
  for (const transaction of transactions) {
    const date = new Date(transaction.createdAt);
    const key = format(date, 'yyyy-MM-dd');
    let group = groups.get(key);
    if (!group) {
      group = { key, label: getDayLabel(date), total: 0, items: [] };
      groups.set(key, group);
    }
    group.total += transaction.amount;
    group.items.push(transaction);
  }
  return Array.from(groups.values());
}

export function WalletHistory({ refreshTrigger }: WalletHistoryProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [withdrawalDetails, setWithdrawalDetails] = useState<WithdrawalDetails | null>(null);
  const [loadingWithdrawal, setLoadingWithdrawal] = useState(false);

  const selectedWithdrawalId = selected?.metadata?.withdrawalId;

  useEffect(() => {
    setWithdrawalDetails(null);
    if (!selectedWithdrawalId) return;
    let cancelled = false;
    setLoadingWithdrawal(true);
    walletApi
      .getWithdrawal(String(selectedWithdrawalId))
      .then((response) => {
        if (!cancelled && response.success && response.data) {
          setWithdrawalDetails(response.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingWithdrawal(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedWithdrawalId]);

  const dayGroups = useMemo(() => groupTransactionsByDay(transactions), [transactions]);

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
        return { name: 'add-circle', color: colors.states.success };
      case TransactionType.PRODUCT_SALE:
        return { name: 'storefront', color: colors.states.success };
      case TransactionType.DONATION:
      case TransactionType.TRANSFER:
      case TransactionType.POST_TIP:
        return { name: isPositive ? 'arrow-down-circle' : 'arrow-up-circle', color: isPositive ? colors.states.success : colors.states.error };
      case TransactionType.WITHDRAWAL_REQUEST:
      case TransactionType.WITHDRAWAL_APPROVED:
      case TransactionType.WITHDRAWAL_COMPLETED:
        return { name: 'cash-outline', color: colors.states.warning };
      case TransactionType.WITHDRAWAL_REJECTED:
        return { name: 'arrow-undo-circle', color: colors.states.success };
      case TransactionType.PLAN_PURCHASE:
        return { name: 'ribbon-outline', color: colors.states.error };
      case TransactionType.AFFILIATE_COMMISSION:
        return { name: 'people-circle-outline', color: colors.states.success };
      case TransactionType.ADMIN_CREDIT:
        return { name: 'gift', color: colors.states.success };
      case TransactionType.ADMIN_DEBIT:
        return { name: 'remove-circle', color: colors.states.error };
      default:
        return { name: 'swap-horizontal', color: colors.text.secondary };
    }
  };

  const getTypeLabel = (type: TransactionType) => TRANSACTION_TYPE_LABELS[type] ?? 'Transação';

  const renderDetail = (label: string, value: string, options?: { selectable?: boolean }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} selectable={options?.selectable}>
        {value}
      </Text>
    </View>
  );

  const renderSelectedModal = () => {
    if (!selected) return null;
    const icon = getTransactionIcon(selected.type, selected.amount);
    const isPositive = selected.amount > 0;
    const date = new Date(selected.createdAt);

    return (
      <CustomModal visible onClose={() => setSelected(null)}>
        <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
          <View style={styles.modalHeader}>
            <View style={[styles.iconCircle, { backgroundColor: `${icon.color}1f` }]}>
              <Ionicons name={icon.name as any} size={20} color={icon.color} />
            </View>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {getTypeLabel(selected.type)}
            </Text>
            <TouchableOpacity
              onPress={() => setSelected(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Fechar"
            >
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalAmount, isPositive ? styles.amountPositive : styles.amountNegative]}>
            {formatSignedCurrency(selected.amount)}
          </Text>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Descrição</Text>
              <Text style={styles.detailDescription} selectable>
                {selected.description || '—'}
              </Text>
            </View>
            {renderDetail('Data', format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }))}
            {selected.fromUserId?.username ? renderDetail('De', `@${selected.fromUserId.username}`) : null}
            {selected.toUserId?.username ? renderDetail('Para', `@${selected.toUserId.username}`) : null}
            {renderDetail('Saldo anterior', formatCurrency(selected.balanceBefore))}
            {renderDetail('Saldo após', formatCurrency(selected.balanceAfter))}
            {selected.metadata?.withdrawalId
              ? renderDetail('Saque', String(selected.metadata.withdrawalId), { selectable: true })
              : null}
            {selectedWithdrawalId && loadingWithdrawal ? (
              <ActivityIndicator size="small" color={colors.secondary.main} />
            ) : null}
            {withdrawalDetails ? (
              <>
                {renderDetail(
                  'Status do saque',
                  WITHDRAWAL_STATUS_LABELS[withdrawalDetails.status] ?? withdrawalDetails.status
                )}
                {withdrawalDetails.pixKeyType ? renderDetail('Chave Pix', withdrawalDetails.pixKeyType) : null}
                {withdrawalDetails.withdrawalFee != null
                  ? renderDetail('Taxa de saque', formatCurrency(withdrawalDetails.withdrawalFee))
                  : null}
                {withdrawalDetails.netAmount != null
                  ? renderDetail('Valor a receber', formatCurrency(withdrawalDetails.netAmount))
                  : null}
              </>
            ) : null}
            {renderDetail('ID da transação', selected._id, { selectable: true })}
          </ScrollView>

          {withdrawalDetails?.receiptUrl ? (
            <Button
              variant="outline"
              size="sm"
              responsive={false}
              onPress={() => void Linking.openURL(withdrawalDetails.receiptUrl!)}
            >
              Ver comprovante
            </Button>
          ) : null}

          <Button variant="ghost" size="sm" responsive={false} onPress={() => setSelected(null)}>
            Fechar
          </Button>
        </Pressable>
      </CustomModal>
    );
  };

  return (
    <View style={styles.container}>
      <WalletFilterTabs options={FILTERS} value={filter} onChange={setFilter} />

      {loading && transactions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary.main} />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={48} color={colors.text.secondary} />
          <Text style={styles.emptyText}>Nenhuma transação encontrada</Text>
        </View>
      ) : (
        dayGroups.map((group) => (
          <View key={group.key} style={styles.dayGroup}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{group.label}</Text>
              <Text
                style={[
                  styles.dayTotal,
                  group.total > 0 ? styles.amountPositive : group.total < 0 ? styles.amountNegative : null,
                ]}
              >
                {formatSignedCurrency(group.total)}
              </Text>
            </View>
            <View style={styles.dayCard}>
              {group.items.map((transaction, index) => {
                const icon = getTransactionIcon(transaction.type, transaction.amount);
                const isPositive = transaction.amount > 0;
                return (
                  <TouchableOpacity
                    key={transaction._id}
                    style={[styles.transactionRow, index > 0 && styles.transactionRowDivider]}
                    onPress={() => setSelected(transaction)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: `${icon.color}1f` }]}>
                      <Ionicons name={icon.name as any} size={18} color={icon.color} />
                    </View>
                    <View style={styles.transactionContent}>
                      <Text style={styles.transactionDescription} numberOfLines={1}>
                        {transaction.description || getTypeLabel(transaction.type)}
                      </Text>
                      <Text style={styles.transactionMeta} numberOfLines={1}>
                        {format(new Date(transaction.createdAt), 'HH:mm')} · {getTypeLabel(transaction.type)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.transactionAmount, isPositive ? styles.amountPositive : styles.amountNegative]}
                    >
                      {formatSignedCurrency(transaction.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))
      )}

      {renderSelectedModal()}
    </View>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: c.text.secondary,
    marginTop: 12,
  },
  dayGroup: {
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: c.text.secondary,
    textTransform: 'capitalize',
  },
  dayTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text.tertiary,
  },
  dayCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border.light,
    backgroundColor: c.background.paper,
    overflow: 'hidden',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  transactionRowDivider: {
    borderTopWidth: 1,
    borderTopColor: c.border.light,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionContent: {
    flex: 1,
    minWidth: 0,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 2,
  },
  transactionMeta: {
    fontSize: 12,
    color: c.text.secondary,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  amountPositive: {
    color: c.states.success,
  },
  amountNegative: {
    color: c.states.error,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: c.background.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.divider,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: c.text.primary,
  },
  modalAmount: {
    fontSize: 28,
    fontWeight: '800',
  },
  modalBody: {
    flexGrow: 0,
  },
  modalBodyContent: {
    gap: 10,
  },
  detailBlock: {
    gap: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border.light,
  },
  detailDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: c.text.primary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: c.text.secondary,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: c.text.primary,
  },
});
