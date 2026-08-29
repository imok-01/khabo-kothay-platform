import { useMemo } from 'react';
import { Heart, Trash2 } from 'lucide-react';
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
import CollectionTabs from '../components/CollectionTabs';
import BandHead from '../components/BandHead';
import FetchError from '../components/FetchError';
import { SkeletonGrid } from '../components/Skeleton';
import { ConfirmButton } from '../components/ui';

/**
 * `/favorites` — the Favourites half of Collection.
 *
 * This page previously set the document title to "Saved" and rendered
 * `<h1>Saved</h1>`, which made it indistinguishable from `/saved` in the tab
 * bar, in browser history and on the page itself. It is the curated list, and
 * it now says so.
 */
export default function FavoritesPage() {
  const { favoriteIds, clearFavorites } = useFavorites();
  const { savedIds } = useSaved();
  const { recentIds } = useRecentlyViewed();
  const { user } = useAuth();
  const { status, data, reload } = useRestaurants();
  usePageTitle('Favourites');

  const preferences = useMemo(() => {
    const derived = derivePreferences(favoriteIds, recentIds);
    return mergeProfileIntoPreferences(derived, user?.profile);
  }, [favoriteIds, recentIds, user?.profile]);

  if (status === 'error' && !data) {
    return (
      <main className="band">
        <div className="band__inner">
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
  const isEmpty = status === 'ready' && favs.length === 0;

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

  return (
    <main>
      <CollectionTabs
        active="favourites"
        savedCount={savedIds.length}
        favouriteCount={favoriteIds.length}
        action={
          favs.length > 0 ? (
            <ConfirmButton
              size="sm"
              icon={Trash2}
              confirmLabel="Clear all? Tap again"
              armedAnnouncement="Tap again to clear every favourite."
              onConfirm={clearFavorites}
            >
              Clear all
            </ConfirmButton>
          ) : undefined
        }
      />

      <section className="band band--tight">
        <div className="band__inner">
          {status === 'loading' && !data ? (
            <SkeletonGrid count={4} />
          ) : isEmpty ? (
            <EmptyState
              icon={<Heart size={34} />}
              title="No favourites yet"
              message="Tap the heart on a restaurant you would genuinely recommend. Favourites is the strongest signal you can give us — your matches sharpen as the list grows."
              actionLabel="Browse your saved list"
              actionTo="/saved"
            />
          ) : (
            <div className="c-grid">
              {favs.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} />
              ))}
            </div>
          )}
        </div>
      </section>

      {status === 'ready' && recommendations.length > 0 && (
        <section className="band band--ruled">
          <div className="band__inner">
            <BandHead
              eyebrow="Getting to know your taste"
              title={isEmpty ? <>Start your <em>shortlist</em></> : <>Because you <em>liked these</em></>}
              lede={
                isEmpty
                  ? 'A few matches to consider — heart the ones worth keeping.'
                  : 'Scored against your favourites, with the reasons each one matched.'
              }
              action={{ label: 'Explore more', to: '/explore' }}
            />
            <div className="c-grid">
              {recommendations.map(({ restaurant, match }) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} match={match} personalized />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
