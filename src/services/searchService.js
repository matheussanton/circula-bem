import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'search_history';

export const saveSearch = async ({ q = '', center = null, categoryId = null, radiusKm = 25 }) => {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const entry = {
      q,
      center,
      categoryId,
      radiusKm,
      ts: Date.now(),
    };
    // Deduplicate by q+categoryId+center+radius
    const filtered = arr.filter(e =>
      !(e.q === entry.q &&
        (e.categoryId || null) === (entry.categoryId || null) &&
        JSON.stringify(e.center || null) === JSON.stringify(entry.center || null) &&
        (e.radiusKm || 25) === (entry.radiusKm || 25))
    );
    const next = [entry, ...filtered].slice(0, 20);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {}
};

export const getRecentSearches = async (limit = 5) => {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return arr.slice(0, limit);
  } catch {
    return [];
  }
};

export const clearSearchHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {}
};

