import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../theme/colors';
import { api } from '../services/api';

interface WalletButtonProps {
  onPress: () => void;
}

export function WalletButton({ onPress }: WalletButtonProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBalanceVisible, setIsBalanceVisible] = useState(false); // Por padrão oculto

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await api.get('/api/wallet/balance');
      if (response.data.success) {
        setBalance(response.data.data.balance);
      }
    } catch (error) {
      console.error('Erro ao buscar saldo:', error);
      // Não mostrar erro ao usuário, apenas não exibir o saldo
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = () => {
    setIsBalanceVisible(!isBalanceVisible);
  };

  const handleWalletPress = () => {
    onPress();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={COLORS.icon.inactive} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleWalletPress}
      activeOpacity={0.7}
    >
      {/* Ícone da Carteira */}
      <Ionicons name="wallet-outline" size={16} color={COLORS.secondary.main} />

      {/* Saldo */}
      <View style={styles.balanceContainer}>
        <Text
          style={[
            styles.currency,
            isBalanceVisible && styles.currencyVisible,
          ]}
        >
          R$
        </Text>
        <Text
          style={[
            styles.amount,
            isBalanceVisible && styles.amountVisible,
          ]}
        >
          {isBalanceVisible
            ? (balance?.toFixed(2) || '0.00')
            : '***.**'}
        </Text>
      </View>

      {/* Botão Olho */}
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          handleToggleVisibility();
        }}
        style={styles.eyeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={isBalanceVisible ? 'eye-off-outline' : 'eye-outline'}
          size={16}
          color={COLORS.secondary.main}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
    gap: 6,
    minWidth: 120,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  currency: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  currencyVisible: {
    color: COLORS.secondary.main,
  },
  amount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  amountVisible: {
    color: COLORS.secondary.main,
  },
  eyeButton: {
    padding: 4,
  },
});

