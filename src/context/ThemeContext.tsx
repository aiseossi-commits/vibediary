import React, { createContext, useContext, useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import {
  DARK_COLORS,
  LIGHT_COLORS,
  DARK_DENSITY_COLORS,
  LIGHT_DENSITY_COLORS,
  type AppColors,
} from '../constants/theme';

type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  colors: AppColors;
  densityColors: readonly string[];
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
}

const SETTINGS_FILE = (FileSystem.documentDirectory ?? '') + 'app_settings.json';

const ThemeContext = createContext<ThemeContextValue>({
  colors: DARK_COLORS,
  densityColors: DARK_DENSITY_COLORS,
  isDark: true,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    FileSystem.readAsStringAsync(SETTINGS_FILE)
      .then((json) => {
        const settings = JSON.parse(json);
        if (settings.theme === 'light' || settings.theme === 'dark') {
          setMode(settings.theme);
        }
      })
      .catch(() => {});
  }, []);

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    FileSystem.readAsStringAsync(SETTINGS_FILE)
      .then(json => {
        const current = JSON.parse(json);
        return FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify({ ...current, theme: newMode }));
      })
      .catch(() => FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify({ theme: newMode })).catch(() => {}));
  };

  const isDark = mode === 'dark';

  return (
    <ThemeContext.Provider
      value={{
        colors: isDark ? DARK_COLORS : LIGHT_COLORS,
        densityColors: isDark ? DARK_DENSITY_COLORS : LIGHT_DENSITY_COLORS,
        isDark,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
