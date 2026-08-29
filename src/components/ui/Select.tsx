import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useScrollFade } from '../../hooks/useScrollFade';

/**
 * Select — a list of mutually exclusive choices, drawn by us.
 *
 * The control this replaces was a native `<select>` with its chrome styled
 * away: `appearance: none`, a hairline pill, our own chevron. That covers the
 * closed state and nothing else. **The open list is drawn by the operating
 * system**, outside the page — `option` accepts almost no CSS, there is no
 * pseudo-element for the popup, and no stylesheet in this repo can reach it.
 * So the one moment the control is actually being *used* was the one moment
 * the product's paper, espresso and saffron, its 14px radius and its Manrope
 * were all absent, replaced by a system rectangle with a system highlight.
 * A styled trigger and a stock menu is a worse impression than an unstyled
 * pair, because the seam is what the eye lands on.
 *
 * **This reverses a decision recorded in explore-scene.css** — that the sort
 * control should keep the native picker because the platform's list is better
 * on a phone than anything we would draw. The argument was about touch, so it
 * is answered by the drawing rather than by delegating: rows take the product's
 * 44px floor wherever the pointer is coarse (primitives.css §13), the panel
 * scrolls with momentum containment, and every dismissal route a person
 * expects is wired below. What the platform picker was really buying was
 * keyboard and screen-reader behaviour for free, and that is the part this
 * file has to earn back rather than assume.
 *
 * **Focus never leaves the trigger.** This is ARIA's select-only combobox:
 * the button carries `role="combobox"`, and which row you are on is published
 * as `aria-activedescendant` pointing into the listbox it `aria-controls`.
 * The alternative — moving real DOM focus row to row — costs a focus trap, a
 * focusout race on every internal move, and a return-focus path on four
 * dismissal routes. It would also make the active row's *appearance* depend on
 * `:focus-visible`, which is a browser heuristic; here the row is painted from
 * `data-active`, which is a fact in the DOM and can be asserted.
 *
 * **Selection commits on Enter or a press, never on an arrow key.** A Windows
 * `<select>` changes value as you arrow through it, and copying that here
 * would be wrong for a reason specific to the call site: `onChange` writes the
 * URL and fires the `sort_changed` measurement, so arrowing to the sixth order
 * would push five history entries and five analytics events nobody chose.
 * Arrows move a highlight; Enter, Space, Tab or a press commit it. Re-picking
 * the value that is already selected calls nothing at all.
 *
 * **The listbox is always in the DOM, `hidden` when closed.** `aria-controls`
 * has to resolve to a real element — a dangling reference is the same class of
 * defect `Disclosure` was built to end — and `hidden` is the one attribute
 * that takes a panel out of the layout, the tab order and the accessibility
 * tree together. It also keeps `renderToStaticMarkup` viable as the test
 * surface, which matters because there is no jsdom in this repo. The entrance
 * survives it: a CSS animation restarts when an element becomes displayed.
 *
 * docs/KK_VISUAL_DIRECTION.md §2 (shape), §5 (motion), §7 (one focus system),
 * §8 (the icon step), §11 (the primitive layer). Paint: primitives.css §13 —
 * no colour, no radius and no width is written in this file.
 */

/** §8's control step — the trigger's chevron and the chosen row's check. */
const SELECT_ICON = 16;

/** Keep the panel this far off the viewport edge before flipping it above. */
const EDGE_GUTTER = 12;

/**
 * The least room the panel is ever clamped to: one row and the panel's rim.
 *
 * The floor is deliberately this low. Anything larger overhangs the edge on a
 * short window — measured at 260px tall with the trigger mid-screen, a 120px
 * floor put the first row half off the top with no way to scroll to it, while
 * clamping honestly to the 92px available showed two rows and reached all six.
 * A short list that scrolls beats a taller one with a row hidden outside the
 * viewport, so overhang is only accepted below the height of a single row.
 */
const MIN_ROOM = 64;

/** How long a typed run stays open before it starts a new search. */
const TYPE_WINDOW = 600;

export interface SelectOption<V extends string = string> {
  value: V;
  /** What the row reads, and what the trigger shows once it is chosen. */
  label: string;
  disabled?: boolean;
}

/**
 * Which edge of the trigger the panel hangs from. `end` is for a control that
 * already sits at the right of its row, where a left-anchored panel would
 * reach out past the column it belongs to.
 */
export type SelectAlign = 'start' | 'end';

export interface SelectProps<V extends string = string> {
  value: V;
  /** Called only when the committed value actually differs from `value`. */
  onChange: (value: V) => void;
  options: readonly SelectOption<V>[];
  /**
   * The accessible name, on both the trigger and the listbox — "Order results
   * by", not "Best match". The trigger's visible text is its *value*, which is
   * how a combobox announces itself, so the name has to come from here.
   */
  label: string;
  /**
   * A small caps word before the value ("Order"). `aria-hidden`, because
   * `label` already carries that meaning and reading both would announce the
   * value as "Order Best match".
   */
  prefix?: ReactNode;
  align?: SelectAlign;
  /** Shown when `value` matches no option — a bad URL parameter, usually. */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
}

export default function Select<V extends string = string>({
  value,
  onChange,
  options,
  label,
  prefix,
  align = 'start',
  placeholder = 'Choose',
  disabled = false,
  className,
  triggerClassName,
  panelClassName,
}: SelectProps<V>) {
  const [open, setOpen] = useState(false);
  /** The highlight, not the selection. −1 while closed. */
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Two nodes for one menu. `panelRef` is the frame — ground, hairline, shadow,
  // placement — and `listRef` is the listbox inside it, which is the thing that
  // scrolls and the thing whose edges fade. They cannot be the same element: a
  // `mask-image` clips away the box-shadow of whatever carries it and turns that
  // element's own background transparent wherever it fades, so a one-element
  // panel would trade its shadow for the fade and show the page through its
  // top and bottom edges.
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { measure, onScroll } = useScrollFade();
  const typed = useRef({ text: '', at: 0 });

  const baseId = useId();
  const listId = `${baseId}list`;
  const optionId = (index: number) => `${baseId}o${index}`;

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : placeholder;

  /** First selectable option from `from`, walking `step`. −1 if there is none. */
  const seek = (from: number, step: number) => {
    for (let i = from; i >= 0 && i < options.length; i += step) {
      if (!options[i].disabled) return i;
    }
    return -1;
  };

  const reveal = (index: number) => {
    setActiveIndex(index >= 0 ? index : seek(0, 1));
    setOpen(true);
  };

  const dismiss = (returnFocus: boolean) => {
    setOpen(false);
    setActiveIndex(-1);
    if (returnFocus) triggerRef.current?.focus();
  };

  /**
   * Commit. `returnFocus` is false for the Tab route only, where the browser is
   * already taking focus somewhere better than back here.
   */
  const choose = (index: number, returnFocus = true) => {
    const option = index >= 0 ? options[index] : undefined;
    dismiss(returnFocus);
    if (option && !option.disabled && option.value !== value) onChange(option.value);
  };

  /**
   * Typeahead. A run of characters inside `TYPE_WINDOW` searches for a label
   * starting with the run; a single character steps to the *next* match, which
   * is what makes pressing "m" twice walk through both "Most …" orders. Wraps,
   * because a search that stops at the end of the list feels broken.
   */
  const search = (char: string) => {
    const now = Date.now();
    const run = (now - typed.current.at < TYPE_WINDOW ? typed.current.text : '') + char.toLowerCase();
    typed.current = { text: run, at: now };
    const from = run.length === 1 ? Math.max(activeIndex, -1) + 1 : Math.max(activeIndex, 0);
    for (let k = 0; k < options.length; k += 1) {
      const i = (from + k) % options.length;
      const option = options[i];
      if (!option.disabled && option.label.toLowerCase().startsWith(run)) return i;
    }
    return -1;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const { key } = event;

    // Space and Enter are the button's own activation keys, so they are taken
    // before the printable-character branch can read them as a search.
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (open) choose(activeIndex);
      else reveal(selectedIndex);
      return;
    }
    if (key === 'Escape') {
      if (open) {
        event.preventDefault();
        dismiss(true);
      }
      return;
    }
    if (key === 'Tab') {
      if (open) choose(activeIndex, false);
      return;
    }

    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End') {
      event.preventDefault();
      const last = options.length - 1;
      if (!open) {
        // Opening from a keypress lands on the current choice, not on the top of
        // the list, so the first arrow moves one step from where you are.
        if (key === 'Home') reveal(seek(0, 1));
        else if (key === 'End') reveal(seek(last, -1));
        else reveal(selectedIndex >= 0 ? selectedIndex : seek(key === 'ArrowUp' ? last : 0, key === 'ArrowUp' ? -1 : 1));
        return;
      }
      let next = -1;
      if (key === 'Home') next = seek(0, 1);
      else if (key === 'End') next = seek(last, -1);
      else if (key === 'ArrowDown') next = seek(activeIndex + 1, 1);
      else next = activeIndex <= 0 ? -1 : seek(activeIndex - 1, -1);
      // No wrap on the arrows: a highlight that jumps from the last row to the
      // first hides how long the list is. Ends are ends.
      if (next >= 0) setActiveIndex(next);
      return;
    }

    if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const hit = search(key);
      if (hit >= 0) {
        event.preventDefault();
        setActiveIndex(hit);
        setOpen(true);
      }
    }
  };

  // A press anywhere else closes the panel, and does NOT take focus back —
  // the press is already on its way somewhere. Capture phase, so a control
  // that stops propagation cannot leave the panel open behind it. The two
  // setters are written out rather than calling `dismiss`, which is a fresh
  // closure every render and would put the effect on a re-subscribe treadmill.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setActiveIndex(-1);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);


  /**
   * Choose a side, then tell the stylesheet how much room that side actually
   * has. `useEffect`, not `useLayoutEffect`, because this component renders
   * during the 219-route prerender and the layout hook warns there — the
   * correction lands inside the panel's own 160ms entrance, where it is not a
   * visible jump.
   *
   * Flipping alone is not enough: on a short window (a laptop with the dev
   * tools open, a phone in landscape) *neither* side fits, and an unclamped
   * panel then hangs off the edge with its first rows unreachable — page scroll
   * cannot help, because the panel is positioned against the trigger and
   * travels with it. So the room is published as `--kk-select-room` and §13
   * takes it as one more term in the panel's `max-height`, which turns the
   * overflow into the panel's own scroll.
   *
   * `scrollHeight`, not `offsetHeight`, is what "would it fit" has to ask:
   * once the clamp is on, `offsetHeight` *is* the clamp, so the comparison
   * would come back yes-it-fits and the flip would never fire again.
   */
  useEffect(() => {
    if (!open) {
      setPlacement('bottom');
      return;
    }
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    const list = listRef.current;
    if (!trigger || !panel || !list) return;
    const box = trigger.getBoundingClientRect();
    const panelBox = panel.getBoundingClientRect();
    // The gap §13 puts between the two, measured rather than duplicated here,
    // from whichever side the panel is currently on.
    const gap = Math.max(
      0,
      placement === 'top' ? box.top - panelBox.bottom : panelBox.top - box.bottom,
    );
    const below = window.innerHeight - box.bottom - gap - EDGE_GUTTER;
    const above = box.top - gap - EDGE_GUTTER;
    // The list, not the frame: the frame clips to whatever the list is allowed
    // to be, so its `scrollHeight` *is* the clamp and would always say it fits.
    const next = list.scrollHeight > below && above > below ? 'top' : 'bottom';
    setPlacement(next);
    // A floor, because a panel clamped to nothing shows nothing at all — but a
    // low one, since anything above the real room hangs off the edge.
    const room = Math.max(next === 'top' ? above : below, MIN_ROOM);
    // On the frame, because `--kk-select-room` is a custom property and reaches
    // the list by inheritance — one write, and the frame stays the node that
    // owns placement.
    panel.style.setProperty('--kk-select-room', `${Math.round(room)}px`);
    measure(list);
  }, [open, placement, measure]);

  /**
   * Keep the highlight in view — but only when the panel is the thing that
   * scrolls. `block: 'nearest'` still walks up to the document when the panel
   * itself has no overflow, which would scroll the page under an open menu.
   */
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const list = listRef.current;
    if (!list || list.scrollHeight <= list.clientHeight) return;
    list.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
    measure(list);
  }, [open, activeIndex, measure]);

  const rootClass = ['kk-select', open && 'kk-select--open', className].filter(Boolean).join(' ');

  return (
    <div
      ref={rootRef}
      className={rootClass}
      // Focus leaving the whole control closes it. Nothing inside the panel is
      // focusable, so this only ever fires for a genuine exit.
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={['kk-select__trigger', triggerClassName].filter(Boolean).join(' ')}
        role="combobox"
        aria-label={label}
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        disabled={disabled}
        onClick={() => (open ? dismiss(true) : reveal(selectedIndex))}
        onKeyDown={onKeyDown}
      >
        {prefix != null && (
          <span className="kk-select__prefix" aria-hidden="true">
            {prefix}
          </span>
        )}
        <span className="kk-select__value">{selectedLabel}</span>
        <ChevronDown className="kk-select__chevron" size={SELECT_ICON} aria-hidden="true" />
      </button>

      {/* The frame. It carries the placement, the alignment and the caller's
          `panelClassName`, because those all describe where the menu is and
          what it belongs to — and `hidden`, so one attribute still takes the
          whole menu out of the layout, the tab order and the accessibility
          tree. The listbox itself is inside it. */}
      <div
        ref={panelRef}
        className={['kk-select__panel', `kk-select__panel--${align}`, panelClassName]
          .filter(Boolean)
          .join(' ')}
        data-placement={placement}
        hidden={!open}
      >
        <ul
          ref={listRef}
          id={listId}
          className="kk-select__panel-list"
          role="listbox"
          aria-label={label}
          onScroll={onScroll}
          /* Row count, so a menu that opened upward can run its arrival from
             the bottom row — out of the trigger — rather than into it. */
          style={{ '--n': options.length } as CSSProperties}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              className="kk-select__opt"
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              // The highlight is published as data, not inferred from focus: no
              // element inside this panel is ever focused, so `:focus-visible`
              // has nothing to say about which row you are on.
              data-active={index === activeIndex || undefined}
              style={{ '--i': index } as CSSProperties}
              // Pressing a row must not blur the trigger. A `<li>` is not
              // focusable, so mousedown would move focus to the body, the blur
              // handler above would close the panel, and the click would land on
              // a row that had already gone.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => !option.disabled && choose(index)}
              onMouseEnter={() => !option.disabled && setActiveIndex(index)}
            >
              <Check className="kk-select__check" size={SELECT_ICON} aria-hidden="true" />
              <span className="kk-select__opt-label">{option.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}





