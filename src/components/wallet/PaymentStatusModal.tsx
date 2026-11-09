import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';

interface PaymentStatusModalProps {
  visible: boolean;
  status: 'success' | 'pending' | 'cancelled' | null;
  onClose: () => void;
}

export function PaymentStatusModal({ visible, status, onClose }: PaymentStatusModalProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  if (!status) return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          iconColor: colors.states.success,
          title: '✅ Pagamento Aprovado',
          message: 'Seu pagamento foi processado com sucesso!',
          description: 'O saldo foi adicionado à sua carteira.',
        };
      case 'pending':
        return {
          icon: 'hourglass',
          iconColor: colors.states.warning,
          title: '⏳ Pagamento Pendente',
          message: 'Aguardando confirmação do pagamento...',
          description: 'Estamos verificando o status do seu pagamento.',
        };
      case 'cancelled':
        return {
          icon: 'close-circle',
          iconColor: colors.states.error,
          title: '❌ Pagamento Cancelado',
          message: 'O pagamento foi cancelado.',
          description: 'Nenhum valor foi debitado da sua conta.',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 20) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.content}>
            {status === 'pending' ? (
              <ActivityIndicator size="large" color={config.iconColor} style={styles.loader} />
            ) : (
              <Ionicons name={config.icon as any} size={64} color={config.iconColor} style={styles.icon} />
            )}
            <Text style={styles.title}>{config.title}</Text>
            <Text style={styles.message}>{config.message}</Text>
            <Text style={styles.description}>{config.description}</Text>
            {status === 'pending' && (
              <View style={styles.checkingContainer}>
                <ActivityIndicator size="small" color={colors.text.secondary} />
                <Text style={styles.checkingText}>Verificando status...</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Fechar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: c.background.paper,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    maxWidth: 400,
    width: '100%',
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  loader: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: c.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: c.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  checkingText: {
    fontSize: 12,
    color: c.text.secondary,
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: c.secondary.main,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

