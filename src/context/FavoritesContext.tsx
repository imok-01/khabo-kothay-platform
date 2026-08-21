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
import { grantFavouriteReward, grantCuisineDiscovery } from '../lib/rewards';
import { favoritesService } from '../services/favoritesService';
import { restaurantService } from '../services/restaurantService';
import { getSession } from '../store/demoDb';

interface FavoritesContextValue {
  favoriteIds: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  clearFavorites: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const userId = appUser?.id ?? null;

  // Persistence lives behind favoritesService → favoriteRepository
  // (localStorage today; the approved favorites table later).
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => favoritesService.load(userId));

  // Reload favorites when userId changes (e.g., login/logout/user switch)
  useEffect(() => {
    setFavoriteIds(favoritesService.load(userId));
  }, [userId]);

  useEffect(() => {
    favoritesService.save(userId, favoriteIds);
  }, [favoriteIds, userId]);

  const isFavorite = useCallback(
    (id: string) => favoriteIds.includes(id),
    [favoriteIds],
  );

  const toggleFavorite = useCallback((id: string) => {
    const adding = !favoriteIds.includes(id);
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    // Rewards only when a signed-in user ADDS a favourite (never on remove,
    // never for anonymous browsing). Capped at the ledger level.
    if (!adding) return;
    const session = getSession();
    if (!session) return;
    // Use the unified appUser identity for rewards
    if (appUser) {
      grantFavouriteReward(appUser.id);
      const r = restaurantService.getAllSync().find((x) => x.id === id);
      if (r) grantCuisineDiscovery(appUser.id, r.cuisines);
    }
  }, [favoriteIds, appUser]);

  const clearFavorites = useCallback(() => setFavoriteIds([]), []);

  const value = useMemo(
    () => ({ favoriteIds, isFavorite, toggleFavorite, clearFavorites }),
    [favoriteIds, isFavorite, toggleFavorite, clearFavorites],
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return ctx;
}