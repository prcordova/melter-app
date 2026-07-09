import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CustomModal } from '../CustomModal';
import { showToast } from '../CustomToast';
import { COLORS } from '../../theme/colors';
import {
  SHOP_SHARE_MODAL_OPTIONS,
  copyShopShareLink,
  shareShopLink,
  type ShopShareChannel,
  type ShopShareOptionKey,
} from '../../utils/shop-share';

const OPTION_ICONS: Record<ShopShareOptionKey, React.ComponentProps<typeof Ionicons>['name']> = {
  copy: 'copy-outline',
  whatsapp: 'logo-whatsapp',
  instagram: 'logo-instagram',
  telegram: 'paper-plane-outline',
};

export type ShopShareOptionsModalProps = {
  visible: boolean;
  onClose: () => void;
  username: string;
  title?: string;
  onAfterShare?: (channel: ShopShareChannel) => void | Promise<void>;
};

export function ShopShareOptionsModal({
  visible,
  onClose,
  username,
  title = 'Compartilhar link da loja',
  onAfterShare,
}: ShopShareOptionsModalProps) {
  const handleOption = async (key: ShopShareOptionKey) => {
    if (!username) return;

    if (key === 'copy') {
      try {
        await copyShopShareLink(username);
        showToast.success('Link copiado!');
        onClose();
      } catch {
        showToast.error('Não foi possível copiar o link.');
      }
      return;
    }

    const ok = await shareShopLink(username, key);
    if (!ok) return;

    onClose();
    await onAfterShare?.(key);
  };

  return (
    <CustomModal visible={visible} onClose={onClose} title={title} top>
      <View style={styles.options}>
        {SHOP_SHARE_MODAL_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={styles.option}
            activeOpacity={0.8}
            onPress={() => void handleOption(option.key)}
          >
            <Ionicons name={OPTION_ICONS[option.key]} size={20} color={COLORS.secondary.main} />
            <Text style={styles.optionLabel}>{option.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </CustomModal>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: 8,
    paddingTop: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border.light,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
});
