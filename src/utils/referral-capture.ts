import AsyncStorage from '@react-native-async-storage/async-storage';

export const REFERRAL_STORAGE_KEY = 'referralCode';

export async function persistReferralCode(code: string): Promise<void> {
  const trimmed = code.trim();
  if (!trimmed) return;
  await AsyncStorage.setItem(REFERRAL_STORAGE_KEY, trimmed);
}

/** Extrai `ref` de uma URL ou query string e persiste para o cadastro. */
export async function captureReferralFromUrl(urlOrSearch: string): Promise<string | null> {
  try {
    const query = urlOrSearch.includes('?')
      ? urlOrSearch.slice(urlOrSearch.indexOf('?'))
      : urlOrSearch.startsWith('?')
        ? urlOrSearch
        : `?${urlOrSearch}`;
    const ref = new URLSearchParams(query).get('ref');
    if (!ref?.trim()) return null;
    await persistReferralCode(ref);
    return ref.trim();
  } catch {
    return null;
  }
}
