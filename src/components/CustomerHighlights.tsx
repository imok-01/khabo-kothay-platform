import type { CSSProperties } from 'react';
import type { ReviewSample } from '../repositories/reviewSamplesRepository';

// Feature flag — set VITE_ENABLE_REVIEW_HIGHLIGHTS=false to hide entirely (removable in one env var)
const ENABLED = import.meta.env.VITE_ENABLE_REVIEW_HIGHLIGHTS !== 'false';

interface Props {
  samples: ReviewSample[];
  status: 'loading' | 'ready' | 'empty' | 'error';
}

/**
 * The three highlighted Google reviews, as a scroll stack.
 *
 * They used to be three full-width blocks laid end to end, which put ~600px of
 * quotation between the section heading and everything after it and made the
 * page feel like it had been padded. Each card is now `position: sticky` inside
 * the stack, so scrolling deals them into a deck: the card you are reading
 * parks under the nav while the next one slides up over it. Same three
 * reviews, same order, a third of the page height.
 *
 * Two things were dropped rather than restyled:
 *  - an `<h3>` reading "3 highlighted reviews", directly under an `<h2>`
 *    reading "Google reviews", above exactly three review cards;
 *  - a "Google" badge on every card, under a heading whose eyebrow already
 *    says "Verified elsewhere" and whose sub says these came from Google Maps.
 *
 * The stack index in each card's top-right is not decoration — once cards
 * overlap you need to know how deep the deck goes.
 */
export default function CustomerHighlights({ samples, status }: Props) {
  if (!ENABLED) return null;
  if (status === 'empty') return null;
  if (status === 'loading') return null;
  if (status === 'error') return null;
  if (samples.length === 0) return null;

  const shown = samples.slice(0, 3);

  // `--n` is the deck's depth. Each card reserves the slivers that will show
  // below it, and the CSS arithmetic for that reserve needs to know how many
  // cards there are — a sticky card cannot escape its containing block, so
  // without the reserve the deck flattens as it leaves the viewport.
  return (
    <div className="review-stack" aria-label="Highlighted reviews" style={{ '--n': shown.length } as CSSProperties}>
      {shown.map((s, i) => (
        <blockquote
          key={s.id}
          className="review review--external review-stack__card"
          data-testid="customer-highlight"
          style={{ '--i': i } as CSSProperties}
        >
          <div className="review__head">
            <span className="review__avatar" aria-hidden="true">
              {(s.attribution || 'G').charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{s.attribution || 'Google User'}</strong>
            </div>
            <span className="review-stack__count" aria-hidden="true">
              {i + 1}/{shown.length}
            </span>
          </div>
          <p>“{s.reviewText}”</p>
        </blockquote>
      ))}
    </div>
  );
}
