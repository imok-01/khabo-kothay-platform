import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { Restaurant } from '../types';
import { CUISINES, NEIGHBORHOODS } from '../hooks/useTaxonomy';
import { getSuggestions, type SearchSuggestion } from '../lib/searchSuggestions';

interface SearchBarProps {
  restaurants: Restaurant[];
  variant?: 'hero' | 'nav';
  /** override the form class (used for the mobile menu so it isn't hidden) */
  formClassName?: string;
  initialQuery?: string;
  placeholder?: string;
  /** called after navigation (e.g. to close a mobile menu) */
  onNavigate?: () => void;
}

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
}: SearchBarProps) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="search-suggest" ref={rootRef}>
      <form className={formClass} onSubmit={(e) => { e.preventDefault(); submitFree(); }} role="search">
        <span className={isHero ? 'hero__search-icon' : 'nav__search-icon'} aria-hidden="true">
          <Search size={isHero ? 18 : 15} />
        </span>
        <input
          type="search"
          className={isHero ? 'hero__search-input' : undefined}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? (isHero ? 'best biryani, Chinese Gulshan, Burger King…' : 'Search restaurants, cuisines…')}
          aria-label="Search restaurants"
          aria-expanded={showMenu}
          aria-autocomplete="list"
        />
        {isHero && (
          <button type="submit" className="btn btn--primary hero__search-btn">Search</button>
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
    </div>
  );
}
