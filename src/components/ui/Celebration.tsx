import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CoinMark } from './marks';

/**
 * Celebration — the one moment in the product that is allowed to be a moment.
 *
 * Everything else here moves the way a well-made page moves: a 1px lift, a
 * 2px lean, a width that grows. That restraint is the house style and it is
 * correct for 99% of the product — but it left the two places where a diner
 * *gains* something feeling identical to the places where they merely
 * navigated. Claiming the profile reward swapped a button for a grey tick;
 * redeeming a reward closed a dialog and slid in a toast. Both are
 * confirmations of a transaction, and neither is a reward.
 *
 * So this is deliberately unlike every other animation in the codebase, and
 * unlike them in a specific way rather than a loud one: it is the only thing
 * that plays *once*, unprompted by a pointer, in the centre of the screen,
 * and then removes itself. A coin is struck — the mark lands, a single ring
 * travels out of it, eight thin shards fly and fade, a warm bloom breathes
 * behind the whole thing — and the amount rises above it in the display
 * serif. No confetti, no bounce, no overshoot: Decision 4 retired spring and
 * pop from new usage, so the coin scales up on `--ease-out` and stops.
 *
 * It is not a modal. `pointer-events: none` throughout, nothing is dimmed,
 * nothing has to be dismissed, and no focus moves — the page underneath stays
 * live and the flourish is gone in a beat over a second. Portalled to
 * `document.body` so a transformed ancestor cannot turn the fixed overlay
 * into an absolutely positioned one, and so it outlives the button that
 * triggered it: both call sites destroy their own trigger on success.
 *
 * Paint: primitives.css §10, including the reduced-motion branch. That branch
 * matters more here than anywhere else in the product — the global blanket in
 * editorial.css only zeroes *duration*, so keyframes still run, they just run
 * instantly. A celebration relying on that would flash its end state and hold
 * it. §10 sets `animation: none` on every moving part and keeps the composed
 * mark and its label still.
 */

export interface CelebrationProps {
  /** Tokens gained, rendered as a `+N` numeral. Omit for a non-token win. */
  amount?: number;
  /** What just happened, in three or four words. */
  headline: string;
  /** The specific thing earned — a reward's name, a coupon code. */
  caption?: string;
  /** The struck mark. Defaults to the coin the token balance uses. */
  icon?: ReactNode;
  /**
   * Announce to assistive tech. Default true. Pass `false` where the call
   * site already has a live region for the same event — the wallet's success
   * toast is a `role="status"`, and two announcements of one redemption is
   * worse than none.
   */
  announce?: boolean;
  /** Fired when the flourish is over, so the owner can clear its state. */
  onDone: () => void;
}

/**
 * Long enough to be seen and understood, short enough that nobody waits for
 * it. The shards finish at 900ms and the mark holds briefly after them.
 */
const LIFETIME = 1500;

/** Eight fixed angles, not random: a struck coin throws the same spark twice. */
const SHARDS = [-90, -45, 0, 45, 90, 135, 180, -135];

export default function Celebration({
  amount,
  headline,
  caption,
  icon,
  announce = true,
  onDone,
}: CelebrationProps) {
  /**
   * The timer is armed once, on mount, and never re-armed. Both call sites
   * write to storage in the same click that starts the celebration, so their
   * next render hands this component a fresh `onDone` closure — with the
   * callback in the dependency array that would restart the clock on every
   * re-render of the page underneath, and the flourish would outstay its
   * welcome by however long the page stayed busy. The ref keeps the latest
   * callback without the effect depending on its identity.
   */
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const timer = window.setTimeout(() => done.current(), LIFETIME);
    return () => window.clearTimeout(timer);
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="kk-celebrate">
      {/* Pure decoration: the coin, its ring and its shards say nothing a
          screen reader needs, and the line below says all of it. */}
      <div className="kk-celebrate__stage" aria-hidden="true">
        <span className="kk-celebrate__bloom" />
        <span className="kk-celebrate__ring" />
        {/* The struck coin, at 52 of the medallion's 64 — the drawing is the
            subject here, not a glyph parked in a disc. Which is why the token
            case takes its own ground: a gold coin on the gold field the custom
            icons need reads as one brown object, so `--token` swaps the field for
            paper and lets the coin be the gold. A caller-supplied mark keeps the
            gold field, because those are white strokes and have nothing else to
            read against. */}
        <span className={`kk-celebrate__coin${icon ? '' : ' kk-celebrate__coin--token'}`}>
          {icon ?? <CoinMark size={52} />}
        </span>
        {SHARDS.map((angle) => (
          <span
            key={angle}
            className="kk-celebrate__shard"
            style={{ '--angle': `${angle}deg` } as CSSProperties}
          />
        ))}
        {amount !== undefined && <span className="kk-celebrate__amount">+{amount}</span>}
      </div>
      {/* The one line that carries the news — and the announcement, so
          `announce` decides whether this node is a live region or hidden.
          Never a second copy of the same sentence somewhere off-screen. */}
      <p
        className="kk-celebrate__text"
        role={announce ? 'status' : undefined}
        aria-hidden={announce ? undefined : 'true'}
      >
        <strong>{headline}</strong>
        {caption && <span>{caption}</span>}
      </p>
    </div>,
    document.body,
  );
}
