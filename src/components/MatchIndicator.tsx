import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BadgePercent,
  ChefHat,
  ChevronDown,
  Clock,
  DoorOpen,
  Heart,
  Leaf,
  MapPin,
  Navigation,
  Search,
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
  search: Search,
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
 * How the score reads in words.
 *
 * This adds no information: it is a monotone function of the number printed
 * beside it, in four bands, and it exists because "42%" alone tells a diner
 * nothing about whether 42 is a lot. It is deliberately worded as *overlap*
 * rather than as advice — KK does not tell anyone a restaurant is good, it
 * says how much of what they asked for this place answers. Nothing here is
 * a claim about the restaurant.
 */
function scoreBand(score: number): string {
  if (score >= 75) return 'Strong overlap';
  if (score >= 50) return 'Good overlap';
  if (score >= 25) return 'Some overlap';
  return 'Slight overlap';
}

/**
 * The panel's heading, which has to stay true at every score.
 *
 * "Why this matched you" is a fair promise at 78% and a false one at 12%: it
 * asserts a match the number does not support, so a diner who opens it and
 * finds two short bars has been misled by the heading rather than informed
 * by the panel. The heading therefore moves with the same bands `scoreBand`
 * uses — a real overlap gets "why", a partial one gets "where", and a slight
 * one stops claiming a match at all and says plainly that there is little to
 * show. KK would rather under-claim than flatter a result.
 */
function panelTitle(score: number, mode: 'personal' | 'search'): string {
  if (score >= 50) {
    return mode === 'personal' ? 'Why this matched you' : 'Why this fits your search';
  }
  if (score >= 25) {
    return mode === 'personal' ? 'Where this lines up with you' : 'Where this fits your search';
  }
  return mode === 'personal' ? 'The little that lines up' : 'The little that fits';
}

/**
 * Recommendation confidence indicator.
 *
 * The trigger used to be an invisible row — score, a hairline bar, and a
 * 22px `Info` glyph at `opacity: 0.5` — 303x22px of clickable area whose
 * only affordance was that glyph. Nobody found it, and it failed the 44px
 * target on top of being unreadable as a control.
 *
 * It is now a two-line control that says what it does. The second line is
 * the change that matters: it prints the *strongest actual reason* from the
 * engine, so the card answers "why?" before anyone clicks anything. The
 * panel then holds the full breakdown for the diner who wants it. Same
 * data, same engine, moved to where it is read.
 *
 * On mobile the explanation becomes a bottom sheet so it never escapes the
 * viewport.
 */
export default function MatchIndicator({ match, mode }: MatchIndicatorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  // `aria-haspopup="dialog"` promised a popup; nothing said which element it
  // was. This is the missing half of that pair — and it is only emitted while
  // the popover exists, because `aria-controls` pointing at nothing is worse
  // than no `aria-controls` at all.
  const popoverId = useId();

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
  // The number lives here, in the foot, as real text.
  //
  // It used to live only in the card's media badge, which was wrong twice
  // over: that badge is `aria-hidden` decoration sitting on the photo, and
  // polish.css section 10 hides it outright in the ≤640 two-column grid
  // (four overlay zones do not fit a 162x121 media). So on mobile Explore
  // the KK match score was not merely quiet, it was *gone* — the foot row
  // read as a bare question with a bar under it and no figure anywhere.
  // The foot is the one place that renders at every width and in every
  // variant that has a foot, so the score belongs here. editorial.css's
  // `.match-indicator__score strong` rule was already written for exactly
  // this element, so restoring it re-activates styling that never left.
  //
  // The caption keeps the badge's own vocabulary rather than inventing a
  // third phrasing for the same idea, and the "why" invitation moves to the
  // trigger's tooltip and the hint icon, which is what that icon is for.
  const caption = mode === 'personal' ? 'KK match' : 'Search fit';
  // Very low scores are real signal, not broken UI — present them quietly
  // (muted colour, neutral bar) without inventing a new meaning for them.
  const low = match.score < 25;
  // The heading is score-dependent, so it cannot double as the panel's
  // accessible name in the way a fixed string could: "Close the little that
  // lines up" is not a sentence. The dialog keeps the heading as its label,
  // and the close button states what it closes in its own words.
  const title = panelTitle(match.score, mode);
  const reasons = [...match.reasons].sort((a, b) => b.strength - a.strength).slice(0, 5);
  const groups = (['profile', 'search', 'restaurant'] as const)
    .map((group) => ({ group, reasons: reasons.filter((r) => groupOf(r) === group) }))
    .filter((g) => g.reasons.length > 0);

  // The lead reason, printed on the card. Rendered only when one exists —
  // a card with no reasons keeps the single-line trigger rather than
  // showing an empty second row.
  const lead = reasons[0];
  const LeadIcon = lead ? DIMENSION_ICON[lead.dimension] : null;
  const pct = Math.min(100, Math.max(2, match.score));

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
        aria-controls={open ? popoverId : undefined}
        aria-label={`${match.score}% match ${label}${lead ? `, strongest reason: ${lead.label}` : ''}. See the full breakdown.`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="match-indicator__row">
          <span className="match-indicator__score">
            <strong className="match-indicator__value">{match.score}%</strong>
            <span className="match-indicator__label">{caption}</span>
          </span>
          <span
            className="match-bar"
            role="progressbar"
            aria-label={`${match.score}% match ${label}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={match.score}
          >
            <span className="match-bar__fill" style={{ width: `${pct}%` }} />
          </span>
          {/* The affordance, in words. `aria-hidden` because the button's
              own label already says it, and "Why" read twice is noise. */}
          <span className="match-indicator__why" aria-hidden="true">
            Why
            <ChevronDown size={12} className="match-indicator__chev" />
          </span>
        </span>
        {lead && LeadIcon && (
          <span className="match-indicator__lead">
            <LeadIcon size={12} aria-hidden="true" />
            <span className="match-indicator__lead-text">{lead.label}</span>
          </span>
        )}
      </button>

      {open && (
        <div
          className="match-popover"
          id={popoverId}
          ref={popoverRef}
          role="dialog"
          aria-label={title}
          tabIndex={-1}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {/* The head carries the score as the figure it is, not as another
              bar in a grey band. The dial is a conic ring — the same device
              the card's media badge uses, so this reads as the same product
              rather than as a second visual language for one idea. */}
          <div className="match-popover__head">
            <span
              className="match-popover__dial"
              style={{ '--pct': pct } as CSSProperties}
              aria-hidden="true"
            >
              <strong>
                {match.score}
                <small>%</small>
              </strong>
            </span>
            <span className="match-popover__headtext">
              <strong className="match-popover__title">{title}</strong>
              <span className="match-popover__band">
                {scoreBand(match.score)} {label}
              </span>
            </span>
            <button
              type="button"
              className="match-popover__close"
              aria-label={mode === 'personal' ? 'Close match details' : 'Close search-fit details'}
              onClick={() => setOpen(false)}
            >
              <X size={14} aria-hidden="true" />
            </button>
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
                          <span className="match-popover__reason-icon" aria-hidden="true">
                            <Icon size={13} />
                          </span>
                          <span className="match-popover__reason-label">{reason.label}</span>
                          <span className="match-popover__bar" aria-hidden="true">
                            <span style={{ width: `${Math.max(6, reason.strength)}%` }} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <p className="match-popover__empty">
              Little of what you asked for lines up here yet. Loosen a filter and the reasons will fill in.
            </p>
          )}

          <p className="match-popover__foot">
            {mode === 'personal'
              ? 'Read from your profile, your saved places and this search — never from what a restaurant paid.'
              : 'Read from what you asked for just now. Sign in and KK starts learning your taste too.'}
          </p>
        </div>
      )}
    </div>
  );
}
