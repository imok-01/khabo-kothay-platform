import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { animated, useSpring } from '@react-spring/web';
import type { Restaurant } from '../types';
import { CUISINES, NEIGHBORHOODS } from '../hooks/useTaxonomy';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { getSuggestions, type SearchSuggestion } from '../lib/searchSuggestions';
import { Button } from './ui';

interface SearchBarProps {
  restaurants: Restaurant[];
  variant?: 'hero' | 'nav';
  /** override the form class (used for the mobile menu so it isn't hidden) */
  formClassName?: string;
  initialQuery?: string;
  placeholder?: string;
  /** called after navigation (e.g. to close a mobile menu) */
  onNavigate?: () => void;
  /**
   * Told when the header field opens and closes. The bar's composition
   * answers this — the destination links abbreviate to their icons, and the
   * glass densifies — so Navbar has to know, and only the field can say.
   */
  onOpenChange?: (open: boolean) => void;
}

/**
 * The three widths of the header field, in px because a spring interpolates
 * numbers and cannot read a token. --nav-search-rest mirrors REST_W for the
 * pre-hydration paint; the other two live only here.
 *
 * HINT_W is the reason this is a spring at all. Hovering the pill widens it
 * 16px — not decoration, a statement of what the click is about to do — and
 * because a spring carries velocity, a click during that hover continues the
 * same motion out to OPEN_W instead of restarting a fresh 420ms transition
 * from wherever the box happened to be. Reaching for the field and using it
 * is one gesture, so it should be one movement.
 */
const REST_W = 128;
const HINT_W = 144;
const OPEN_W = 460;

/**
 * Fast to leave, quiet to arrive, and clamped.
 *
 * `clamp: true` is the restraint: an unclamped spring overshoots, and a
 * search field that springs 8px past its width and settles back is a toy.
 * What is wanted is weight — the box leaves immediately and decelerates into
 * position — which is the underdamped curve with its tail cut off. 210/26
 * settles 332px in ~420ms, which is where §5 puts a move of that distance.
 */
const FIELD_SPRING = { tension: 210, friction: 26, clamp: true };
/** The two labels crossing over. Shorter travel, so a stiffer spring. */
const LABEL_SPRING = { tension: 260, friction: 30, clamp: true };

/** Where each suggestion type routes — reuses the existing URL-driven system. */
const TYPE_ROUTE: Record<SearchSuggestion['type'], (v: string) => string> = {
  Restaurant: (v) => `/search?q=${encodeURIComponent(v)}`,
  Cuisine: (v) => `/explore?cuisine=${encodeURIComponent(v)}`,
  Area: (v) => `/explore?location=${encodeURIComponent(v)}`,
  Specialty: (v) => `/explore?specialty=${encodeURIComponent(v)}`,
};

export default function SearchBar({
  restaurants,
  variant = 'hero',
  formClassName,
  initialQuery = '',
  placeholder,
  onNavigate,
  onOpenChange,
}: SearchBarProps) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  /**
   * Focus, tracked separately from `open`. They look like the same thing
   * and are not: `open` is the suggestion list, which survives a blur and
   * only closes on an outside pointerdown or Escape. The pill's width has
   * to follow the *field*, so it needs its own flag.
   */
  const [focused, setFocused] = useState(false);
  /** Pointer over the pill — the 16px anticipation. Never set on a touch
      device, where there is no hover to leave. */
  const [hovered, setHovered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(
    () => getSuggestions(value, { restaurants, cuisines: CUISINES, neighborhoods: NEIGHBORHOODS }),
    [value, restaurants],
  );

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const showMenu = open && suggestions.length > 0;
  const isHero = variant === 'hero';

  const submitFree = () => {
    const q = value.trim();
    setOpen(false);
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
    onNavigate?.();
  };

  const choose = (s: SearchSuggestion) => {
    setOpen(false);
    navigate(TYPE_ROUTE[s.type](s.value));
    onNavigate?.();
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showMenu && suggestions[active]) choose(suggestions[active]);
      else submitFree();
    }
  };

  const formClass = formClassName ?? (isHero ? 'hero__search' : 'nav__search');

  /**
   * Only the bar's own pill collapses. The mobile drawer passes its own
   * `formClassName`, and a field that is the whole width of a sheet has
   * nothing to spread into — so the test is the resolved class, not the
   * variant.
   */
  const isNavPill = formClass === 'nav__search';
  /**
   * Open on focus, and stay open for as long as the field holds a query
   * or has a list under it. Collapsing over the reader's own words hides
   * them, and collapsing under an open list snaps the box shut in the
   * middle of the click that is choosing from it.
   */
  const navOpen = isNavPill && (focused || showMenu || value.trim() !== '');

  /* ------------------------------------------------------------------
     Motion. Three media queries, and each one gates a different thing.

       inBar     the field only has a width of its own where it is a pill
                 on the bar. Below 901px it is hidden for the drawer, and
                 an inline width would leave a 128px hole in the row.
       canHover  a tap sets :hover on a touch device and never clears it,
                 so the anticipation must not exist there at all.
       reduce    springs are not covered by editorial.css §19's blanket —
                 that zeroes CSS durations, and this motion is JS. Every
                 start below passes `immediate`, which lands the field on
                 its target width in one frame with nothing else changed.

     All three start false during prerender and correct on mount, which is
     the right way round: the prerendered HTML carries no inline width, so
     CSS's --nav-search-rest paints the resting pill and the spring adopts
     the identical value on hydration. Nothing moves on first paint (§5.1).
     ------------------------------------------------------------------ */
  const inBar = useMediaQuery('(min-width: 901px)');
  const canHover = useMediaQuery('(hover: hover)');
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');

  const [field, fieldApi] = useSpring(() => ({ w: REST_W, config: FIELD_SPRING }));
  const [label, labelApi] = useSpring(() => ({ t: 0, config: LABEL_SPRING }));

  useEffect(() => {
    if (!isNavPill) return;
    const w = navOpen ? OPEN_W : hovered && canHover ? HINT_W : REST_W;
    fieldApi.start({ w, immediate: reduce });
    labelApi.start({ t: navOpen ? 1 : 0, immediate: reduce });
  }, [isNavPill, navOpen, hovered, canHover, reduce, fieldApi, labelApi]);

  useEffect(() => {
    onOpenChange?.(navOpen);
  }, [navOpen, onOpenChange]);

  /**
   * The two prompts, crossfading, instead of one `placeholder` attribute
   * swapped mid-animation.
   *
   * 128px of pill cannot hold "Search restaurants, cuisines…" — it clipped
   * to "Search restau" — so the short form had to be the resting label and
   * the long one had to arrive with the width. Doing that by rewriting the
   * attribute means the text changes in a single frame, and a hard cut is
   * the one thing in this interaction that always read as machinery.
   *
   * So neither of them is a placeholder. They are two spans in the same
   * place, one leaving 12px to the left as the other arrives from 14px to
   * the right, and the second only starts once the first is gone (the 0.4
   * offset) so they never double-print. The input keeps its `aria-label`,
   * which is what actually names the control.
   */
  const restLabel = {
    opacity: label.t.to((v) => Math.max(0, 1 - v * 2.4)),
    transform: label.t.to((v) => `translate3d(${(-12 * v).toFixed(2)}px, 0, 0)`),
  };
  const openLabel = {
    opacity: label.t.to((v) => Math.max(0, (v - 0.4) / 0.6)),
    transform: label.t.to((v) => `translate3d(${(14 * (1 - v)).toFixed(2)}px, 0, 0)`),
  };

  return (
    <animated.div
      /* The open state is on the wrapper as well as the form, and not for
         tidiness: the wrapper is what carries the animating width in the
         header, because a centred box can only grow both ways if the box
         being centred is the box being resized. polish.css's nav-search
         block has the geometry. */
      className={`search-suggest${navOpen ? ' search-suggest--open' : ''}`}
      ref={rootRef}
      style={isNavPill && inBar ? { width: field.w } : undefined}
    >
      <form
        className={`${formClass}${navOpen ? ' nav__search--open' : ''}`}
        onSubmit={(e) => { e.preventDefault(); submitFree(); }}
        role="search"
        onPointerEnter={isNavPill && canHover ? () => setHovered(true) : undefined}
        onPointerLeave={isNavPill && canHover ? () => setHovered(false) : undefined}
        /* Collapsed, the pill is mostly icon and padding — 128px holding a
           16px mark and 24px of inset — and neither of those focuses an
           input on their own, so a click just left of the word "Search"
           would land on nothing. Handing the whole box to the input is the
           behaviour a reader expects of a search pill. mousedown rather
           than click so focus lands before the caret would be placed, and
           the guard keeps it away from the hero variant's submit button. */
        onMouseDown={
          isNavPill
            ? (e) => {
                if (e.target === inputRef.current) return;
                e.preventDefault();
                inputRef.current?.focus();
              }
            : undefined
        }
      >
        <span className={isHero ? 'hero__search-icon' : 'nav__search-icon'} aria-hidden="true">
          <Search size={isHero ? 18 : 16} />
        </span>
        <input
          ref={inputRef}
          type="search"
          className={isHero ? 'hero__search-input' : undefined}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          placeholder={
            isNavPill
              ? undefined
              : placeholder ?? (isHero ? 'best biryani, Chinese Gulshan, Burger King…' : 'Search restaurants, cuisines…')
          }
          aria-label="Search restaurants"
          aria-expanded={showMenu}
          aria-autocomplete="list"
        />
        {isNavPill && value.trim() === '' && (
          <>
            <animated.span className="nav__search-label" style={restLabel} aria-hidden="true">
              Search
            </animated.span>
            <animated.span className="nav__search-label" style={openLabel} aria-hidden="true">
              Search restaurants, cuisines, areas
            </animated.span>
          </>
        )}
        {isHero && (
          /* `className` carries the hero's own sizing only — the paint is the
             primitive's. `.hero__search-btn` is a layout hook, which is what
             §11 allows a call site to add to a primitive. */
          <Button type="submit" variant="primary" className="hero__search-btn">Search</Button>
        )}
      </form>

      {showMenu && (
        <ul className="search-suggest__menu" role="listbox" aria-label="Search suggestions">
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={`search-suggest__item ${i === active ? 'search-suggest__item--active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(s)}
              >
                <span className="search-suggest__type">{s.type}</span>
                <span className="search-suggest__label">{s.value}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </animated.div>
  );
}
