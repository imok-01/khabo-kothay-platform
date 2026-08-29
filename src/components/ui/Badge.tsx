import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Badge — the mark you read.
 *
 * The other half of the chip split. A badge states a fact about a thing
 * (Dinner, Rooftop, 20% off, Verified) and there is nothing to press, so
 * it has no cursor, no hover, no pointer target and no pressed state.
 * Those absences are the component: they are what stop a label from
 * advertising an action it does not have.
 *
 * The product had been using `.chip--meal` / `--vibe` / `--offer` for
 * this, which is the same pill as the controls beside them — so a person
 * scanning a restaurant page could not tell, before moving the cursor,
 * which pills were answers and which were questions. A badge is a 6px
 * rectangle here (`--r-xs`), which is what §2's radius table assigned to
 * "badges, tags, inline marks (typographic, not tappable)" all along.
 * Shape carries the distinction now, the same way it started carrying
 * the button/chip distinction when buttons left 999px.
 *
 * Deliberately *not* an attempt to absorb the twenty-odd bespoke badge
 * classes in the product. `.veg-badge`, the provenance marks and the
 * match indicator each say something specific and are coherent where
 * they are; churning them would cost a lot and prove nothing. This owns
 * the generic semantic label, and surfaces move onto it when a phase has
 * reason to touch them.
 *
 * docs/KK_VISUAL_DIRECTION.md §2 (shape), §3 (colour), §11.
 */

export type BadgeTone = 'neutral' | 'accent' | 'vibe' | 'success' | 'warn';
export type BadgeSize = 'sm' | 'md';

const BADGE_ICON: Record<BadgeSize, number> = { sm: 11, md: 12 };

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /**
   * Which ramp this fact belongs to — not which domain it is from. The
   * classes it replaces were named `--meal`, `--vibe`, `--offer`, one use
   * each, which is how a Google attribution mark came to wear
   * `.chip--meal`: it wanted saffron and saffron had only one name.
   */
  tone?: BadgeTone;
  size?: BadgeSize;
  icon?: LucideIcon;
  children?: ReactNode;
}

export default function Badge({
  tone = 'neutral',
  size = 'sm',
  icon: Icon,
  className,
  children,
  ...rest
}: BadgeProps) {
  const cls = [
    'kk-badge',
    tone !== 'neutral' && `kk-badge--${tone}`,
    size !== 'sm' && `kk-badge--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span {...rest} className={cls}>
      {Icon && <Icon size={BADGE_ICON[size]} aria-hidden="true" />}
      {children}
    </span>
  );
}
