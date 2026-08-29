import { useMemo, useState } from 'react';
import { Search, Check } from 'lucide-react';
import { Button, Dialog } from './ui';

export interface PickerOption {
  value: string;
  label: string;
  /** Optional group header (e.g. FOOD / EXPERIENCE / OCCASION). */
  group?: string;
}

interface PreferencePickerProps {
  title: string;
  options: PickerOption[];
  selected: string[];
  max: number;
  /** Single-select mode: clicking an option applies it immediately. */
  single?: boolean;
  onApply: (values: string[]) => void;
  onClose: () => void;
}

export default function PreferencePicker({ title, options, selected, max, single = false, onApply, onClose }: PreferencePickerProps) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string[]>(selected);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    if (single || !q) return filtered;
    return filtered;
  }, [options, q, single]);

  const groups = useMemo(() => {
    const out: Array<{ group: string | null; options: PickerOption[] }> = [];
    for (const o of visible) {
      const last = out[out.length - 1];
      if (!last || last.group !== (o.group ?? null)) out.push({ group: o.group ?? null, options: [o] });
      else last.options.push(o);
    }
    return out;
  }, [visible]);

  const atLimit = !single && draft.length >= max;

  const toggle = (value: string) => {
    if (single) {
      onApply([value]);
      return;
    }
    setDraft((d) => {
      if (d.includes(value)) return d.filter((v) => v !== value);
      if (d.length >= max) return d;
      return [...d, value];
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      size="sm"
      bodyClassName="pref-picker__body"
      // The search filters the list below it, so it is pinned rather than
      // scrolled away with what it filters.
      toolbar={
        !single ? (
          <div className="pref-picker__search" role="search">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              aria-label={`Search ${title.toLowerCase()}`}
            />
          </div>
        ) : undefined
      }
      footer={
        !single ? (
          <>
            <span className="pref-picker__count">
              {draft.length} of {max} selected
              {atLimit && <span className="pref-picker__limit">You can select up to {max}.</span>}
            </span>
            <div className="pref-picker__actions">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="sm" icon={Check} onClick={() => onApply(draft)}>Done</Button>
            </div>
          </>
        ) : undefined
      }
    >
      <div className="pref-picker__list" role="listbox" aria-multiselectable={!single}>
        {groups.length === 0 && <p className="pref-picker__empty">No matches.</p>}
        {groups.map((g) => (
          <div key={g.group ?? '__'}>
            {g.group && <span className="pref-picker__group">{g.group}</span>}
            {g.options.map((o) => {
              const on = draft.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`pref-picker__option ${on ? 'pref-picker__option--on' : ''}`}
                  onClick={() => toggle(o.value)}
                >
                  <span className={`pref-picker__check ${on ? 'pref-picker__check--on' : ''}`}>
                    {on && <Check size={12} aria-hidden="true" />}
                  </span>
                  {o.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </Dialog>
  );
}
