import { useState, type FormEvent } from 'react';
import { Star, Pencil, Trash2, Check } from 'lucide-react';
import type { Restaurant } from '../types';
import { useAuth } from '../context/AuthContext';
import { uid } from '../lib/uid';
import type { UserReview } from '../domain/review';
import { reviewService } from '../hooks/useReviews';
import { grantFirstReviewReward } from '../lib/rewards';
import { DEFAULT_REWARD_CONFIG } from '../domain/rewards';

const RATING_LABELS = ['', 'Dreadful', 'Meh', 'Okay', 'Good', 'Excellent'];

interface WriteReviewProps {
  restaurant: Restaurant;
  onChanged: () => void;
}

export default function WriteReview({ restaurant, onChanged }: WriteReviewProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [visited, setVisited] = useState<boolean | undefined>(undefined);
  const [dish, setDish] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="write-review write-review--locked">
        <p>
          <Star size={13} aria-hidden="true" /> Love this place?{' '}
          <a href={`/login`} onClick={(e) => { e.preventDefault(); window.location.href = '/login'; }}>Sign in</a> to leave a Khabo Kothay review.
        </p>
      </div>
    );
  }

  const mine = reviewService.getForRestaurant(restaurant.id).find((r) => r.userId === user.id);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (comment.trim().length < 10) {
      setError('Please write at least a sentence (10+ characters).');
      return;
    }
    const review: UserReview = {
      id: mine?.id ?? uid('ur'),
      restaurantId: restaurant.id,
      userId: user.id,
      author: user.name,
      rating,
      date: new Date().toISOString().slice(0, 10),
      comment: comment.trim(),
      visitStatus: visited === true ? 'visited' : undefined,
      favoriteDishes: dish.trim() ? [dish.trim()] : undefined,
      helpfulCount: mine?.helpfulCount ?? 0,
      edited: Boolean(mine),
    };
    reviewService.upsert(review);
    if (!mine) {
      // The review reward is one-time-only per user, enforced by the ledger.
      grantFirstReviewReward(user.id);
    }
    setComment('');
    setDish('');
    setVisited(undefined);
    setError(null);
    setOpen(false);
    onChanged();
  };

  const remove = () => {
    if (!mine) return;
    reviewService.remove(mine.id);
    onChanged();
  };

  if (mine) {
    return (
      <div className="write-review write-review--done">
        <p><Check size={13} aria-hidden="true" /> You reviewed this place — thanks! <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>(+{DEFAULT_REWARD_CONFIG.review} tokens once, for your first review)</span></p>
        <div className="write-review__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setRating(mine.rating); setComment(mine.comment); setDish(mine.favoriteDishes?.[0] ?? ''); setOpen(true); }}>
            <Pencil size={12} aria-hidden="true" /> Edit
          </button>
          <button type="button" className="btn btn--subtle btn--sm" onClick={remove}>
            <Trash2 size={12} aria-hidden="true" /> Delete
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="write-review">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(true)}>
          <Star size={12} aria-hidden="true" /> Write a review
        </button>
        <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>Earn +{DEFAULT_REWARD_CONFIG.review} tokens for your first review</span>
      </div>
    );
  }

  return (
    <form className="write-review write-review--form" onSubmit={submit}>
      <div className="write-review__row">
        <span className="field__label">Your rating</span>
        <div className="rating-input" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? '' : 's'} — ${RATING_LABELS[n]}`}
              className={`rating-input__star ${n <= rating ? 'rating-input__star--on' : ''}`}
              onClick={() => setRating(n)}
            >
              <Star size={20} fill={n <= rating ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          ))}
          <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{RATING_LABELS[rating]}</span>
        </div>
      </div>

      <label className="field">
        <span className="field__label">Your review</span>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder={`What was ${restaurant.name} really like?`} />
      </label>

      <div className="write-review__row">
        <span className="field__label">Did you visit?</span>
        <div className="chip-row">
          <button type="button" className={`chip chip--toggle ${visited === true ? 'chip--on' : ''}`} onClick={() => setVisited(true)} aria-pressed={visited === true}>I visited</button>
          <button type="button" className={`chip chip--toggle ${visited === false ? 'chip--on' : ''}`} onClick={() => setVisited(false)} aria-pressed={visited === false}>Not yet</button>
        </div>
      </div>

      <label className="field">
        <span className="field__label">Favourite dish (optional)</span>
        <input value={dish} onChange={(e) => setDish(e.target.value)} placeholder="e.g. Mutton Biryani" />
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="write-review__actions">
        <button type="submit" className="btn btn--primary btn--sm">Submit review</button>
        <button type="button" className="btn btn--subtle btn--sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      <p className="t-xs" style={{ color: 'var(--ink-faint)' }}>
        Your review belongs to Khabo Kothay — it is not sent to Google and won't affect Google ratings.
      </p>
    </form>
  );
}
