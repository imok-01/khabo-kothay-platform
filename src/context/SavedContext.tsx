import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { savedRestaurantsService } from '../services/savedRestaurantsService';

interface SavedContextValue {
  savedIds: string[];
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
  clearSaved: () => void;
}

const SavedContext = createContext<SavedContextValue | null>(null);

/**
 * Saved — a bookmark list for quick access, deliberately separate from
 * Favourites (which is a preference signal for recommendations). Persistence
 * lives behind savedRestaurantsService → savedRestaurantRepository
 * (localStorage today; the approved saved_restaurants table later).
 */
export function SavedProvider({ children }: { children: ReactNode }) {
  const [savedIds, setSavedIds] = useState<string[]>(savedRestaurantsService.load);

  useEffect(() => {
    savedRestaurantsService.save(savedIds);
  }, [savedIds]);

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);

  const toggleSaved = useCallback((id: string) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const clearSaved = useCallback(() => setSavedIds([]), []);

  const value = useMemo(
    () => ({ savedIds, isSaved, toggleSaved, clearSaved }),
    [savedIds, isSaved, toggleSaved, clearSaved],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved(): SavedContextValue {
  const ctx = useContext(SavedContext);
  if (!ctx) {
    throw new Error('useSaved must be used within a SavedProvider');
  }
  return ctx;
}
