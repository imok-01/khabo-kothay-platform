import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BadgePercent,
  ChefHat,
  Clock,
  DoorOpen,
  Heart,
  Info,
  Leaf,
  MapPin,
  Navigation,
  Sparkles,
  Star,
  Users,
  Utensils,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react';
import type { MatchDimension, MatchReason, MatchResult } from '../domain/recommendation';

interface MatchIndicatorProps {
  match: MatchResult;
  /** 'personal' = built from real user signals; 'search' = current intent only. */
  mode: 'personal' | 'search';
}

type ReasonGroup = 'profile' | 'search' | 'restaurant';

const GROUP_CAPTION: Record<ReasonGroup, string> = {
  profile: 'Your profile',
  search: 'Your search',
  restaurant: 'About this place',
};

/** One icon per scoring dimension — same vocabulary as the engine. */
const DIMENSION_ICON: Record<MatchDimension, LucideIcon> = {
  cuisine: Utensils,
  specialty: ChefHat,
  budget: Wallet,
  location: MapPin,
  meal: Clock,
  vibe: Sparkles,
  diet: Leaf,
  open: DoorOpen,
  quality: Star,
  popularity: Users,
  offer: BadgePercent,
  preference: Heart,
  distance: Navigation,
  party: Users,
  dining: UtensilsCrossed,
};

/**
 * Which bucket a reason belongs to. Budget/location can come from either the
 * current search or the user's profile — their labels are the source of
 * truth, so the grouping never invents a source.
 */
function groupOf(reason: MatchReason): ReasonGroup {
  switch (reason.dimension) {
    case 'preference':
      return 'profile';
    case 'budget':
      return reason.label === 'Fits your usual budget' ? 'profile' : 'search';
    case 'location':
      return reason.label.startsWith('Near your preferred area') ? 'profile' : 'search';
    case 'quality':
    case 'popularity':
    case 'offer':
    case 'distance':
      return 'restaurant';
    default:
      return 'search';
  }
}

/**
 * Recommendation confidence indicator. Shows the computed match percentage
 * with a horizontal bar; hover or click reveals exactly why, using the same
 * scoring dimensions that produced the number. On mobile the explanation
 * becomes a bottom sheet so it never escapes the viewport.
 */
export default function MatchIndicator({ match, mode }: MatchIndicatorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click and Escape; focus the popover when opened.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    popoverRef.current?.focus();
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = mode === 'personal' ? 'for you' : 'for your search';
  // Very low scores are real signal, not broken UI — present them quietly
  // (muted colour, neutral bar) without inventing a new meaning for them.
  const low = match.score < 25;
  const reasons = [...match.reasons].sort((a, b) => b.strength - a.strength).slice(0, 5);
  const groups = (['profile', 'search', 'restaurant'] as const)
    .map((group) => ({ group, reasons: reasons.filter((r) => groupOf(r) === group) }))
    .filter((g) => g.reasons.length > 0);

  return (
    <div
      className={`match-indicator ${low ? 'match-indicator--low' : ''}`}
      ref={rootRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="match-indicator__trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${match.score}% match ${label}. Why this matches you.`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="match-indicator__score">
          <strong>{match.score}%</strong>
          <span className="match-indicator__label">{label}</span>
        </span>
        <span
          className="match-bar"
          role="progressbar"
          aria-label={`${match.score}% match ${label}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={match.score}
        >
          <span className="match-bar__fill" style={{ width: `${Math.min(100, Math.max(2, match.score))}%` }} />
        </span>
        <span className="match-indicator__hint" aria-hidden="true">
          <Info size={13} />
        </span>
      </button>

      {open && (
        <div
          className="match-popover"
          ref={popoverRef}
          role="dialog"
          aria-label="Why this matches you"
          tabIndex={-1}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="match-popover__head">
            <span className="match-popover__head-title">
              <Info size={13} aria-hidden="true" />
              <strong>Why this matches you</strong>
            </span>
            <button
              type="button"
              className="match-popover__close"
              aria-label="Close why this matches you"
              onClick={() => setOpen(false)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="match-popover__score">
            <span className="match-popover__score-value">
              <strong>{match.score}%</strong> <span>{label}</span>
            </span>
            <span className="match-bar match-bar--popover" aria-hidden="true">
              <span className="match-bar__fill" style={{ width: `${Math.min(100, Math.max(2, match.score))}%` }} />
            </span>
          </div>

          {groups.length > 0 ? (
            <div className="match-popover__groups">
              {groups.map(({ group, reasons: groupReasons }) => (
                <section key={group} className="match-popover__group">
                  <p className="match-popover__caption">{GROUP_CAPTION[group]}</p>
                  <ul className="match-popover__reasons">
                    {groupReasons.map((reason) => {
                      const Icon = DIMENSION_ICON[reason.dimension];
                      return (
                        <li key={`${reason.dimension}:${reason.label}`} className="match-popover__reason">
                          <span className="match-popover__reason-label">
                            <Icon size={13} aria-hidden="true" />
                            {reason.label}
                          </span>
                          <span className="match-popover__bar" aria-hidden="true">
                            <span style={{ width: `${reason.strength}%` }} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <p className="match-popover__empty">Not much matched your current search — try loosening a filter.</p>
          )}

          <p className="match-popover__foot">
            {mode === 'personal'
              ? 'Based on your profile, preferences and current search.'
              : 'Based on what you asked for right now. Sign in to personalise it.'}
          </p>
        </div>
      )}
    </div>
  );
}
