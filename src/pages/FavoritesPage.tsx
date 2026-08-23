import { useMemo } from 'react';
import { Heart } from 'lucide-react';
import type { Restaurant } from '../types';
import type { RecommendationContext } from '../domain/recommendation';
import { topMatches } from '../hooks/useRecommendations';
import { derivePreferences, mergeProfileIntoPreferences } from '../lib/preferences';
import { usePageTitle } from '../lib/usePageTitle';
import { useFavorites } from '../context/FavoritesContext';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import { useAuth } from '../context/AuthContext';
import { useRestaurants } from '../hooks/useRestaurants';
import RestaurantCard from '../components/RestaurantCard';
import EmptyState from '../components/EmptyState';
import SectionHeading from '../components/SectionHeading';
import FetchError from '../components/FetchError';
import { SkeletonGrid } from '../components/Skeleton';

export default function FavoritesPage() {
  const { favoriteIds, clearFavorites } = useFavorites();
  const { recentIds } = useRecentlyViewed();
  const { user } = useAuth();
  const { status, data, reload } = useRestaurants();
  usePageTitle('Saved');

  const preferences = useMemo(() => {
    const derived = derivePreferences(favoriteIds, recentIds);
    return mergeProfileIntoPreferences(derived, user?.profile);
  }, [favoriteIds, recentIds, user?.profile]);

  if (status === 'error' && !data) {
    return (
      <main className="section">
        <div className="section__inner">
          <FetchError onRetry={reload} />
        </div>
      </main>
    );
  }

  const restaurants = data ?? [];
  const favs = restaurants.filter((r) => favoriteIds.includes(r.id));
  const recents = recentIds
    .map((id) => restaurants.find((r) => r.id === id))
    .filter((r): r is Restaurant => Boolean(r));

  const ctx: RecommendationContext = {
    favorites: favs,
    recentlyViewed: recents,
    preferredCuisines: preferences.preferredCuisines,
    preferredBudget: preferences.preferredBudget,
    vegPref: preferences.vegPref,
    preferredNeighbourhoods: user?.profile.neighbourhoods,
    diningInterests: user?.profile.diningInterests,
  };
  const recommendations = topMatches(restaurants, ctx, 4).filter(
    ({ restaurant }) => !favoriteIds.includes(restaurant.id),
  );

  if (status === 'ready' && favs.length === 0) {
    return (
      <main className="section">
        <div className="section__inner">
          <EmptyState
            icon={<Heart size={34} />}
            title="No saved places yet"
            message="Tap the heart on any restaurant to save it here — and we'll learn what you like to recommend better spots."
            actionLabel="Start exploring"
            actionTo="/explore"
          />
        </div>
      </main>
    );
  }

  return (
    <main className="section">
      <div className="section__inner">
        <div className="favorites-head">
          <div>
            <span className="section-heading__eyebrow">Your shortlist</span>
            <h1>Saved</h1>
            <p>
              {status === 'loading' && !data
                ? 'Loading…'
                : `${favs.length} ${favs.length === 1 ? 'restaurant' : 'restaurants'} saved`}
            </p>
          </div>
          {favs.length > 0 && (
            <button type="button" className="btn btn--ghost" onClick={clearFavorites}>
              Clear all
            </button>
          )}
        </div>

        {status === 'loading' && !data ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid">
            {favs.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}

        {status === 'ready' && recommendations.length > 0 && (
          <div className="favorites-recs">
            <SectionHeading
              eyebrow="We're getting to know your taste"
              title="Because you liked these"
              action={{ label: 'Explore more', to: '/explore' }}
            />
            <div className="grid">
              {recommendations.map(({ restaurant, match }) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} match={match} personalized />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
