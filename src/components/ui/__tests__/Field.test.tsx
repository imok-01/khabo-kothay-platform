import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Field from '../Field';

/**
 * The product had `aria-describedby`, `aria-invalid` and `htmlFor` at zero
 * occurrences before Phase 2c, so the wiring these assertions cover is the
 * reason `Field` exists rather than a convenience. They run through
 * `renderToStaticMarkup` on purpose: it needs no DOM environment and no test
 * renderer, so the a11y contract is checked without adding a dependency.
 */

/**
 * The lookbehind is load-bearing: a bare `id="` also matches inside
 * `aria-invalid="true"`, which silently reads the wrong attribute.
 */
const idOf = (html: string, attr: string) =>
  html.match(new RegExp(`(?<![\\w-])${attr}="([^"]*)"`))?.[1];

describe('Field', () => {
  it('renders the label and the control', () => {
    const html = renderToStaticMarkup(
      <Field label="Restaurant name">
        <input defaultValue="x" />
      </Field>,
    );
    expect(html).toContain('kk-field__label');
    expect(html).toContain('Restaurant name');
    expect(html).toContain('<input');
  });

  it('points the control at its hint', () => {
    const html = renderToStaticMarkup(
      <Field label="Cuisines" hint="Comma separated.">
        <input />
      </Field>,
    );
    const described = idOf(html, 'aria-describedby');
    const hintId = idOf(html, 'id');
    expect(described).toBeTruthy();
    expect(described).toBe(hintId);
    expect(html).toContain('Comma separated.');
  });

  it('marks the control invalid and points it at the message', () => {
    const html = renderToStaticMarkup(
      <Field label="Title" error="Give it a title.">
        <input />
      </Field>,
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('kk-field--invalid');
    expect(html).toContain('role="alert"');
    expect(idOf(html, 'aria-describedby')).toBe(idOf(html, 'id'));
  });

  it('describes the control by hint and error together, in that order', () => {
    const html = renderToStaticMarkup(
      <Field label="Value" hint="Shown to diners." error="Too long.">
        <input />
      </Field>,
    );
    const [hintId, errorId] = (idOf(html, 'aria-describedby') ?? '').split(' ');
    expect(hintId).toBeTruthy();
    expect(errorId).toBeTruthy();
    expect(hintId).not.toBe(errorId);
    expect(html.indexOf(`id="${hintId}"`)).toBeLessThan(html.indexOf(`id="${errorId}"`));
  });

  it('keeps a describedby the caller already set', () => {
    const html = renderToStaticMarkup(
      <Field label="Terms" hint="Optional conditions.">
        <input aria-describedby="legal-note" />
      </Field>,
    );
    expect(idOf(html, 'aria-describedby')).toContain('legal-note');
    expect(idOf(html, 'aria-describedby')?.split(' ').length).toBe(2);
  });

  it('adds nothing when there is nothing to describe', () => {
    const html = renderToStaticMarkup(
      <Field label="Tagline">
        <input />
      </Field>,
    );
    expect(html).not.toContain('aria-describedby');
    expect(html).not.toContain('aria-invalid');
    expect(html).not.toContain('kk-field--invalid');
  });

  it('marks an optional field without putting it in the question', () => {
    const html = renderToStaticMarkup(
      <Field label="Favourite dish" optional>
        <input />
      </Field>,
    );
    expect(html).toContain('kk-field__optional');
    expect(html).not.toContain('(optional)');
  });

  it('hides a label from view while keeping it for assistive tech', () => {
    const html = renderToStaticMarkup(
      <Field label="Search" labelHidden>
        <input />
      </Field>,
    );
    expect(html).toContain('sr-only');
    expect(html).toContain('Search');
  });

  it('renders more than one child untouched rather than dropping any', () => {
    const html = renderToStaticMarkup(
      <Field label="Price" error="Nope.">
        <input />
        <button type="button">Reset</button>
      </Field>,
    );
    expect(html).toContain('<input');
    expect(html).toContain('Reset');
    expect(html).not.toContain('aria-invalid');
  });
});
