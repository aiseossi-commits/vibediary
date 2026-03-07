import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { getAllChildren, type Child } from '../db/childrenDao';

const SETTINGS_FILE = (FileSystem.documentDirectory ?? '') + 'app_settings.json';

interface ChildContextValue {
  children: Child[];
  activeChild: Child | null;
  setActiveChild: (id: string | null) => void;
  refreshChildren: () => Promise<void>;
}

const ChildContext = createContext<ChildContextValue>({
  children: [],
  activeChild: null,
  setActiveChild: () => {},
  refreshChildren: async () => {},
});

export function ChildProvider({ children: reactChildren }: { children: React.ReactNode }) {
  const [childList, setChildList] = useState<Child[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  const refreshChildren = useCallback(async () => {
    try {
      const list = await getAllChildren();
      setChildList(list);
    } catch {}
  }, []);

  useEffect(() => {
    FileSystem.readAsStringAsync(SETTINGS_FILE)
      .then(json => {
        const settings = JSON.parse(json);
        if (settings.activeChildId) setActiveChildId(settings.activeChildId);
      })
      .catch(() => {});
    refreshChildren();
  }, [refreshChildren]);

  const setActiveChild = useCallback((id: string | null) => {
    setActiveChildId(id);
    FileSystem.readAsStringAsync(SETTINGS_FILE)
      .then(json => {
        const current = JSON.parse(json);
        return FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify({ ...current, activeChildId: id }));
      })
      .catch(() => FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify({ activeChildId: id })).catch(() => {}));
  }, []);

  const activeChild = childList.find(c => c.id === activeChildId) ?? null;

  return (
    <ChildContext.Provider value={{ children: childList, activeChild, setActiveChild, refreshChildren }}>
      {reactChildren}
    </ChildContext.Provider>
  );
}

export function useChild() {
  return useContext(ChildContext);
}
