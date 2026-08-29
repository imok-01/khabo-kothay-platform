import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';

/**
 * Field — a label, one control, and the two things the control may need to
 * say about itself.
 *
 * The product had a `.field` convention and it worked, in the sense that
 * 34 blocks all wrote the same four lines by hand. What it did not have was
 * anywhere for the *behaviour* to live, and three things fell through that
 * gap:
 *
 * 1. `.field__error` painted `var(--error)`, a token this codebase never
 *    defines. An undefined custom property with no fallback is invalid at
 *    computed-value time, so `color` resolved to `inherit` and every
 *    validation message in the product rendered in body ink. Measured
 *    against a sentinel parent: the five errors in the offers form came
 *    back as the parent's colour, not red.
 * 2. Nothing was wired for assistive tech. `aria-describedby`,
 *    `aria-invalid` and `htmlFor` each appear **zero** times in the
 *    product. The wrapping `<label>` does give implicit association, so
 *    the *name* was fine — but a hint was never announced, and an input
 *    holding an error never said that it was invalid.
 * 3. The same class rendered two different designs depending on whether an
 *    ancestor happened to carry `.admin` / `.profile-body` / `.auth-card`:
 *    10px radius vs 14px, 14px type vs 13px, `--border-strong` vs
 *    `--border`, and two different focus treatments, neither of them §7's.
 *
 * So the component owns the wiring and `primitives.css` §6 owns the paint
 * for both this and the legacy `.field`, which is why the 34 unmigrated
 * blocks get the unified design without being edited.
 *
 * `label` is required, like `IconButton`'s. A field whose label is optional
 * grows unlabelled fields.
 *
 * docs/KK_VISUAL_DIRECTION.md §1 (label type), §2 (radius), §7 (focus).
 */

export interface FieldProps {
  /** Required. The visible question. */
  label: ReactNode;
  /**
   * Standing guidance — always announced, error or not. Distinct from
   * `error`: a hint explains the field, an error reports a specific answer.
   */
  hint?: ReactNode;
  /** Truthy switches the control to its invalid state and announces this. */
  error?: ReactNode;
  /**
   * Renders the quiet mark instead of the "(optional)" three call sites
   * currently type into the label text, where it reads at label weight and
   * competes with the question.
   */
  optional?: boolean;
  /** Keeps the label for assistive tech and takes it off the screen. */
  labelHidden?: boolean;
  /**
   * The labelled thing is a *set* of controls — a rating radiogroup, a row of
   * chips, a pair of tabs — rather than one input.
   *
   * Three blocks in the product needed this and none of them could use
   * `Field`, because a `<label>` may only be associated with a single
   * labelable control; wrapping five star buttons in one is invalid, and
   * browsers resolve it by forwarding every click to the first control. So
   * all three hand-wrote `<div>` + `.field__label` and, having left the
   * primitive, lost the association entirely: the rating group carried its
   * own `aria-label="Rating"` that disagreed with the visible "Your rating",
   * and the two chip rows announced nothing at all — a screen reader reached
   * "I visited / Not yet" with no idea what the question had been.
   *
   * `group` renders the wrapper as a `<div>` and associates the label the
   * only way that works for a set: `aria-labelledby` on the child. The child
   * still needs its own grouping role (`radiogroup`, `group`, `tablist`) —
   * that is a statement about the controls, which only the call site knows.
   */
  group?: boolean;
  className?: string;
  /**
   * Layout only. `Button` and `IconButton` already take one; a field is the
   * primitive most likely to need a width from the row it sits in (a console
   * toolbar's select, for one) and the alternative was a bespoke class per
   * call site in an earlier stylesheet — which is the thing §11 exists to
   * stop.
   */
  style?: CSSProperties;
  /** One native control. Anything else is rendered untouched — see below. */
  children: ReactNode;
}

export default function Field({
  label,
  hint,
  error,
  optional = false,
  labelHidden = false,
  group = false,
  className,
  style,
  children,
}: FieldProps) {
  const base = useId();
  const hintId = hint ? `${base}-hint` : undefined;
  const errorId = error ? `${base}-error` : undefined;
  const labelId = group ? `${base}-label` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const cls = ['kk-field', error && 'kk-field--invalid', className].filter(Boolean).join(' ');

  /**
   * The a11y attributes have to land on the control, and the control is the
   * caller's element — so it is cloned rather than wrapped. This holds for a
   * single element child, which is what all 34 existing blocks are. Anything
   * else (a fragment, a control paired with a button, plain text) renders
   * untouched: a field that quietly dropped its second child would be worse
   * than one that is not wired, and the wiring is additive either way.
   */
  const only = Children.count(children) === 1 ? Children.only(children) : null;
  const control =
    only && isValidElement(only)
      ? cloneElement(only as ReactElement<Record<string, unknown>>, {
          'aria-describedby':
            [(only.props as Record<string, unknown>)['aria-describedby'], describedBy]
              .filter(Boolean)
              .join(' ') || undefined,
          ...(error ? { 'aria-invalid': true } : null),
          ...(labelId
            ? {
                'aria-labelledby':
                  [(only.props as Record<string, unknown>)['aria-labelledby'], labelId]
                    .filter(Boolean)
                    .join(' ') || undefined,
              }
            : null),
        })
      : children;

  const Wrapper = group ? 'div' : 'label';

  return (
    <Wrapper className={cls} style={style}>
      <span className={labelHidden ? 'kk-field__label sr-only' : 'kk-field__label'} id={labelId}>
        {label}
        {optional && <span className="kk-field__optional"> optional</span>}
      </span>
      {control}
      {hint && (
        <span className="kk-field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {/*
        `role="alert"` announces the message when it appears, which is the
        behaviour the five hand-written errors already had and worth keeping;
        `aria-describedby` is what makes it reachable *afterwards*, when
        someone tabs back to a field they have already failed.
      */}
      {error && (
        <span className="kk-field__error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </Wrapper>
  );
}
