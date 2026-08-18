import { useMemo } from 'react';
import { Bookmark } from 'lucide-react';
import type { Restaurant } from '../types';
import type { RecommendationContext } from '../domain/recommendation';
import { topMatches } from '../hooks/useRecommendations';
import { derivePreferences, mergeProfileIntoPreferences } from '../lib/preferences';
import { usePageTitle } from '../lib/usePageTitle';
import { useSaved } from '../context/SavedContext';
import { useFavorites } from '../context/FavoritesContext';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import { useAuth } from '../context/AuthContext';
import { useRestaurants } from '../hooks/useRestaurants';
import RestaurantCard from '../components/RestaurantCard';
import EmptyState from '../components/EmptyState';
import SectionHeading from '../components/SectionHeading';
import FetchError from '../components/FetchError';
import { SkeletonGrid } from '../components/Skeleton';

export default function SavedPage() {
  const { savedIds, clearSaved } = useSaved();
  const { favoriteIds } = useFavorites();
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
  const saved = restaurants.filter((r) => savedIds.includes(r.id));

  if (status === 'ready' && saved.length === 0) {
    return (
      <main className="section">
        <div className="section__inner">
          <EmptyState
            icon={<Bookmark size={34} />}
            title="Nothing saved yet"
            message="Use the bookmark button on any restaurant to keep a shortlist here — a quick way to remember the places you want to try."
            actionLabel="Start exploring"
            actionTo="/explore"
          />
        </div>
      </main>
    );
  }

  // A light "because you saved these" signal — built only from the user's own
  // saved list, with their favourites/recently-viewed preference signals.
  const ctx: RecommendationContext = {
    favorites: restaurants.filter((r) => favoriteIds.includes(r.id)),
    recentlyViewed: recentIds
      .map((id) => restaurants.find((r) => r.id === id))
      .filter((r): r is Restaurant => Boolean(r)),
    preferredCuisines: preferences.preferredCuisines,
    preferredBudget: preferences.preferredBudget,
    vegPref: preferences.vegPref,
    preferredNeighbourhoods: user?.profile.neighbourhoods,
    diningInterests: user?.profile.diningInterests,
  };
  const recommendations = topMatches(restaurants, ctx, 4).filter(
    ({ restaurant }) => !savedIds.includes(restaurant.id),
  );

  return (
    <main className="section">
      <div className="section__inner">
        <div className="favorites-head">
          <div>
            <span className="section-heading__eyebrow">Your bookmarks</span>
            <h1>Saved</h1>
            <p>
              {status === 'loading' && !data
                ? 'Loading…'
                : `${saved.length} ${saved.length === 1 ? 'restaurant' : 'restaurants'} saved`}
            </p>
          </div>
          {saved.length > 0 && (
            <button type="button" className="btn btn--ghost" onClick={clearSaved}>
              Clear all
            </button>
          )}
        </div>

        {status === 'loading' && !data ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="grid">
            {saved.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}

        {status === 'ready' && recommendations.length > 0 && (
          <div className="favorites-recs">
            <SectionHeading
              eyebrow="More to try"
              title="Based on what you've saved"
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
