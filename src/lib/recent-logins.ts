import AsyncStorage from '@react-native-async-storage/async-storage';

/** Só usernames (nunca senha, token ou dados de perfil), gravados após login bem-sucedido. */
const STORAGE_KEY = '@melter_recent_usernames_v1';
const MAX_RECENT_USERNAMES = 5;
const USERNAME_PATTERN = /^[a-z0-9._-]{1,40}$/i;

function normalize(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string' || !USERNAME_PATTERN.test(item)) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length === MAX_RECENT_USERNAMES) break;
  }
  return result;
}

export async function getRecentUsernames(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

async function save(list: string[]): Promise<string[]> {
  const next = normalize(list);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  return next;
}

/** Chamar só com o username canônico devolvido pelo servidor (login aceito). */
export async function addRecentUsername(username: string): Promise<void> {
  if (!USERNAME_PATTERN.test(username)) return;
  const current = await getRecentUsernames();
  await save([username, ...current.filter((u) => u.toLowerCase() !== username.toLowerCase())]);
}

export async function clearRecentUsernames(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
}

export async function removeRecentUsername(username: string): Promise<string[]> {
  const current = await getRecentUsernames();
  return save(current.filter((u) => u.toLowerCase() !== username.toLowerCase()));
}
