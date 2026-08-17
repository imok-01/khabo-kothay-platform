import type { Restaurant } from '../types';
import { formatCount, ratingSources } from '../lib/ratings';
import RatingStars from './RatingStars';

interface RatingSourceProps {
  restaurant: Restaurant;
  size?: 'sm' | 'md';
  showCount?: boolean;
}

/**
 * Renders every rating with its source label — a Google rating is never
 * presented as a Khabo Kothay rating, and vice versa. In demo mode only the
 * Khabo Kothay community rating exists (Google data is never fabricated).
 */
export default function RatingSource({ restaurant, size = 'sm', showCount = true }: RatingSourceProps) {
  const rows = ratingSources(restaurant);
  return (
    <span className="rating-sources" role="group" aria-label="Ratings">
      {rows.map((row) => (
        <span key={row.source} className={`rating-source rating-source--${row.source}`}>
          <span className="rating-source__label">{row.label}</span>
          <RatingStars rating={row.rating} size={size} showValue />
          {showCount && (
            <span className="rating-source__count">{formatCount(row.reviewCount)} reviews</span>
          )}
        </span>
      ))}
    </span>
  );
}
