import { useEffect, useState } from 'react';
import { loadSettings, saveSettings, Settings } from './settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({ language: 'darija', verbosity: 'brief' });
  useEffect(() => { (async () => setSettings(await loadSettings()))(); }, []);
  const update = async (partial: Partial<Settings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await saveSettings(next);
  };
  return { settings, update };
}

