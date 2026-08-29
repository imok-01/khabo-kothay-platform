import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import Button, { type ButtonSize, type ButtonVariant } from './Button';

/**
 * ConfirmButton — a destructive action that asks once, in place.
 *
 * KK had two answers for "are you sure": a full `Dialog` (right for redeeming
 * a reward, where there is something to read), and nothing at all. "Clear all"
 * on Saved and Favourites was the second kind — one click, and a collection
 * somebody built restaurant by restaurant was gone, with no undo anywhere in
 * the product to get it back.
 *
 * A dialog is the wrong instrument for it: there is no detail to present, so
 * the modal would exist purely to be dismissed. The wallet already had the
 * right idea and hand-rolled it — `Reset demo wallet` becomes `Confirm reset?`
 * and only the second press commits. This is that pattern as a control, so the
 * decision is made here instead of in every page that needs it.
 *
 * Three things it does that the hand-rolled version did not:
 *
 *  - **It disarms itself.** An armed button left on screen becomes a trap: you
 *    come back to the tab minutes later, press what you read as "Clear all",
 *    and it fires. It reverts after `armedFor` ms, and on blur, and on Escape.
 *  - **It says so out loud.** The label changing is invisible to a screen
 *    reader that has already announced the button, so arming also writes to a
 *    live region.
 *  - **It reddens when armed.** Quiet at rest, `danger` once the next press is
 *    the one that does it — the moment the warning is actually worth paint.
 *
 * docs/KK_VISUAL_DIRECTION.md §3 (colour), §9 (destructive actions).
 */

export interface ConfirmButtonProps {
  /** What it says at rest — "Clear all". */
  children: ReactNode;
  /** What it says once armed. Phrase it as the question: "Clear all? Tap again". */
  confirmLabel: ReactNode;
  /** Runs on the second press only. */
  onConfirm: () => void;
  /**
   * Announced when the control arms. Defaults to `confirmLabel` when that is a
   * plain string; pass it explicitly when the label is markup.
   */
  armedAnnouncement?: string;
  variant?: ButtonVariant;
  /** Paint once armed. `danger` by default — this is the press that destroys. */
  confirmVariant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  /** Swaps in while armed, if the armed state wants a different mark. */
  confirmIcon?: LucideIcon;
  /** How long the armed state survives without a second press. */
  armedFor?: number;
  className?: string;
  title?: string;
}

export default function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  armedAnnouncement,
  variant = 'subtle',
  confirmVariant = 'danger',
  size = 'md',
  icon,
  confirmIcon,
  armedFor = 4000,
  className,
  title,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const disarm = useCallback(() => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = undefined;
    setArmed(false);
  }, []);

  // Nothing should be left armed after the control is gone from the tree.
  useEffect(() => disarm, [disarm]);

  const press = () => {
    if (!armed) {
      setArmed(true);
      timer.current = window.setTimeout(() => setArmed(false), armedFor);
      return;
    }
    disarm();
    onConfirm();
  };

  const announcement =
    armedAnnouncement ?? (typeof confirmLabel === 'string' ? confirmLabel : undefined);

  return (
    <>
      <Button
        variant={armed ? confirmVariant : variant}
        size={size}
        icon={armed ? confirmIcon ?? icon : icon}
        className={className}
        title={title}
        onClick={press}
        onBlur={disarm}
        onKeyDown={(e) => {
          // Escape is the universal "I didn't mean it", and an armed control is
          // exactly the state someone reaches for it in.
          if (e.key === 'Escape' && armed) {
            e.stopPropagation();
            disarm();
          }
        }}
      >
        {armed ? confirmLabel : children}
      </Button>
      {/* Outside the button on purpose: a live region *inside* the control
          would make the announcement part of its accessible name. */}
      <span className="sr-only" role="status">
        {armed && announcement ? announcement : ''}
      </span>
    </>
  );
}
