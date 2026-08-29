import { useMemo } from 'react';
import { Bookmark, Trash2 } from 'lucide-react';
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
 * `/saved` — the Saved half of Collection.
 *
 * The header, the switcher and the definition of each list all live in
 * `CollectionTabs`, so Saved and Favourites can no longer drift into looking
 * like the same page (they both used to render `<h1>Saved</h1>`). The header
 * renders even when the list is empty — otherwise an empty Saved list stranded
 * you with no route across to Favourites.
 */
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
      <main className="band">
        <div className="band__inner">
          <FetchError onRetry={reload} />
        </div>
      </main>
    );
  }

  const restaurants = data ?? [];
  const saved = restaurants.filter((r) => savedIds.includes(r.id));
  const isEmpty = status === 'ready' && saved.length === 0;

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
    <main>
      <CollectionTabs
        active="saved"
        savedCount={savedIds.length}
        favouriteCount={favoriteIds.length}
        action={
          saved.length > 0 ? (
            /* Clearing wipes a collection built one restaurant at a time, and
               KK has no undo to put it back — so it asks once, in place. */
            <ConfirmButton
              size="sm"
              icon={Trash2}
              confirmLabel="Clear all? Tap again"
              armedAnnouncement="Tap again to clear every saved place."
              onConfirm={clearSaved}
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
              icon={<Bookmark size={34} />}
              title="Nothing saved yet"
              message="Use the bookmark button on any restaurant to keep a shortlist here — a quick way to remember the places you want to try."
              actionLabel="Start exploring"
              actionTo="/explore"
            />
          ) : (
            <div className="c-grid">
              {saved.map((r) => (
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
              eyebrow="More to try"
              title={isEmpty ? <>Somewhere to <em>start</em></> : <>Based on what you've <em>saved</em></>}
              lede={
                isEmpty
                  ? 'A few places matched to your profile, to get the list going.'
                  : 'Matched against your saved list, your favourites and what you have been looking at.'
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
