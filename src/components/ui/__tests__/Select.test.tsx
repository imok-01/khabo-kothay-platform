import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Select from '../Select';

/**
 * `Select` replaces a native `<select>`, which means every guarantee the
 * platform used to make for free is now this file's responsibility — and all
 * of them are attributes. So these read attributes, with
 * `renderToStaticMarkup` and no DOM, the same approach and the same reason as
 * `Disclosure.test.tsx` and `Field.test.tsx`.
 *
 * What cannot be asserted here is the open state: markup is rendered from the
 * initial state, which is closed. That is the right half to lock down anyway —
 * a dangling `aria-controls`, a missing name or a listbox that is only
 * *visually* closed are the defects that ship silently.
 */

/** The lookbehind matters: a bare `id="` also matches inside `aria-controls`. */
const attrOf = (html: string, attr: string) =>
  html.match(new RegExp(`(?<![\\w-])${attr}="([^"]*)"`))?.[1];

const ORDERS = [
  { value: 'recommended', label: 'Best match' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price-low', label: 'Gentlest on the wallet' },
] as const;

const render = (props: Partial<Parameters<typeof Select>[0]> = {}) =>
  renderToStaticMarkup(
    <Select
      value="recommended"
      onChange={() => {}}
      options={ORDERS}
      label="Order results by"
      {...props}
    />,
  );

describe('Select', () => {
  it('names the listbox it controls, and the name resolves to it', () => {
    const html = render();
    const controls = attrOf(html, 'aria-controls');
    expect(controls).toBeTruthy();
    // The listbox stays in the DOM precisely so this reference is never
    // dangling — a `{open && …}` panel would break it on every closed render.
    expect(html).toContain(`id="${controls}"`);
    expect(html).toContain('role="listbox"');
  });

  it('is a combobox that reports itself closed, and takes the panel away', () => {
    const html = render();
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="false"');
    // `hidden` is out of the layout, out of the tab order and out of the
    // accessibility tree in one attribute. `aria-hidden` would leave the rows
    // reachable, which is the defect `Disclosure` was written to end.
    expect(html).toContain('hidden=""');
    expect(html).not.toContain('aria-hidden="true" role="listbox"');
  });

  it('publishes no highlight while it is closed', () => {
    // A stale `aria-activedescendant` would have a screen reader announce a row
    // of a list that is not open.
    expect(render()).not.toContain('aria-activedescendant');
  });

  it('carries the accessible name on both halves, and never as the value', () => {
    const html = render({ prefix: 'Order' });
    // Twice: once on the trigger, once on the listbox.
    expect(html.match(/aria-label="Order results by"/g)).toHaveLength(2);
    // The trigger's visible text IS its value, so the prefix has to be hidden
    // or the value announces as "Order Best match".
    expect(html).toContain('<span class="kk-select__prefix" aria-hidden="true">Order</span>');
  });

  it('shows the chosen label, and marks exactly one row chosen', () => {
    const html = render({ value: 'rating' });
    expect(html).toContain('<span class="kk-select__value">Highest rated</span>');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/aria-selected="false"/g)).toHaveLength(ORDERS.length - 1);
  });

  it('falls back to the placeholder when the value matches no option', () => {
    // `?sortBy=nonsense` in the URL. Showing the first option instead would be
    // the control lying about what it is sorted by.
    const html = render({ value: 'nonsense', placeholder: 'Choose an order' });
    expect(html).toContain('>Choose an order<');
    expect(html).not.toContain('aria-selected="true"');
  });

  it('gives every row an id the trigger can point at', () => {
    const html = render();
    const ids = html.match(/id="[^"]*o\d"/g) ?? [];
    expect(ids).toHaveLength(ORDERS.length);
    expect(new Set(ids).size).toBe(ORDERS.length);
  });

  it('draws the check on every row, chosen or not', () => {
    // The mark holds its column whether or not it is painted, so no label
    // shifts sideways as the selection moves. Opacity does that, in §13.
    const html = render();
    expect(html.match(/kk-select__check/g)).toHaveLength(ORDERS.length);
  });

  it('reports a disabled option as disabled rather than merely greying it', () => {
    const html = render({
      options: [
        { value: 'recommended', label: 'Best match' },
        { value: 'distance', label: 'Nearest first', disabled: true },
      ],
    });
    expect(html).toContain('aria-disabled="true"');
    // Absent, not `false`, on the rows that are fine.
    expect(html).not.toContain('aria-disabled="false"');
  });

  it('carries the alignment and the caller classes without dropping any', () => {
    const html = render({
      align: 'end',
      className: 'disc__sort',
      triggerClassName: 't-extra',
      panelClassName: 'p-extra',
    });
    for (const cls of [
      'kk-select',
      'disc__sort',
      'kk-select__trigger',
      't-extra',
      'kk-select__panel',
      'kk-select__panel--end',
      'p-extra',
    ]) {
      expect(html).toContain(cls);
    }
    // Closed, so the open-state class must not be on the root.
    expect(html).not.toContain('kk-select--open');
  });
});
