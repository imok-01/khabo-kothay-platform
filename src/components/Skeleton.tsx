/**
 * Loading skeletons that mirror the shape of the content they replace,
 * so async fetches never cause layout jumps or blank pages.
 */

/**
 * Mirrors the Phase C `rcard`: 4:3 media, then name, tagline, the intelligence
 * line and the facts row. The shape has to track the real card or the page
 * visibly resettles when data lands.
 */
export function SkeletonCard() {
  return (
    <article className="rcard" aria-hidden="true">
      <div className="rcard__media">
        <div className="skeleton skeleton--art" />
      </div>
      <div className="rcard__body">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line skeleton--short" />
        <div className="rcard__intel">
          <div className="skeleton skeleton--chip" />
          <div className="skeleton skeleton--chip" />
        </div>
        <div className="rcard__facts">
          <div className="skeleton skeleton--line skeleton--short" />
        </div>
      </div>
    </article>
  );
}

/**
 * Mirrors the homepage recommendation spread: one editorial lead beside a
 * column of three compact cards.
 *
 * `SkeletonGrid` used to stand in for it, and a four-up grid of vertical cards
 * is not the shape of a two-column asymmetric spread — so the fresh load
 * painted one layout, then replaced it with a different one at the moment the
 * fetch resolved. The section changed both its column structure and its height
 * mid-load, which is the flash. Here the wrappers, the variants and the media
 * aspect ratios are the real ones, so data arriving only fills in a layout that
 * was already standing.
 *
 * Nothing in it is sized from text: the media boxes are aspect-ratio driven and
 * every line is a fixed-height bar, so its height is the same on every load.
 *
 * `personalized` is the one thing it has to be told. The lead card's foot is a
 * 22px match row when the match rests on real signals and a single 19.44px
 * nudge line when it does not — 2.56px apart, which is a visible resettle on
 * the swap if the fallback guesses. It is not a guess: `personalized` comes
 * from favourites, recents and stored preferences, all of which are in hand
 * before the restaurant fetch resolves, so the fallback can be right rather
 * than average.
 */
export function SkeletonSpread({ personalized = false }: { personalized?: boolean }) {
  return (
    <div className="spread" role="status" aria-label="Loading recommendations">
      <article
        className={`rcard rcard--editorial rcard--skeleton ${personalized ? '' : 'rcard--skeleton-nudge'}`}
        aria-hidden="true"
      >
        <div className="rcard__media">
          <div className="skeleton skeleton--image" />
          {/* The lead card's name and tagline sit on the photo, not under it. */}
          <div className="rcard__overlay">
            <div className="skeleton skeleton--title skeleton--wide" />
            <div className="skeleton skeleton--line" />
          </div>
        </div>
        <div className="rcard__body">
          <div className="rcard__intel">
            <div className="skeleton skeleton--chip" />
            <div className="skeleton skeleton--chip" />
            <div className="skeleton skeleton--chip" />
          </div>
          {/* Where on the left, the two-line spend cluster on the right — the
              same two boxes the real facts row carries, so the row that decides
              this card's height is the same shape here as there. */}
          <div className="rcard__facts">
            <div className="skeleton skeleton--line skeleton--short" />
            <div className="rcard__price">
              <div className="skeleton skeleton--price" />
              <div className="skeleton skeleton--price-note" />
            </div>
          </div>
        </div>
        {/* The foot is always present on a lead card here — it carries either the
            match explanation or the profile nudge. */}
        <div className="rcard__foot">
          <div className="skeleton skeleton--line skeleton--short" />
        </div>
      </article>
      <div className="spread__rest">
        {Array.from({ length: 3 }, (_, i) => (
          <article key={i} className="rcard rcard--compact rcard--skeleton" aria-hidden="true">
            <div className="rcard__media">
              <div className="skeleton skeleton--image" />
            </div>
            <div className="rcard__body">
              <div className="rcard__head">
                <div className="skeleton skeleton--title" />
              </div>
              <div className="skeleton skeleton--line" />
              <div className="rcard__intel">
                <div className="skeleton skeleton--chip" />
                <div className="skeleton skeleton--chip" />
              </div>
              <div className="rcard__facts">
                <div className="skeleton skeleton--line skeleton--short" />
              </div>
            </div>
          </article>
        ))}
      </div>
      {/* `.sr-only` is absolutely positioned, so this is not a grid item and
          cannot open a third track in the spread. */}
      <span className="sr-only">Loading recommendations…</span>
    </div>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="c-grid" aria-label="Loading restaurants" role="status">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
      <span className="sr-only">Loading restaurants…</span>
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="detail" aria-busy="true" aria-label="Loading restaurant">
      <div className="skeleton skeleton--back" />
      <div className="detail__hero">
        <div className="skeleton skeleton--hero" />
        <div className="detail__head">
          <div className="skeleton skeleton--title skeleton--wide" />
          <div className="skeleton skeleton--line skeleton--short" />
          <div className="skeleton skeleton--line" />
          <div className="detail__stats">
            {/* Three cells — the decision bar renders exactly three facts
                (spend, where, open now). A four-cell skeleton would promise
                a column that never arrives. */}
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton skeleton--stat" />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading restaurant…</span>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="c-grid" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
