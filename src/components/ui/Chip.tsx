import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';

/**
 * Chip — the pill you press.
 *
 * A chip is how KK asks a narrowing question: a mood, a filter, a
 * neighbourhood, a price ceiling. The product had eight of them. Not
 * eight kinds — eight *heights* for the same role (24, 29, 32, 33, 34,
 * 35, 35, 36px), across four type sizes, seven padding pairs and five
 * gaps, because every surface that needed a chip declared one.
 *
 * Three things were wrong beyond the drift:
 *
 *  - **Nothing reached a 44px target.** Not one chip in the product,
 *    including the hundred in the refine sheet and the eight on the mood
 *    rail, which are the two densest touch surfaces it has. The `::after`
 *    in primitives.css §3 carries the target to 44 on the vertical axis
 *    while the pill keeps the height its row affords — the same
 *    separation `IconButton` makes, and it tiles exactly against the 8px
 *    row gap both of those surfaces already use.
 *  - **Half of them had `touch-action: auto`.** The refine sheet and the
 *    mood rail — ~108 controls — carried the 300ms double-tap-zoom delay
 *    on every press, so the densest part of the product was also its
 *    slowest-feeling. It is `manipulation` here, once.
 *  - **A label was wearing a control's clothes.** `.chip--meal` renders
 *    on a `<span>`; `.chip--link` renders on an `<a>`; they were the same
 *    32px pill with the same hover. That is what `Badge` is for, and it
 *    is why this component is a `<button>`, a `<Link>` or an `<a>` and
 *    never a `<span>` — if it cannot be pressed, it is not a chip.
 *
 * `selected` sets `aria-pressed`, which is both the accessible state and
 * the selector the flat fill hangs off. A surface that needs a different
 * "on" colour passes it as `--kk-chip-on-bg` rather than writing a
 * `background` the primitive would beat.
 *
 * docs/KK_VISUAL_DIRECTION.md §2 (shape), §3 (colour), §8 (icons),
 * §11 (the primitive layer).
 */

export type ChipSize = 'sm' | 'md';

/**
 * A chip's mark is smaller than a button's 16 because the chip is
 * smaller; it is still not a per-call-site choice. The mood rail wrote
 * `size={14}` eleven times to arrive at the same number.
 */
const CHIP_ICON: Record<ChipSize, number> = { sm: 12, md: 14 };

interface ChipOwnProps {
  /** `md` is 36px and reaches 44; `sm` is 32px and reaches 40. */
  size?: ChipSize;
  /** Leading mark. Faint at rest, saffron when on or hovered. */
  icon?: LucideIcon;
  /** A pre-rendered mark, for the cases that cannot pass a component. */
  iconNode?: ReactNode;
  /** Toggle state. Sets `aria-pressed` and the flat selected fill. */
  selected?: boolean;
  /**
   * How many results this option would give you. Rendered in its own
   * tabular pill, because a number that changes as you type should not
   * move the label beside it.
   */
  count?: number;
  /**
   * This option reaches nothing alongside the current search. Dimmed and
   * dashed rather than hidden — a filter that matches nothing *here* is
   * information, and it stays pressable so the count can be checked
   * rather than believed.
   */
  empty?: boolean;
  children?: ReactNode;
}

type NativeChipProps = ChipOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ChipOwnProps> & {
    to?: never;
    href?: never;
  };

type RouterChipProps = ChipOwnProps & Omit<LinkProps, keyof ChipOwnProps> & { href?: never };

type ExternalChipProps = ChipOwnProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ChipOwnProps> & {
    href: string;
    to?: never;
  };

export type ChipProps = NativeChipProps | RouterChipProps | ExternalChipProps;

export default function Chip(props: ChipProps) {
  const {
    size = 'md',
    icon: Icon,
    iconNode,
    selected = false,
    count,
    empty = false,
    className,
    children,
    ...rest
  } = props as ChipOwnProps & { className?: string } & Record<string, unknown>;

  const cls = [
    'kk-chip',
    size !== 'md' && `kk-chip--${size}`,
    empty && 'kk-chip--empty',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      {(Icon || iconNode) && (
        <span className="kk-chip__icon" aria-hidden="true">
          {Icon ? <Icon size={CHIP_ICON[size]} /> : iconNode}
        </span>
      )}
      {children}
      {count !== undefined && <span className="kk-chip__count">{count}</span>}
    </>
  );

  if ('to' in props && props.to !== undefined) {
    const { to, ...linkRest } = rest as unknown as LinkProps;
    return (
      <Link {...linkRest} to={to} className={cls} aria-current={selected ? 'page' : undefined}>
        {body}
      </Link>
    );
  }

  if ('href' in props && props.href !== undefined) {
    return (
      <a {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} className={cls}>
        {body}
      </a>
    );
  }

  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      {...buttonRest}
      type={buttonRest.type ?? 'button'}
      className={cls}
      // Always stated, never omitted when false: a toggle that only
      // announces itself once it is on reads as a plain button the rest
      // of the time, and the whole point of a chip row is that you can
      // hear which ones are already answering the question.
      aria-pressed={selected}
    >
      {body}
    </button>
  );
}
