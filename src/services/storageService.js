import { buildInitialSeedState, SEED_VERSION } from '../data/seedData';

const STORAGE_KEY = 'suvidh_erp_state_v1';

export const storageService = {
  loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seed = buildInitialSeedState();
        this.saveState(seed);
        return seed;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== SEED_VERSION) {
        const seed = buildInitialSeedState();
        this.saveState(seed);
        return seed;
      }
      return parsed;
    } catch {
      return buildInitialSeedState();
    }
  },

  saveState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  },

  resetToSeed() {
    const seed = buildInitialSeedState();
    this.saveState(seed);
    return seed;
  },

  loadPreference(key, defaultValue) {
    try {
      const raw = window.localStorage.getItem(`suvidh_erp_pref_${key}`);
      return raw !== null ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  savePreference(key, value) {
    try {
      window.localStorage.setItem(`suvidh_erp_pref_${key}`, JSON.stringify(value));
    } catch {
      // Ignore storage quota issues in demo environment
    }
  },
};
