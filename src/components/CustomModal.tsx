import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS } from '../theme/colors';

export interface CustomModalButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'destructive' | 'cancel';
  disabled?: boolean;
}

export interface CustomModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: CustomModalButton[];
  onClose?: () => void;
  icon?: string;
  iconColor?: string;
  top?: boolean; // Se true, anima de cima para baixo. Se false, anima de baixo para cima (padrão)
  closeOnBackdropPress?: boolean; // Se true, fecha ao clicar fora (padrão: true quando não tem botões customizados)
}

export function CustomModal({
  visible,
  title,
  message,
  buttons = [],
  onClose,
  icon,
  iconColor = COLORS.primary.main,
  top = false,
  closeOnBackdropPress,
}: CustomModalProps) {
  // Se não tiver botões, criar um botão padrão "OK"
  const modalButtons = buttons.length > 0 
    ? buttons 
    : [{ text: 'OK', onPress: onClose || (() => {}), style: 'default' as const }];

  // Por padrão, fecha ao clicar fora se não tiver botões customizados
  const shouldCloseOnBackdrop = closeOnBackdropPress !== undefined 
    ? closeOnBackdropPress 
    : buttons.length === 0;

  const handleBackdropPress = () => {
    if (onClose && shouldCloseOnBackdrop) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType={top ? "slide" : "fade"}
      onRequestClose={onClose}
    >
      <Pressable 
        style={[styles.overlay, top && styles.overlayTop]}
        onPress={handleBackdropPress}
      >
        <Pressable 
          style={[styles.container, top && styles.containerTop]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Ícone (opcional) */}
          {icon && (
            <View style={styles.iconContainer}>
              <Ionicons name={icon as any} size={48} color={iconColor} />
            </View>
          )}

          {/* Título */}
          <Text style={styles.title}>{title}</Text>

          {/* Mensagem */}
          <Text style={styles.message}>{message}</Text>

          {/* Botões */}
          <View style={styles.buttonsContainer}>
            {modalButtons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isCancel && styles.cancelButton,
                    isDestructive && styles.destructiveButton,
                    button.disabled && styles.disabledButton,
                    modalButtons.length === 1 && styles.singleButton,
                  ]}
                  onPress={button.disabled ? undefined : button.onPress}
                  disabled={button.disabled}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && styles.cancelButtonText,
                      isDestructive && styles.destructiveButtonText,
                      button.disabled && styles.disabledButtonText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Hook para gerenciar o modal
export function useCustomModal() {
  const [modalProps, setModalProps] = React.useState<CustomModalProps>({
    visible: false,
    title: '',
    message: '',
  });

  const showModal = React.useCallback((props: Omit<CustomModalProps, 'visible'>) => {
    setModalProps({
      ...props,
      visible: true,
    });
  }, []);

  const hideModal = React.useCallback(() => {
    setModalProps((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const showConfirm = React.useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      onCancel?: () => void;
      destructive?: boolean;
    }
  ) => {
    showModal({
      title,
      message,
      buttons: [
        {
          text: options?.cancelText || 'Cancelar',
          onPress: () => {
            hideModal();
            options?.onCancel?.();
          },
          style: 'cancel',
        },
        {
          text: options?.confirmText || 'Confirmar',
          onPress: () => {
            hideModal();
            onConfirm();
          },
          style: options?.destructive ? 'destructive' : 'default',
        },
      ],
    });
  }, [showModal, hideModal]);

  const showAlert = React.useCallback((
    title: string,
    message: string,
    onPress?: () => void
  ) => {
    showModal({
      title,
      message,
      buttons: [
        {
          text: 'OK',
          onPress: () => {
            hideModal();
            onPress?.();
          },
          style: 'default',
        },
      ],
    });
  }, [showModal, hideModal]);

  return {
    modalProps,
    showModal,
    hideModal,
    showConfirm,
    showAlert,
  };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayTop: {
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  container: {
    backgroundColor: COLORS.background.paper,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  containerTop: {
    marginTop: 0,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  singleButton: {
    flex: 0,
    paddingHorizontal: 48,
  },
  cancelButton: {
    backgroundColor: COLORS.background.default,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  destructiveButton: {
    backgroundColor: COLORS.states.error,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: COLORS.text.primary,
  },
  destructiveButtonText: {
    color: '#FFFFFF',
  },
  disabledButtonText: {
    opacity: 0.6,
  },
});

