import { useState, type FormEvent } from 'react';
import { Star, Pencil, Trash2, Check } from 'lucide-react';
import type { Restaurant } from '../types';
import { useAuth } from '../context/AuthContext';
import { uid } from '../lib/uid';
import type { UserReview } from '../domain/review';
import { reviewService } from '../hooks/useReviews';
import { grantFirstReviewReward } from '../lib/rewards';
import { Button, Chip, Field } from './ui';

const RATING_LABELS = ['', 'Dreadful', 'Meh', 'Okay', 'Good', 'Excellent'];

/**
 * Writing your own review of a venue.
 *
 * Every layer under this component says review and always has: the entity is
 * `UserReview`, the service is documented "KK community reviews only", the
 * repository interface is `ReviewRepository`, the payload carries a 1–5
 * rating with word labels, `favoriteDishes`, `visitStatus` and `helpfulCount`,
 * and saving one grants `grantFirstReviewReward`. Only the copy here had
 * drifted to "note", which made a five-star review form read like a scratchpad
 * and left the page with two vocabularies for one feature.
 *
 * The one true caveat — these are stored on the device and not published yet,
 * because every sync path still writes to the local store — is stated ONCE, by
 * the section heading on the page. It used to appear six times between here and
 * there, which is how a disclosure becomes noise instead of honesty.
 */

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
          <Star size={14} aria-hidden="true" /> Been to {restaurant.name}?{' '}
          <a href={`/login`} onClick={(e) => { e.preventDefault(); window.location.href = '/login'; }}>Sign in</a> to write your review.
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
        <p><Check size={14} aria-hidden="true" /> Your review is saved.</p>
        <div className="write-review__actions">
          <Button
            variant="ghost"
            size="sm"
            icon={Pencil}
            onClick={() => { setRating(mine.rating); setComment(mine.comment); setDish(mine.favoriteDishes?.[0] ?? ''); setOpen(true); }}
          >
            Edit
          </Button>
          {/* `danger`, not `subtle`: deleting your own note is the destructive
              half of this pair, and subtle is the paint of a benign text
              action. Quiet at rest, red the moment you reach for it. */}
          <Button variant="danger" size="sm" icon={Trash2} onClick={remove}>
            Delete
          </Button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="write-review">
        <Button variant="ghost" size="sm" icon={Star} onClick={() => setOpen(true)}>
          Write your review
        </Button>
      </div>
    );
  }

  return (
    <form className="write-review write-review--form" onSubmit={submit}>
      {/* `Field group`, not a hand-written `.field__label`. The visible label
          said "Your rating" while the group's own `aria-label` said "Rating" —
          two names for one question, and the one a screen reader read was the
          one nobody could see. The label owns the name now, so they cannot
          drift apart again. */}
      <Field label="Your rating" group>
        <div className="rating-input" role="radiogroup">
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
      </Field>

      <Field label="Your review" error={error}>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder={`What was ${restaurant.name} really like?`} />
      </Field>

      {/* The chips announced nothing: a screen reader arrived at "I visited /
          Not yet" with no trace of the question. `role="group"` is the honest
          role — these two are a toggle pair, not radios, since either can be
          left unset. */}
      <Field label="Did you visit?" group>
        <div className="chip-row" role="group">
          <Chip size="sm" selected={visited === true} onClick={() => setVisited(true)}>I visited</Chip>
          <Chip size="sm" selected={visited === false} onClick={() => setVisited(false)}>Not yet</Chip>
        </div>
      </Field>

      <Field label="Favourite dish" optional>
        <input value={dish} onChange={(e) => setDish(e.target.value)} placeholder="e.g. Mutton Biryani" />
      </Field>

      <div className="write-review__actions">
        <Button type="submit" variant="primary" size="sm" icon={Check}>Save review</Button>
        <Button variant="subtle" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
