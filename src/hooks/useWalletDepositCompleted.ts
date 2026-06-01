import { useEffect } from 'react';
import { usePusher } from './usePusher';
import { showToast } from '../components/CustomToast';

type WalletDepositCompletedPayload = {
  alreadyProcessed?: boolean;
  netAmount?: number;
};

type Options = {
  onBalanceUpdated?: (payload: WalletDepositCompletedPayload) => void;
  showToastOnComplete?: boolean;
  toastMessage?: string;
};

export function useWalletDepositCompleted(options: Options = {}) {
  const { channel } = usePusher();
  const { onBalanceUpdated, showToastOnComplete = false, toastMessage } = options;

  useEffect(() => {
    if (!channel) return;

    const handleDepositCompleted = (payload: WalletDepositCompletedPayload) => {
      onBalanceUpdated?.(payload);
      if (showToastOnComplete && !payload?.alreadyProcessed) {
        showToast.success(toastMessage ?? 'Recarga aprovada com sucesso!');
      }
    };

    channel.bind('wallet-deposit-completed', handleDepositCompleted);
    return () => {
      channel.unbind('wallet-deposit-completed', handleDepositCompleted);
    };
  }, [channel, onBalanceUpdated, showToastOnComplete, toastMessage]);
}
