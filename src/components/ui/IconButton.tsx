import { useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * IconButton — a control whose whole label is its mark.
 *
 * The product has three of these: the save / favourite / compare cluster
 * on a restaurant card, the refine sheet's close, and the navbar burger.
 * Measured before this component existed, they were 34px, 34px and 40px —
 * and the card cluster was additionally 30px in the ≤640 two-column grid
 * and 28px on the compact card. Four sizes, none of them reaching the
 * 44px target `.btn` has held since the button ladder was fixed, on what
 * is by count the most-tapped control in the product (633 of them render
 * on `/explore` alone).
 *
 * The circle cannot simply grow — it sits inside a card's media box, and
 * three 34px buttons in a column already stand 114px tall inside a 121px
 * media on mobile. So this separates the two things that were being
 * conflated: the *visual* box stays whatever the layout can afford, and
 * an invisible `::after` carries the *pointer target* out to 44px. See
 * primitives.css §2 for the reach properties and why the vertical axis is
 * capped separately from the horizontal one.
 *
 * The other reason this is a component and not a class: an icon-only
 * control has no text, so its accessible name has to be supplied. Making
 * `label` a required prop turns "someone forgot the aria-label" from a
 * thing you find in an audit into a thing that will not compile.
 *
 * docs/KK_VISUAL_DIRECTION.md §2 (shape), §8 (icons).
 */

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonTone = 'glass' | 'paper' | 'danger';
/**
 * Circle everywhere the control sits on its own — a card's media, a dialog's
 * corner. Square in the console, where seven of them stand in a row inside a
 * 64px record: at that density circles read as a string of beads, and the
 * rounded square is what makes each one look like a discrete target. Shape is
 * not a synonym for tone, so the two are separate props: the console's delete
 * is a square *and* a danger.
 */
export type IconButtonShape = 'circle' | 'square';

/** Visual box → icon size, both on the ladder. §8. */
const ICON_FOR: Record<IconButtonSize, number> = { sm: 14, md: 16, lg: 18 };

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** The mark. Sized here, from the ladder, not at the call site. */
  icon: LucideIcon;
  /**
   * The accessible name — required, because there is no text to fall back
   * on. Also used as the `title`, so the same words answer a hover and a
   * screen reader instead of drifting apart.
   */
  label: string;
  /** 28 / 34 / 40px circle. The pointer target is 44px regardless. */
  size?: IconButtonSize;
  /** `glass` over photography, `paper` on a surface, `danger` for a delete. */
  tone?: IconButtonTone;
  /** `circle` by default; `square` for a console row action. */
  shape?: IconButtonShape;
  /**
   * A toggle's state. Sets `aria-pressed`, which is what makes a save
   * button announce itself as on rather than as a button called "Save"
   * that mysteriously changed colour.
   */
  pressed?: boolean;
  /** The "on" fill. A heart is terracotta, a save espresso — the meaning is the caller's. */
  onColor?: string;
  /** Ink for the "on" fill. Defaults to white. */
  onInk?: string;
  /**
   * Edge for the "on" fill, when the fill alone is too quiet to be a state.
   * Defaults to the fill itself — right for a solid terracotta heart, wrong
   * for the console's pale `--primary-soft`, which needs a line to read as a
   * pressed thing rather than as a lighter patch of paper.
   */
  onLine?: string;
  /**
   * Fill the glyph itself when pressed. Right for a heart or a bookmark,
   * where a solid shape is the recognised "kept" state; wrong for a mark
   * with internal structure like a balance scale, which becomes a blob.
   */
  fillWhenPressed?: boolean;
}

export default function IconButton({
  icon: Icon,
  label,
  size = 'md',
  tone = 'paper',
  shape = 'circle',
  pressed,
  onColor,
  onInk,
  onLine,
  fillWhenPressed = false,
  className,
  style,
  title,
  ...rest
}: IconButtonProps) {
  /**
   * The ring in primitives.css fires on the *act* of turning on, not on
   * arriving on. That distinction cannot be made in CSS: `[aria-pressed=true]`
   * is equally true for a card the reader just saved and for the forty saved
   * cards a list paints on load, and animating all forty is exactly the "first
   * paint" noise §5 rule 1 forbids.
   *
   * So the transition is detected here. `prev` starts at the mounted value, so
   * a control that renders already-pressed never beats; only a false → true
   * change while mounted does. The attribute is cleared when the animation
   * ends — or immediately if `pressed` goes back off, so a fast on/off/on
   * retriggers rather than swallowing the second ring.
   */
  const [beat, setBeat] = useState(false);
  const prev = useRef(pressed);
  useEffect(() => {
    const was = prev.current;
    prev.current = pressed;
    if (pressed === true && was === false) setBeat(true);
    else if (!pressed) setBeat(false);
  }, [pressed]);

  // The "on" properties are only emitted when the caller names a colour, so a
  // plain (non-toggle) icon button carries no inline style at all and
  // primitives.css keeps full control of it.
  const onStyle: CSSProperties | undefined = onColor
    ? ({
        '--kk-ib-on-bg': onColor,
        '--kk-ib-on-fg': onInk ?? '#fff',
        ...(onLine ? { '--kk-ib-on-line': onLine } : null),
        ...style,
      } as CSSProperties)
    : style;

  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      /* The default shape emits no class — `circle` is what 633 of these are on
         `/explore` alone, and a class per button to say "as usual" is DOM the
         page pays for on every one of them. */
      className={[
        'kk-ib',
        `kk-ib--${size}`,
        `kk-ib--${tone}`,
        shape === 'square' ? 'kk-ib--square' : null,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
      title={title ?? label}
      aria-pressed={pressed}
      data-kk-beat={beat ? '' : undefined}
      onAnimationEnd={(event) => {
        /* The ring is the only animation this primitive runs, but the handler
           still checks the target: an animation on a *child* — a caller's
           spinner, a Lucide mark — bubbles to here too, and clearing the flag
           on someone else's animation would cut the ring short. */
        if (event.target === event.currentTarget) setBeat(false);
        rest.onAnimationEnd?.(event);
      }}
      style={onStyle}
    >
      <Icon
        size={ICON_FOR[size]}
        // `fill` is only stated when the caller asked for it, so an
        // unfilled mark keeps Lucide's own `fill="none"` rather than
        // having it re-declared here.
        fill={fillWhenPressed ? (pressed ? 'currentColor' : 'none') : undefined}
        aria-hidden="true"
      />
    </button>
  );
}
