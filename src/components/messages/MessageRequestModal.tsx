import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { messageApi } from '../../services/api';
import { useAppTheme, useThemedStyles } from '../../contexts/ThemeContext';
import type { AppPalette } from '../../theme/palettes';
import { showToast } from '../CustomToast';
import { Button } from '../Button';

export type MessageRequestModalProps = {
  visible: boolean;
  onClose: () => void;
  recipientId: string;
  recipientUsername: string;
  /** outgoing = você enviou o pedido de amizade; reply = você recebeu o pedido */
  variant?: 'outgoing' | 'reply';
  onSent?: () => void;
};

export function MessageRequestModal({
  visible,
  onClose,
  recipientId,
  recipientUsername,
  variant = 'outgoing',
  onSent,
}: MessageRequestModalProps) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) {
      setContent('');
    }
  }, [visible]);

  const handleClose = () => {
    if (sending) return;
    setContent('');
    onClose();
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      showToast.error('Mensagem vazia', 'Escreva uma mensagem para enviar.');
      return;
    }
    if (trimmed.length > 500) {
      showToast.error('Mensagem longa', 'Máximo de 500 caracteres.');
      return;
    }

    try {
      setSending(true);
      const response = await messageApi.sendMessage({
        recipientId,
        content: trimmed,
        type: 'text',
        asMessageRequest: true,
      });
      if (response.success) {
        showToast.success('Enviado', 'Sua mensagem será entregue quando a amizade for aceita.');
        setContent('');
        onSent?.();
        onClose();
      } else {
        showToast.error('Erro', response.message || 'Não foi possível enviar a solicitação.');
      }
    } catch (error: unknown) {
      const msg =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      showToast.error(
        'Erro',
        typeof msg === 'string' && msg.length > 0 ? msg : 'Não foi possível enviar a solicitação.'
      );
    } finally {
      setSending(false);
    }
  };

  const description =
    variant === 'reply'
      ? `@${recipientUsername} enviou um pedido de amizade. Envie uma mensagem que ficará visível quando vocês forem amigos (ou ao aceitar o pedido).`
      : `Sua solicitação de amizade para @${recipientUsername} está pendente. Envie uma mensagem que será entregue quando a amizade for aceita.`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>Solicitação de mensagem</Text>
              <TouchableOpacity onPress={handleClose} disabled={sending}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>{description}</Text>

            <TextInput
              style={styles.input}
              value={content}
              onChangeText={(t) => setContent(t.slice(0, 500))}
              placeholder="Escreva sua mensagem..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              maxLength={500}
              editable={!sending}
            />
            <Text style={styles.helper}>Máx. 500 caracteres · apenas texto</Text>

            <View style={styles.actions}>
              <Button variant="ghost" onPress={handleClose} disabled={sending} style={styles.btn}>
                Cancelar
              </Button>
              <Button onPress={handleSend} disabled={sending} loading={sending} style={styles.btn}>
                Enviar
              </Button>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const createStyles = (c: AppPalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'flex-end',
  },
  keyboard: {
    width: '100%',
  },
  sheet: {
    backgroundColor: c.background.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: c.text.primary,
  },
  description: {
    fontSize: 14,
    color: c.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: c.border.medium,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: c.text.primary,
    textAlignVertical: 'top',
  },
  helper: {
    fontSize: 12,
    color: c.text.tertiary,
    marginTop: 6,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
  },
});
