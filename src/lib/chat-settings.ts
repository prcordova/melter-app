import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChatSettings = {
  backgroundColor: string;
  textColor: string;
  backgroundImage: 'melter' | null;
};

export type UserChatStatus = {
  visibility: 'online' | 'busy' | 'offline';
  customMessage: string;
};

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  backgroundColor: '#f5f5f5',
  textColor: '#1f2937',
  backgroundImage: null,
};

export const DEFAULT_USER_CHAT_STATUS: UserChatStatus = {
  visibility: 'online',
  customMessage: '',
};

const CHAT_SETTINGS_KEY = 'chatSettings';
const USER_STATUS_KEY = 'userStatus';

export const CHAT_BACKGROUND_PRESETS: {
  id: ChatSettings['backgroundImage'];
  label: string;
}[] = [
  { id: null, label: 'Sem imagem' },
  { id: 'melter', label: 'Tema Melter' },
];

export function getChatBackgroundSource(
  imageId: ChatSettings['backgroundImage']
): number | undefined {
  if (imageId === 'melter') {
    return require('../../assets/bgMelter.jpg');
  }
  return undefined;
}

export async function loadChatSettings(): Promise<ChatSettings> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_CHAT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ChatSettings>;
    return {
      backgroundColor:
        typeof parsed.backgroundColor === 'string'
          ? parsed.backgroundColor
          : DEFAULT_CHAT_SETTINGS.backgroundColor,
      textColor:
        typeof parsed.textColor === 'string' ? parsed.textColor : DEFAULT_CHAT_SETTINGS.textColor,
      backgroundImage:
        parsed.backgroundImage === 'melter' ? 'melter' : null,
    };
  } catch {
    return { ...DEFAULT_CHAT_SETTINGS };
  }
}

export async function saveChatSettings(settings: ChatSettings): Promise<void> {
  await AsyncStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadUserChatStatus(): Promise<UserChatStatus> {
  try {
    const raw = await AsyncStorage.getItem(USER_STATUS_KEY);
    if (!raw) return { ...DEFAULT_USER_CHAT_STATUS };
    const parsed = JSON.parse(raw) as Partial<UserChatStatus>;
    const visibility =
      parsed.visibility === 'busy' || parsed.visibility === 'offline'
        ? parsed.visibility
        : 'online';
    return {
      visibility,
      customMessage:
        typeof parsed.customMessage === 'string' ? parsed.customMessage.slice(0, 100) : '',
    };
  } catch {
    return { ...DEFAULT_USER_CHAT_STATUS };
  }
}

export async function saveUserChatStatus(status: UserChatStatus): Promise<void> {
  await AsyncStorage.setItem(USER_STATUS_KEY, JSON.stringify(status));
}
