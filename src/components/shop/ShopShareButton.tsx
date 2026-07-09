import React, { useState } from 'react';
import { ShopShareOptionsModal } from './ShopShareOptionsModal';
import { Button } from '../Button';
import { SELLER_REACH_SHARE_CTA_LABEL } from '../../utils/seller/growth-promo';
import type { ShopShareChannel } from '../../utils/shop-share';

type ShopShareButtonProps = {
  username: string;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'primary' | 'ghost' | 'outline';
  modalTitle?: string;
  onAfterShare?: (channel: ShopShareChannel) => void | Promise<void>;
};

export function ShopShareButton({
  username,
  label = SELLER_REACH_SHARE_CTA_LABEL,
  size = 'xs',
  variant = 'ghost',
  modalTitle,
  onAfterShare,
}: ShopShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} onPress={() => setOpen(true)}>
        {label}
      </Button>
      <ShopShareOptionsModal
        visible={open}
        onClose={() => setOpen(false)}
        username={username}
        title={modalTitle}
        onAfterShare={onAfterShare}
      />
    </>
  );
}
