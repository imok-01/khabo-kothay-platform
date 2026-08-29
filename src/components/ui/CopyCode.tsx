import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import IconButton from './IconButton';

/**
 * CopyCode — a code and the act of taking it, as one thing.
 *
 * Three codes ship in the product and every one of them exists to be used
 * somewhere else: a redeemed reward's coupon code, the coupon stub's own
 * code, and a diner's referral code. All three were rendered as text. The
 * only way to get `KKFREE-XTQE` out of the page and into a message was to
 * drag-select eight characters of 13px mono — on a phone, inside a card,
 * next to a scrollable list. A code you cannot copy is a code you have to
 * transcribe, and the product asked people to transcribe three of them.
 *
 * So this is not "a button beside a code": the value and its copy control
 * are one component, because they are never useful apart, and because
 * making them one is what keeps the accessible name, the confirmation and
 * the mono type from being re-decided at each of the three sites.
 *
 * Two things worth knowing about the implementation:
 *
 *  1. **The clipboard has three tiers, and the last one is honest.**
 *     `navigator.clipboard` needs a secure context, which `localhost` and
 *     production both are — but a phone opening the dev server over the
 *     LAN (`http://192.168.x.x:5173`) is not, and that is exactly how this
 *     gets tested here. Tier two is the pre-2020 hidden-`textarea` +
 *     `execCommand` route, which still works in that case. If both fail
 *     the component *selects the code* and says so, instead of showing a
 *     check mark for a copy that never happened — a false confirmation on
 *     a coupon code is worse than no button.
 *
 *  2. **The confirmation is a live region, not a renamed button.** The
 *     mark swaps to a check for 1.8s, and an `sr-only` `role="status"`
 *     announces `"<code> copied"`. Renaming the button instead would make
 *     a screen reader re-announce the *control* the moment it was pressed,
 *     which reads as the button having changed rather than the copy having
 *     succeeded.
 *
 * The `plate` variant carries its own ground: mono, tracked, on a soft
 * accent wash, so a code reads as a token to be taken rather than as a
 * sentence. `inline` adds no ground at all — for the coupon stub, which is
 * already a dashed ticket and would otherwise be a box inside a box.
 *
 * docs/KK_VISUAL_DIRECTION.md §2 (shape), §8 (icons), §11 (primitives).
 */

export type CopyCodeVariant = 'plate' | 'inline';
export type CopyCodeSize = 'sm' | 'md';

/** How long the check mark holds before the control returns to rest. */
const CONFIRM_MS = 1800;

export interface CopyCodeProps {
  /** The code itself — displayed, and what lands on the clipboard. */
  value: string;
  /**
   * The copy button's accessible name. Defaults to something true rather
   * than to `"Copy"`, which tells a screen-reader user nothing about
   * which of a page's codes they are on.
   */
  label?: string;
  /** `sm` in a card foot, `md` where the code is the subject. */
  size?: CopyCodeSize;
  /** `plate` brings its own ground; `inline` inherits the surrounding type. */
  variant?: CopyCodeVariant;
  className?: string;
}

type State = 'idle' | 'copied' | 'manual';

/**
 * Tier one, then tier two. Returns false only when the clipboard is
 * genuinely unreachable, which is the case the caller has to tell the
 * truth about.
 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Denied permission or an insecure context — fall through rather than
    // reporting success.
  }
  try {
    const holder = document.createElement('textarea');
    holder.value = text;
    // Off-screen rather than `display: none`: a hidden element cannot be
    // selected, and selection is what `execCommand` copies.
    holder.setAttribute('readonly', '');
    holder.style.position = 'fixed';
    holder.style.top = '-9999px';
    document.body.appendChild(holder);
    holder.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(holder);
    return ok;
  } catch {
    return false;
  }
}

export default function CopyCode({
  value,
  label = `Copy code ${value}`,
  size = 'md',
  variant = 'plate',
  className,
}: CopyCodeProps) {
  const [state, setState] = useState<State>('idle');
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The timeout outlives the component at both call sites that can unmount
  // mid-confirmation: redeeming re-renders the reward card, and the wallet
  // is a route away from a page that replaces it.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const hold = (next: State) => {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), CONFIRM_MS);
  };

  const onCopy = async () => {
    if (await writeClipboard(value)) {
      hold('copied');
      return;
    }
    // Last tier: put the code under the cursor so the person can take it
    // with the keyboard, and say that is what happened.
    const node = valueRef.current;
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    if (node && selection) {
      const range = document.createRange();
      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    hold('manual');
  };

  return (
    <span
      className={['kk-code', `kk-code--${variant}`, `kk-code--${size}`, className]
        .filter(Boolean)
        .join(' ')}
      data-state={state}
    >
      <span className="kk-code__value" ref={valueRef}>
        {value}
      </span>
      <IconButton
        icon={state === 'copied' ? Check : Copy}
        label={label}
        size={size}
        className="kk-code__btn"
        onClick={onCopy}
      />
      {/* Empty at rest, so nothing is announced until something happens. */}
      <span className="sr-only" role="status">
        {state === 'copied'
          ? `${value} copied`
          : state === 'manual'
            ? `${value} is selected — copy it with your keyboard`
            : ''}
      </span>
    </span>
  );
}
