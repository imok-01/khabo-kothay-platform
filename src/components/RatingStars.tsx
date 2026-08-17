interface RatingStarsProps {
  rating: number;
  size?: 'sm' | 'md';
  showValue?: boolean;
}

export default function RatingStars({ rating, size = 'sm', showValue = false }: RatingStarsProps) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span className={`rating ${size === 'md' ? 'rating--md' : ''}`} aria-label={`Rated ${rating} out of 5`}>
      <span className="rating__row rating__row--base" aria-hidden="true">★★★★★</span>
      <span className="rating__row rating__row--fill" style={{ width: `${pct}%` }} aria-hidden="true">
        ★★★★★
      </span>
      {showValue && <span className="rating__value">{rating.toFixed(1)}</span>}
    </span>
  );
}
