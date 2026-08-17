import { useEffect, useMemo, useRef, useState } from 'react';
import { X, TrendingUp, TrendingDown, Minus, CalendarClock, BadgeCheck, LineChart } from 'lucide-react';
import type { MenuItem, PriceChange } from '../domain/menu';
import { formatCurrency } from '../lib/format';
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

export default function DishPriceHistory({ dish, change, onClose }: DishPriceHistoryProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [range, setRange] = useState<PriceRange>('All');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

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

  return (
    <div className="lightbox price-modal" role="dialog" aria-modal="true" aria-label={`Price history for ${dish.name}`} onClick={onClose}>
      <div className="price-modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="price-modal__head">
          <div>
            <span className="section-heading__eyebrow">Price intelligence</span>
            <h2>{dish.name}</h2>
          </div>
          <button ref={closeRef} type="button" className="btn btn--subtle" onClick={onClose} aria-label="Close price history">
            <X size={16} />
          </button>
        </div>

        <div className="price-modal__current">
          <span>Current price</span>
          <strong>{formatCurrency(dish.price)}</strong>
          {change && change.previousPrice !== undefined && (
            <span className={`price-change ${pct === undefined ? '' : pct > 0 ? 'price-change--up' : pct < 0 ? 'price-change--down' : ''}`}>
              {pct === undefined ? <Minus size={12} aria-hidden="true" /> : pct > 0 ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
              {change.absoluteChange !== undefined && change.absoluteChange !== 0
                ? `${change.absoluteChange > 0 ? '+' : ''}${formatCurrency(change.absoluteChange)} (${change.percentChange}%)`
                : 'no change'}
              {' '}vs previous recorded
            </span>
          )}
        </div>

        {/* Time range — only usable ranges are clickable. */}
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
            <div className="price-stat"><span>Average recorded</span><strong>{formatCurrency(stats.average)}</strong></div>
            <div className="price-stat"><span>Highest recorded</span><strong>{formatCurrency(stats.highest)}</strong></div>
          </div>
        )}

        {visible.length > 0 && (
          <div className="price-interpretation">
            <span className="price-interpretation__head"><LineChart size={13} aria-hidden="true" /> {interpretation.headline}</span>
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
                  {s.status === 'verified' && <span className="visit-badge"><BadgeCheck size={11} aria-hidden="true" /> verified</span>}
                </div>
                {!isLatest && <span className="price-timeline__line" aria-hidden="true" />}
              </div>
            );
          })}
        </div>

        <p className="t-xs" style={{ color: 'var(--ink-faint)' }}>
          <CalendarClock size={11} aria-hidden="true" /> Based on recorded observations. History may be incomplete — and is demo data.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PriceChart({ points, minPrice, maxPrice }: { points: Array<{ price: number; label: string }>; minPrice: number; maxPrice: number }) {
  const W = 320;
  const H = 150;
  const PAD_X = 8;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 22;

  const span = Math.max(maxPrice - minPrice, 1);
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const coords = points.map((p, i) => ({
    x: PAD_X + (points.length > 1 ? i * stepX : innerW / 2),
    y: PAD_TOP + innerH - ((p.price - minPrice) / span) * innerH,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${(PAD_TOP + innerH).toFixed(1)} L${coords[0].x.toFixed(1)},${(PAD_TOP + innerH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="price-chart__svg" role="img" aria-label="Line chart of recorded prices">
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#chartFill)" />
      <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2" />
      ))}
      <text x={PAD_X} y={PAD_TOP - 3} fontSize="9" fill="var(--ink-faint)">{formatCurrency(maxPrice)}</text>
      <text x={PAD_X} y={PAD_TOP + innerH + 11} fontSize="9" fill="var(--ink-faint)">{formatCurrency(minPrice)}</text>
      {coords.map((c, i) => (
        <text key={i} x={c.x} y={H - 4} fontSize="8.5" fill="var(--ink-faint)" textAnchor="middle">
          {points[i].label}
        </text>
      ))}
    </svg>
  );
}
