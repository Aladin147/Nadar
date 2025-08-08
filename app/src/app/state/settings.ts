import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'darija'|'ar'|'en';
export type Verbosity = 'brief'|'normal'|'detailed';

export type Settings = {
  language: Language;
  verbosity: Verbosity;
  voice?: string;
  apiBase?: string;
};

const KEY = 'nadar.settings.v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { language: 'darija', verbosity: 'brief' };
    const parsed = JSON.parse(raw) as Settings;
    return { language: 'darija', verbosity: 'brief', ...parsed };
  } catch {
    return { language: 'darija', verbosity: 'brief' };
  }
}

export async function saveSettings(s: Settings) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

