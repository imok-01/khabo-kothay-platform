import { Link } from 'react-router-dom';
import { MapPin, Clock, Banknote, Scale, Heart, Bookmark } from 'lucide-react';
import type { Restaurant } from '../types';
import { priceForTwoDisplay } from '../lib/priceDisplay';
import { formatDistance } from '../lib/geo';
import { openNowLabel } from '../lib/openHours';
import { useFavorites } from '../context/FavoritesContext';
import { useSaved } from '../context/SavedContext';
import { useCompare } from '../context/CompareContext';
import { getOffersForRestaurant, OFFERS_ENABLED } from '../hooks/useOffers';
import { track } from '../lib/analytics';
import type { MatchResult } from '../domain/recommendation';
import { selectRestaurantPhotos } from '../lib/photos';
import RestaurantImage from './RestaurantImage';
import RatingSource from './RatingSource';
import MatchIndicator from './MatchIndicator';

interface RestaurantCardProps {
  restaurant: Restaurant;
  distanceKm?: number;
  match?: MatchResult;
  highlighted?: boolean;
  /** true when the match is built from real user signals (profile/favourites) */
  personalized?: boolean;
  /** true when an explicit search intent (builder/filters) is active */
  intentActive?: boolean;
  /** visual variant: featured (large editorial), standard, compact (horizontal) */
  variant?: 'featured' | 'standard' | 'compact';
}

export default function RestaurantCard({ restaurant, distanceKm, match, highlighted = false, personalized = false, intentActive = false, variant = 'standard' }: RestaurantCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isSaved, toggleSaved } = useSaved();
  const { isComparing, toggleCompare } = useCompare();
  const fav = isFavorite(restaurant.id);
  const saved = isSaved(restaurant.id);
  const comparing = isComparing(restaurant.id);
  const openStatus = openNowLabel(restaurant.openingHours);
  const offers = OFFERS_ENABLED ? getOffersForRestaurant(restaurant.id) : [];
  const image = selectRestaurantPhotos(restaurant, 'card').photos[0];
  const price = priceForTwoDisplay(restaurant);

  return (
    <article className={`card card--${variant} ${highlighted ? 'card--highlighted' : ''}`}>
      <Link
        to={`/restaurant/${restaurant.id}`}
        className="card__link"
        aria-label={`View ${restaurant.name}`}
        onClick={() => track('result_clicked', { id: restaurant.id })}
      >
        <div className="card__media">
          <RestaurantImage source={image} name={restaurant.name} width={640} />
          {restaurant.khabo.featured && <span className="card__badge">Featured</span>}
          {offers.length > 0 && <span className="card__offer-badge">{offers[0].discountLabel}</span>}
          {!restaurant.vegUnknown && (
            <span className={`veg-badge veg-badge--corner ${restaurant.isVeg ? 'veg-badge--veg' : 'veg-badge--nonveg'}`}>
              {restaurant.isVeg ? 'VEG' : 'NON-VEG'}
            </span>
          )}
        </div>
        <div className="card__body">
          <div className="card__row">
            <h3 className="card__name">{restaurant.name}</h3>
            <span className="card__rating">
              <RatingSource restaurant={restaurant} showCount={false} />
            </span>
          </div>
          {restaurant.tagline && <p className="card__tagline">{restaurant.tagline}</p>}
          <div className="card__chips">
            {restaurant.cuisines.slice(0, 2).map((c) => (
              <span key={c} className="chip">{c}</span>
            ))}
            {restaurant.mealTypes[0] && <span className="chip chip--meal">{restaurant.mealTypes[0]}</span>}
          </div>
          <div className="card__meta">
            <span className="card__meta-item">
              <MapPin size={13} aria-hidden="true" /> {restaurant.location || 'Dhaka'}
              {distanceKm !== undefined && <span className="card__distance"> · {formatDistance(distanceKm)}</span>}
            </span>
            <span className="card__meta-item">
              <Banknote size={13} aria-hidden="true" />
              {price.label}
            </span>
            {openStatus && (
              <span className={`open-badge ${openStatus === 'Open now' ? 'open-badge--yes' : ''}`}>
                <Clock size={11} style={{ verticalAlign: '-1px' }} aria-hidden="true" /> {openStatus}
              </span>
            )}
          </div>
        </div>
      </Link>
      {/* Match explanation lives OUTSIDE the card link so its button never
          hijacks the navigation to the restaurant page. */}
      {match && (
        <div className="card__match-zone">
          {personalized ? (
            <MatchIndicator match={match} mode="personal" />
          ) : intentActive ? (
            <MatchIndicator match={match} mode="search" />
          ) : (
            <div className="card__match">
              <span className="card__match-nudge">Complete your profile for personalised matches.</span>
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        className={`fav-btn ${fav ? 'fav-btn--active' : ''}`}
        onClick={() => toggleFavorite(restaurant.id)}
        aria-label={fav ? `Remove ${restaurant.name} from favourites` : `Add ${restaurant.name} to favourites`}
        aria-pressed={fav}
      >
        <Heart size={16} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`save-btn ${saved ? 'save-btn--active' : ''}`}
        onClick={() => toggleSaved(restaurant.id)}
        aria-label={saved ? `Remove ${restaurant.name} from saved` : `Save ${restaurant.name} for later`}
        aria-pressed={saved}
      >
        <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`compare-btn ${comparing ? 'compare-btn--active' : ''}`}
        onClick={() => toggleCompare(restaurant.id)}
        aria-pressed={comparing}
        aria-label={comparing ? `Remove ${restaurant.name} from comparison` : `Add ${restaurant.name} to comparison`}
      >
        <Scale size={14} aria-hidden="true" />
      </button>
    </article>
  );
}
