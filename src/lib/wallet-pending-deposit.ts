import AsyncStorage from '@react-native-async-storage/async-storage';

/** Mesmas chaves conceituais do web (`sessionStorage`). */
export const PENDING_MP_DEPOSIT_KEY = 'melter_pending_mp_deposit';
export const PENDING_MP_DEPOSIT_TX_KEY = 'melter_pending_mp_deposit_tx';

export async function setPendingMpDeposit(paymentId: string | null, pendingDepositId: string | null) {
  if (paymentId) {
    await AsyncStorage.setItem(PENDING_MP_DEPOSIT_KEY, paymentId);
  }
  if (pendingDepositId) {
    await AsyncStorage.setItem(PENDING_MP_DEPOSIT_TX_KEY, pendingDepositId);
  }
}

export async function getPendingMpDepositIds(): Promise<{
  paymentId: string | null;
  pendingDepositId: string | null;
}> {
  const [paymentId, pendingDepositId] = await Promise.all([
    AsyncStorage.getItem(PENDING_MP_DEPOSIT_KEY),
    AsyncStorage.getItem(PENDING_MP_DEPOSIT_TX_KEY),
  ]);
  return { paymentId, pendingDepositId };
}

export async function clearPendingMpDeposit() {
  await AsyncStorage.multiRemove([PENDING_MP_DEPOSIT_KEY, PENDING_MP_DEPOSIT_TX_KEY]);
}
