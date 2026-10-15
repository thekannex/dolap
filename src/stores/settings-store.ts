import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '../core/models/settings';
import { DEFAULT_SETTINGS, mergeSettings } from '../core/project/default-settings';

export interface SettingsStore {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (updates) => set((state) => ({ settings: { ...state.settings, ...updates } })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'dolap-settings',
      version: 1,
      merge: (persisted, current) => ({
        ...current,
        settings: mergeSettings((persisted as Partial<SettingsStore> | undefined)?.settings),
      }),
    },
  ),
);
