import { useMemo, useState, type CSSProperties } from 'react';
import { TrendingUp, TrendingDown, Minus, CalendarClock, BadgeCheck, LineChart } from 'lucide-react';
import type { MenuItem, PriceChange } from '../domain/menu';
import { formatCurrency } from '../lib/format';
import { Dialog } from './ui';
import {
  PRICE_RANGES,
  observationsInRange,
  priceStats,
  chartPoints,
  formatLongDate,
  priceInterpretation,
  type PriceRange,
} from '../lib/priceIntelligence';

export interface DishPriceHistoryProps {
  dish: MenuItem;
  change: PriceChange | undefined;
  onClose: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  restaurant: 'Restaurant provided',
  website: 'Restaurant website',
  verified: 'Verified menu',
  'khabo-recorded': 'Khabo Kothay recorded',
  other: 'Other permitted source',
};

/**
 * Price intelligence for one dish.
 *
 * The data layer was already the interesting part — every point on the chart is
 * a real recorded observation, a range is only offered when it holds two or
 * more of them, and a single value is never expanded into a fake band. The
 * presentation did not say so: a flat card, a corner-to-corner polyline on a
 * gridless field, three grey boxes, and the time-range switcher scrolling away
 * with the content it controlled.
 *
 * What changed:
 *  - the range switcher moved into `Dialog`'s `toolbar` slot and the caveat
 *    into `footer`, so the control that filters the body is pinned above it and
 *    the disclaimer is pinned below it — neither can scroll out of sight;
 *  - the current price became the hero figure, with the delta as a pill and one
 *    line of provenance ("Tracked since …, N observations") that is counted,
 *    not asserted;
 *  - the chart got a baseline grid, a gradient field, and a Catmull-Rom curve
 *    instead of straight segments between points;
 *  - the curve draws itself in, then the dots land in sequence — all of it
 *    behind `prefers-reduced-motion`, all of it CSS, no scroll or timer
 *    listeners.
 *
 * The numbers are untouched: same `observationsInRange`, same `priceStats`,
 * same `chartPoints`, same interpretation copy.
 */
export default function DishPriceHistory({ dish, change, onClose }: DishPriceHistoryProps) {
  const [range, setRange] = useState<PriceRange>('All');

  const sorted = useMemo(() => [...dish.priceHistory].sort((a, b) => a.at.localeCompare(b.at)), [dish.priceHistory]);

  // A range is only offered when it contains enough real observations —
  // never fabricate data to fill a period.
  const rangeUsable = useMemo(() => {
    const usable: Record<PriceRange, boolean> = { '1M': false, '3M': false, '6M': false, All: true };
    for (const r of PRICE_RANGES) {
      if (r === 'All') continue;
      usable[r] = observationsInRange(sorted, r).length >= 2;
    }
    return usable;
  }, [sorted]);

  const visible = useMemo(() => observationsInRange(sorted, range), [sorted, range]);
  const stats = priceStats(visible);
  const points = chartPoints(visible);
  const interpretation = priceInterpretation(visible, dish.price);

  const pct = change?.percentChange;
  const minPrice = stats ? stats.lowest : 0;
  const maxPrice = stats ? stats.highest : 0;
  const deltaTone = pct === undefined || pct === 0 ? 'flat' : pct > 0 ? 'up' : 'down';
  const DeltaIcon = deltaTone === 'flat' ? Minus : deltaTone === 'up' ? TrendingUp : TrendingDown;

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      eyebrow="Price intelligence"
      title={dish.name}
      closeLabel="Close price history"
      toolbar={
        /* Pinned above the body by `Dialog`, because a filter that scrolls
           away from what it filters is a control you have to go looking for. */
        <div className="price-range" role="group" aria-label="Time range">
          {PRICE_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={`price-range__btn ${range === r ? 'price-range__btn--active' : ''}`}
              disabled={!rangeUsable[r]}
              aria-disabled={!rangeUsable[r]}
              title={rangeUsable[r] ? undefined : 'Not enough recorded observations in this period'}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      }
      footer={
        <p className="price-modal__caveat">
          <CalendarClock size={12} aria-hidden="true" /> Based on recorded observations. History may be
          incomplete — and is demo data.
        </p>
      }
    >
      <div className="price-hero">
        <div className="price-hero__main">
          <span className="price-hero__label">Current price</span>
          <strong className="price-hero__figure">{formatCurrency(dish.price)}</strong>
        </div>
        {change && change.previousPrice !== undefined && (
          <span className={`price-delta price-delta--${deltaTone}`}>
            <DeltaIcon size={13} aria-hidden="true" />
            {change.absoluteChange !== undefined && change.absoluteChange !== 0
              ? `${change.absoluteChange > 0 ? '+' : ''}${formatCurrency(change.absoluteChange)} · ${change.percentChange}%`
              : 'No change'}
            <span className="price-delta__vs">vs previous recorded</span>
          </span>
        )}
        {sorted.length > 0 && (
          /* Counted, not claimed. This line is the reason to trust the chart,
             so it states the sample it was drawn from. */
          <span className="price-hero__provenance">
            Tracked since {formatLongDate(sorted[0].at)} · {sorted.length} recorded{' '}
            {sorted.length === 1 ? 'observation' : 'observations'}
          </span>
        )}
      </div>

      {/* Line graph — plots only actual recorded observations. */}
      <div className="price-chart" aria-label="Recorded price observations over time">
        {points.length >= 2 ? (
          <PriceChart points={points} minPrice={minPrice} maxPrice={maxPrice} />
        ) : (
          <p className="price-chart__empty">
            {points.length === 1
              ? `Only one observation recorded in this period (${formatLongDate(points[0].at)}).`
              : 'No recorded observations in this period.'}
          </p>
        )}
      </div>

      {stats && (
        <div className="price-stats" aria-label="Price summary">
          <div className="price-stat"><span>Lowest recorded</span><strong>{formatCurrency(stats.lowest)}</strong></div>
          <div className="price-stat price-stat--mid"><span>Average recorded</span><strong>{formatCurrency(stats.average)}</strong></div>
          <div className="price-stat"><span>Highest recorded</span><strong>{formatCurrency(stats.highest)}</strong></div>
        </div>
      )}

      {visible.length > 0 && (
        <div className="price-interpretation">
          <span className="price-interpretation__head"><LineChart size={14} aria-hidden="true" /> {interpretation.headline}</span>
          <ul>
            {interpretation.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>
      )}

      <div className="price-timeline" aria-label="Price history timeline">
        {visible.map((s, i) => {
          const isLatest = i === visible.length - 1;
          return (
            <div key={s.id} className={`price-timeline__step ${isLatest ? 'price-timeline__step--current' : ''}`}>
              <span className="price-timeline__dot" aria-hidden="true" />
              <div className="price-timeline__row">
                <strong>{formatCurrency(s.price)}</strong>
                <span>{formatLongDate(s.at)}</span>
              </div>
              <div className="price-timeline__meta">
                <span>{SOURCE_LABEL[s.source] ?? s.source}</span>
                <span>· {s.recordedBy}</span>
                {s.status === 'verified' && <span className="visit-badge"><BadgeCheck size={12} aria-hidden="true" /> verified</span>}
              </div>
              {!isLatest && <span className="price-timeline__line" aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Catmull-Rom through every point, emitted as cubic Béziers.
 *
 * The old path was `M … L … L …`, which reads as a route between points
 * rather than a price that moved. This passes through exactly the same
 * coordinates — no smoothing of the data, only of the ink between it.
 *
 * Control points are clamped to the plot band. A Catmull-Rom spline can
 * overshoot past a local extreme, and an overshoot here would draw the line
 * above the "highest recorded" label that is supposed to bound it.
 */
function smoothPath(coords: Array<{ x: number; y: number }>, top: number, bottom: number): string {
  if (coords.length === 0) return '';
  const clamp = (y: number) => Math.min(bottom, Math.max(top, y));
  let d = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i - 1] ?? coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6);
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function PriceChart({ points, minPrice, maxPrice }: { points: Array<{ price: number; label: string }>; minPrice: number; maxPrice: number }) {
  const W = 320;
  const H = 160;
  const PAD_X = 14;
  const PAD_TOP = 14;
  const PAD_BOTTOM = 26;

  // The plot band is padded beyond the observed range on purpose. Normalising
  // to the exact min and max pins the lowest observation to the floor and the
  // highest to the ceiling, so any two-point history drew the identical
  // corner-to-corner diagonal — a stock "line goes up" graphic rather than
  // this dish's price. A margin of 18% of the observed range at each end lets
  // the shape sit inside its frame. It changes no value and no proportion
  // between values; only where the band's edges fall.
  const observed = Math.max(maxPrice - minPrice, 1);
  const headroom = observed * 0.18;
  const lo = minPrice - headroom;
  const span = observed + headroom * 2;

  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const baseline = PAD_TOP + innerH;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const coords = points.map((p, i) => ({
    x: PAD_X + (points.length > 1 ? i * stepX : innerW / 2),
    y: PAD_TOP + innerH - ((p.price - lo) / span) * innerH,
  }));

  const linePath = smoothPath(coords, PAD_TOP, baseline);
  // The fill closes the curve down to the baseline rather than re-tracing it,
  // so the two paths can never disagree about where the line went.
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${baseline.toFixed(1)} L${coords[0].x.toFixed(1)},${baseline.toFixed(1)} Z`;

  // Four rules across the band. Not axis ticks — they are unlabelled on
  // purpose, because the numbers worth naming are named exactly once each:
  // the current price is the hero figure, and the lowest / average / highest
  // are the three cards directly beneath this chart. Floating ৳240 and ৳280
  // at the band edges said both of those a third time, and collided with the
  // date ticks doing it.
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => PAD_TOP + innerH * t);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="price-chart__svg"
      role="img"
      aria-label={`Line chart of ${points.length} recorded prices, ${formatCurrency(minPrice)} to ${formatCurrency(maxPrice)}`}
    >
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
          <stop offset="70%" stopColor="var(--primary)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="price-chart__grid" aria-hidden="true">
        {gridYs.map((y, i) => (
          <line key={y} x1={PAD_X} x2={W - PAD_X} y1={y} y2={y} className={i === gridYs.length - 1 ? 'price-chart__base' : undefined} />
        ))}
      </g>
      <path className="price-chart__area" d={areaPath} fill="url(#chartFill)" />
      <path
        className="price-chart__line"
        d={linePath}
        pathLength={1}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map((c, i) => (
        <circle
          key={i}
          className={`price-chart__dot${i === coords.length - 1 ? ' price-chart__dot--last' : ''}`}
          style={{ '--d': i } as CSSProperties}
          cx={c.x}
          cy={c.y}
          r={i === coords.length - 1 ? 3.6 : 2.9}
          fill="var(--surface)"
          stroke="var(--primary)"
          strokeWidth="2"
        />
      ))}
      {coords.map((c, i) => (
        <text key={i} className="price-chart__tick" x={c.x} y={H - 6} textAnchor="middle">
          {points[i].label}
        </text>
      ))}
    </svg>
  );
}
