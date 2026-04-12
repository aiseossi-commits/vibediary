import { useState, useEffect, useCallback } from 'react';
import { HOME_WIDGETS, HOME_WIDGET_DEFAULTS, type HomeWidgetKey } from '../constants/homeWidgets';
import { getSetting, setSetting } from '../db/appSettingsDao';

type WidgetSettings = Record<HomeWidgetKey, boolean>;

async function loadFromDb(): Promise<WidgetSettings> {
  const keys = Object.values(HOME_WIDGETS) as HomeWidgetKey[];
  const loaded: WidgetSettings = { ...HOME_WIDGET_DEFAULTS };
  for (const key of keys) {
    const val = await getSetting(key);
    if (val !== null) {
      loaded[key] = val === 'true';
    }
  }
  return loaded;
}

export function useHomeWidgetSettings() {
  const [settings, setSettings] = useState<WidgetSettings>({ ...HOME_WIDGET_DEFAULTS });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setSettings(await loadFromDb());
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const reload = useCallback(async () => {
    try {
      setSettings(await loadFromDb());
    } catch {
      // 실패 시 현재 상태 유지
    }
  }, []);

  const toggle = useCallback((key: HomeWidgetKey) => {
    setSettings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      setSetting(key, String(next[key]));
      return next;
    });
  }, []);

  return { settings, toggle, reload, isLoaded };
}
