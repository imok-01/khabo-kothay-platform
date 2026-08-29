import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

/**
 * Disclosure — a question you can put away.
 *
 * KK asks a lot of long questions: six commitments on the homepage, five
 * FAQ answers, a drawer of advanced search preferences. Each one was built
 * separately, and the measured result was four disclosures with four
 * trigger heights — **37.05, 46, 54 and 61.98px** — three radii, four type
 * treatments and three focus treatments.
 *
 * The drift is the smaller half. The larger half is that **three of the
 * four never said what they controlled**: only the homepage's principle
 * rows carried `aria-controls`, so on the other three a screen reader
 * announced "expanded" and gave no way to reach the thing that expanded.
 * One of the four sat at 37px, the only disclosure trigger in the product
 * under the 44px floor. And the FAQ marked its collapsed answer
 * `aria-hidden` while leaving it in the tab order — the wrong half of the
 * job, since `aria-hidden` hides a thing from the screen reader and still
 * lets the keyboard land inside it.
 *
 * So this primitive owns **behaviour and wiring, not appearance**. The
 * four surfaces look different on purpose — a bordered card on the FAQ
 * page, a ruled row on the homepage's ink band, a pill in the hero
 * console — and flattening them into one look would be the "force one
 * style everywhere" mistake rather than a fix. What converges is the pair:
 * the ids, `aria-expanded` / `aria-controls`, the 44px target, the focus
 * ring, the marker and its rotation, and how a panel is taken away.
 *
 * **How a panel is taken away** is the one real decision here. Default is
 * `hidden`, which removes the panel from the layout, the tab order and the
 * accessibility tree in one attribute — three answers for the price of
 * one, and no measurement. `animate` opts into a height transition
 * instead, and then the panel has to stay in the DOM to be animated, so it
 * is marked `inert`: not focusable, not announced, still measurable. That
 * is the correct pair for a panel that is visually collapsed but present.
 *
 * docs/KK_VISUAL_DIRECTION.md §2 (shape), §5 (motion), §7 (focus),
 * §11 (the primitive layer).
 */

export type DisclosureVariant = 'card' | 'row' | 'inline';
export type DisclosureMarker = 'chevron' | 'plus' | 'none';
export type DisclosureGround = 'paper' | 'ink';

/** §8's control step. A disclosure marker is a control mark, not a label mark. */
const MARKER_ICON = 16;

export interface DisclosureProps {
  /** The always-visible half: the question, the row title, the toggle label. */
  summary: ReactNode;
  /** The half that can be put away. */
  children: ReactNode;
  /**
   * Controlled state. Pass this with `onToggle` when something outside owns
   * the answer — an accordion that allows one open row at a time cannot be
   * assembled out of components that each keep their own.
   */
  open?: boolean;
  onToggle?: (next: boolean) => void;
  /** Starting state when nothing outside is holding it. */
  defaultOpen?: boolean;
  /**
   * `card` is a bordered surface, `row` a ruled row, `inline` a pill
   * trigger with a boxed panel under it. Appearance only — every variant
   * gets the same wiring.
   */
  variant?: DisclosureVariant;
  /** `chevron` turns 180°; `plus` turns 45° into a close mark. */
  marker?: DisclosureMarker;
  /** Ink grounds need their own focus colour and rule — see §3. */
  ground?: DisclosureGround;
  /**
   * Wrap the trigger in a heading when the summary *is* the section
   * heading. Without this a screen reader's heading list loses the row;
   * with the wrong level the page outline breaks instead, which is why it
   * is the caller's call and not a default.
   */
  headingLevel?: 2 | 3 | 4;
  /**
   * Animate the panel's height instead of hiding it outright. Costs one
   * layout read per open and keeps the panel mounted and `inert`.
   */
  animate?: boolean;
  /**
   * Shown beside the trigger and outside it — what a closed panel is
   * holding, so the answer does not have to be reopened to be checked.
   */
  aside?: ReactNode;
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
}

export default function Disclosure({
  summary,
  children,
  open,
  onToggle,
  defaultOpen = false,
  variant = 'card',
  marker = 'chevron',
  ground = 'paper',
  headingLevel,
  animate = false,
  aside,
  className,
  triggerClassName,
  panelClassName,
}: DisclosureProps) {
  const panelId = useId();
  const [selfOpen, setSelfOpen] = useState(defaultOpen);
  const controlled = open !== undefined;
  const isOpen = controlled ? open : selfOpen;

  const inner = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  // `height: auto` is not interpolable in any browser, so the open height
  // has to be a number. It is read off the *inner* element, which is never
  // height-constrained, so the measurement is valid while the panel outside
  // it is still collapsed to zero. Running on mount as well as on each open
  // means the first press animates in the same frame as every later one.
  //
  // The measurement is kept live, not taken once per open. A number written
  // onto a box with `overflow: hidden` goes stale the moment its content
  // reflows for any reason — a viewport change, a webfont landing, a child
  // that grew — and stale here does not mean a slightly wrong animation, it
  // means silently clipped content. That was reproducible: open a panel at
  // desktop width, narrow to a phone, and the last paragraph was cut through
  // the middle of a line. A ResizeObserver on the inner box catches all of
  // those causes, where a `resize` listener catches only one of them.
  //
  // Observing `inner` cannot feed back into itself: what changes in response
  // is the *panel's* height, and `inner` is an unconstrained block inside it
  // whose own height is its content's.
  //
  // `useEffect` and not `useLayoutEffect`: this component renders during
  // prerender for 219 routes, and a layout effect there is a warning with
  // nothing to gain — a closed panel's correct prerendered height is 0.
  useEffect(() => {
    const el = inner.current;
    if (!animate || !el) return;
    const measure = () => setPanelHeight(el.scrollHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [animate, isOpen]);

  const toggle = () => {
    const next = !isOpen;
    if (!controlled) setSelfOpen(next);
    onToggle?.(next);
  };

  const cls = [
    'kk-disc',
    `kk-disc--${variant}`,
    ground === 'ink' && 'kk-disc--ink',
    isOpen && 'kk-disc--open',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const trigger = (
    <button
      type="button"
      className={['kk-disc__trigger', triggerClassName].filter(Boolean).join(' ')}
      // Both, always. `aria-expanded` alone says a thing opened and leaves
      // no way to reach it; three of the four disclosures this replaces
      // shipped exactly that.
      aria-expanded={isOpen}
      aria-controls={panelId}
      onClick={toggle}
    >
      <span className="kk-disc__summary">{summary}</span>
      {marker !== 'none' && (
        <span className={`kk-disc__marker kk-disc__marker--${marker}`} aria-hidden="true">
          {marker === 'plus' ? <Plus size={MARKER_ICON} /> : <ChevronDown size={MARKER_ICON} />}
        </span>
      )}
    </button>
  );

  const Heading = headingLevel ? (`h${headingLevel}` as 'h2' | 'h3' | 'h4') : null;
  const head = Heading ? <Heading className="kk-disc__heading">{trigger}</Heading> : trigger;

  return (
    <div className={cls}>
      {aside ? (
        <div className="kk-disc__head">
          {head}
          {aside}
        </div>
      ) : (
        head
      )}
      {animate ? (
        <div
          className={['kk-disc__panel', 'kk-disc__panel--animated', panelClassName]
            .filter(Boolean)
            .join(' ')}
          id={panelId}
          style={{ height: isOpen ? panelHeight : 0 }}
          // Not `aria-hidden`. A collapsed panel that is still in the DOM
          // has to leave the tab order too, or the keyboard walks into
          // something the screen reader has been told is not there.
          inert={!isOpen}
        >
          <div className="kk-disc__panel-inner" ref={inner}>
            {children}
          </div>
        </div>
      ) : (
        <div
          className={['kk-disc__panel', panelClassName].filter(Boolean).join(' ')}
          id={panelId}
          hidden={!isOpen}
        >
          {children}
        </div>
      )}
    </div>
  );
}
