/**
 * Loading skeletons that mirror the shape of the content they replace,
 * so async fetches never cause layout jumps or blank pages.
 */

export function SkeletonCard() {
  return (
    <article className="card" aria-hidden="true">
      <div className="skeleton skeleton--art" />
      <div className="card__body">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line skeleton--short" />
        <div className="card__meta">
          <div className="skeleton skeleton--chip" />
          <div className="skeleton skeleton--chip" />
        </div>
      </div>
    </article>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid" aria-label="Loading restaurants" role="status">
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
            {Array.from({ length: 4 }, (_, i) => (
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
    <div className="grid" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
