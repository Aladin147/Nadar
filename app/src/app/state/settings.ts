import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'darija' | 'ar' | 'en';
export type Verbosity = 'brief' | 'normal' | 'detailed';
export type TTSProvider = 'gemini' | 'elevenlabs';
export type TTSRate = 0.9 | 1.0 | 1.2;

export type Settings = {
  language: Language;
  verbosity: Verbosity;
  voice?: string;
  apiBase?: string;
  ttsProvider?: TTSProvider;
  ttsRate?: TTSRate;
};

const KEY = 'nadar.settings.v1';

export async function loadSettings(): Promise<Settings> {
  const defaults: Settings = {
    language: 'darija',
    verbosity: 'brief',
    ttsProvider: 'elevenlabs',
    ttsRate: 1.0,
  };

  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Settings;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export async function saveSettings(s: Settings) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}
