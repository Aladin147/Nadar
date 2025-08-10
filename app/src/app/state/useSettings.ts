import { useEffect, useState } from 'react';
import { loadSettings, saveSettings, Settings } from './settings';

export interface UseSettingsReturn {
  settings: Settings;
  update: (partial: Partial<Settings>) => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings>({
    language: 'darija',
    verbosity: 'brief',
    ttsProvider: 'elevenlabs',
    ttsRate: 1.0
  });

  useEffect(() => {
    (async () => {
      try {
        const loadedSettings = await loadSettings();
        setSettings(loadedSettings);
      } catch (error) {
        console.warn('Failed to load settings:', error);
      }
    })();
  }, []);

  const update = async (partial: Partial<Settings>): Promise<void> => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await saveSettings(next);
  };

  return { settings, update };
}

