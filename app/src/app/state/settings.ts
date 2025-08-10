import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'darija'|'ar'|'en';
export type Verbosity = 'brief'|'normal'|'detailed';
export type TTSProvider = 'gemini'|'elevenlabs';

export type Settings = {
  language: Language;
  verbosity: Verbosity;
  voice?: string;
  apiBase?: string;
  ttsProvider?: TTSProvider;
};

const KEY = 'nadar.settings.v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { language: 'darija', verbosity: 'brief', ttsProvider: 'gemini' };
    const parsed = JSON.parse(raw) as Settings;
    return { language: 'darija', verbosity: 'brief', ttsProvider: 'gemini', ...parsed };
  } catch {
    return { language: 'darija', verbosity: 'brief', ttsProvider: 'gemini' };
  }
}

export async function saveSettings(s: Settings) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

