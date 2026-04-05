import React, { createContext, useContext, useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import {
  PALETTES,
  type PaletteKey,
  type AppColors,
} from '../constants/theme';

type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  colors: AppColors;
  densityColors: readonly string[];
  isDark: boolean;
  palette: PaletteKey;
  setTheme: (mode: ThemeMode) => void;
  setPalette: (key: PaletteKey) => void;
}

const SETTINGS_FILE = (FileSystem.documentDirectory ?? '') + 'app_settings.json';

const ThemeContext = createContext<ThemeContextValue>({
  colors: PALETTES.deepOcean.dark,
  densityColors: PALETTES.deepOcean.darkDensity,
  isDark: true,
  palette: 'deepOcean',
  setTheme: () => {},
  setPalette: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [palette, setPaletteState] = useState<PaletteKey>('deepOcean');

  useEffect(() => {
    FileSystem.readAsStringAsync(SETTINGS_FILE)
      .then((json) => {
        const settings = JSON.parse(json);
        if (settings.theme === 'light' || settings.theme === 'dark') {
          setMode(settings.theme);
        }
        if (settings.palette && settings.palette in PALETTES) {
          setPaletteState(settings.palette as PaletteKey);
        }
      })
      .catch(() => {});
  }, []);

  const saveSettings = (updates: Record<string, unknown>) => {
    FileSystem.readAsStringAsync(SETTINGS_FILE)
      .then(json => {
        const current = JSON.parse(json);
        return FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify({ ...current, ...updates }));
      })
      .catch(() => FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(updates)).catch(() => {}));
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    saveSettings({ theme: newMode });
  };

  const setPalette = (key: PaletteKey) => {
    setPaletteState(key);
    saveSettings({ palette: key });
  };

  const isDark = mode === 'dark';
  const entry = PALETTES[palette];

  return (
    <ThemeContext.Provider
      value={{
        colors: isDark ? entry.dark : entry.light,
        densityColors: isDark ? entry.darkDensity : entry.lightDensity,
        isDark,
        palette,
        setTheme,
        setPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
