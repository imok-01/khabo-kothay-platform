import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';

/**
 * Button — the KK commit control.
 *
 * This does not introduce a new look. `.btn` and its variants have been
 * the product's button since Phase 0 and are unchanged; what was missing
 * was a single place that decides *what a button is made of*, so the
 * decisions kept being re-made at 128 call sites. Three of them were
 * being re-made wrongly:
 *
 *  - **Icon size.** §8 gives 16 to an icon that labels a control. Every
 *    call site wrote that number by hand, and six of them wrote 15
 *    instead. The `icon` prop takes the component and sizes it here, so
 *    the number cannot drift again.
 *  - **Busy.** Around ten buttons swap their own label while a request
 *    is in flight ("Sending code…", "Submitting…") and otherwise sit
 *    perfectly still, so the only evidence of work was a word changing.
 *    `busy` adds the spinner and `aria-busy`, and swallows the click.
 *  - **Unavailable.** `disabled` removes a control from the tab order
 *    entirely, so a keyboard user cannot reach it and a screen reader
 *    never announces it — which is the wrong answer for "not yet
 *    available", the case KK uses it for most. `unavailable` uses
 *    `aria-disabled` instead: same quiet paint, still reachable, and
 *    `unavailableReason` gives it something to say. Plain `disabled`
 *    stays available for the cases that genuinely warrant it.
 *
 * It renders a `<button>`, a router `<Link>` (`to`) or an `<a>` (`href`)
 * from one contract, because a commit action that navigates is still a
 * commit action and should not have to be restyled to look like one.
 *
 * docs/KK_VISUAL_DIRECTION.md §2 (shape), §3 (colour), §8 (icons).
 */

export type ButtonVariant = 'primary' | 'accent' | 'ghost' | 'subtle' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** §8: an icon that labels a control is 16. Not a per-call-site choice. */
const CONTROL_ICON = 16;

interface ButtonOwnProps {
  /**
   * `primary` is the one real commit action in a view; `accent` is the one
   * commercial action (claim, redeem) and is never navigation; `ghost` is
   * the default for everything else; `subtle` is a text action that still
   * needs a 44px target. §3.
   *
   * `danger` is the destructive half of a decision — reject, delete,
   * discard. It exists because the executive console's six Reject buttons
   * were all `subtle`, which is the same paint as a benign text action: the
   * irreversible half of an Approve/Reject pair carried no signal at all.
   * It follows `IconButton`'s `danger` tone rather than inventing a second
   * language — quiet at rest, red on hover, which is the moment it matters.
   */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Fills its container. */
  block?: boolean;
  /** Leading icon, sized to the ladder. Replaced by the spinner while busy. */
  icon?: LucideIcon;
  /** Trailing icon — an arrow, a chevron. Same size. */
  iconAfter?: LucideIcon;
  /** A request is in flight: shows the spinner, sets `aria-busy`, blocks clicks. */
  busy?: boolean;
  /** Not yet available. Quiet, still focusable, still announced. */
  unavailable?: boolean;
  /** Why it is unavailable — becomes the control's `title`. */
  unavailableReason?: string;
  children?: ReactNode;
}

type NativeButtonProps = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & {
    to?: never;
    href?: never;
  };

type RouterLinkProps = ButtonOwnProps &
  Omit<LinkProps, keyof ButtonOwnProps> & { href?: never };

type ExternalLinkProps = ButtonOwnProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonOwnProps> & {
    href: string;
    to?: never;
  };

export type ButtonProps = NativeButtonProps | RouterLinkProps | ExternalLinkProps;

/** The class contract. Kept here so `.btn` markup and this component cannot diverge. */
function buttonClass(
  variant: ButtonVariant,
  size: ButtonSize,
  block: boolean,
  busy: boolean,
  extra?: string,
) {
  return [
    'btn',
    `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    block && 'btn--block',
    busy && 'btn--busy',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

export default function Button(props: ButtonProps) {
  const {
    variant = 'ghost',
    size = 'md',
    block = false,
    icon: Icon,
    iconAfter: IconAfter,
    busy = false,
    unavailable = false,
    unavailableReason,
    className,
    children,
    ...rest
  } = props as ButtonOwnProps & { className?: string } & Record<string, unknown>;

  const inert = busy || unavailable;

  const body = (
    <>
      {busy ? (
        <span className="kk-spinner" aria-hidden="true" />
      ) : (
        Icon && <Icon size={CONTROL_ICON} aria-hidden="true" />
      )}
      {children}
      {/* `btn__after` is the travel contract, not decoration: §1 moves a
          trailing icon 3px towards where it points when the control is
          hovered or focused. It has to be a class because CSS cannot
          distinguish a leading icon from a trailing one — text nodes are
          invisible to `:last-child`, so `svg:last-child` matches both. */}
      {IconAfter && <IconAfter size={CONTROL_ICON} aria-hidden="true" className="btn__after" />}
    </>
  );

  const shared = {
    className: buttonClass(variant, size, block, busy, className),
    'aria-disabled': inert || undefined,
    'aria-busy': busy || undefined,
    title: (unavailable ? unavailableReason : undefined) ?? (rest.title as string | undefined),
  };

  // A link cannot be `disabled`, so an inert link stops being a link: no
  // destination, and it leaves the tab order the way a spent control
  // should. `role="link"` is dropped with it so nothing announces a
  // navigation that will not happen.
  if ('to' in props && props.to !== undefined) {
    const { to, ...linkRest } = rest as unknown as LinkProps;
    if (inert) {
      return (
        <span {...shared} role="link" aria-disabled="true">
          {body}
        </span>
      );
    }
    return (
      <Link {...linkRest} to={to} {...shared}>
        {body}
      </Link>
    );
  }

  if ('href' in props && props.href !== undefined) {
    const anchorRest = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    if (inert) {
      return (
        <span {...shared} role="link" aria-disabled="true">
          {body}
        </span>
      );
    }
    return (
      <a {...anchorRest} {...shared}>
        {body}
      </a>
    );
  }

  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      {...buttonRest}
      type={buttonRest.type ?? 'button'}
      {...shared}
      // `unavailable` deliberately does NOT set the `disabled` attribute —
      // that is what keeps the control focusable and announced. The guard
      // has to live here instead, or an aria-disabled button would still
      // fire its handler.
      onClick={inert ? undefined : buttonRest.onClick}
    >
      {body}
    </button>
  );
}

