import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../context/AuthContext';
import { savedRestaurantsService } from '../services/savedRestaurantsService';

interface SavedContextValue {
  savedIds: string[];
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
  clearSaved: () => void;
}

const SavedContext = createContext<SavedContextValue | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const userId = appUser?.id ?? null;

  // Persistence lives behind savedRestaurantsService → savedRestaurantRepository
  // (localStorage today; the approved saved_restaurants table later).
  const [savedIds, setSavedIds] = useState<string[]>(() => savedRestaurantsService.load(userId));

  // Reload saved restaurants when userId changes (e.g., login/logout/user switch)
  useEffect(() => {
    setSavedIds(savedRestaurantsService.load(userId));
  }, [userId]);

  useEffect(() => {
    savedRestaurantsService.save(userId, savedIds);
  }, [savedIds, userId]);

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