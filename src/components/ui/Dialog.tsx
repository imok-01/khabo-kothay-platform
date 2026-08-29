import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import IconButton from './IconButton';

/**
 * Dialog — the one modal surface.
 *
 * Measured before this component existed: ten surfaces carried
 * `role="dialog"`, seven of them `aria-modal="true"`, and **not one trapped
 * focus**. Tab walked out of the panel and into the page behind it, which
 * makes `aria-modal` a false statement rather than a missing nicety — a
 * screen-reader user is told the rest of the page is unavailable while the
 * keyboard is free to wander into it. Each one also re-implemented the same
 * two effects (an Escape listener and `document.body.style.overflow`), and
 * two of them read the previous overflow value wrongly, so opening one modal
 * from inside another could leave the page permanently unscrollable.
 *
 * That is why this is the one primitive with a dependency behind it:
 * `@radix-ui/react-dialog` for the focus scope, the scroll lock, the
 * outside-dismiss and `hideOthers`. It is used **only** here, behind this
 * wrapper — nothing else in the product imports Radix.
 *
 * Three things this wrapper does that Radix does not:
 *
 *  1. **It returns focus itself.** Radix's `onCloseAutoFocus` focuses
 *     `Dialog.Trigger`'s ref, and none of these call sites has a Trigger —
 *     every one is opened from state, so that ref is null and the keyboard
 *     would land on `<body>`. The element to come back to is recorded during
 *     the render that opens the dialog, because by the time any effect runs
 *     Radix's focus scope has already moved focus inside the panel.
 *
 *  2. **It portals to `document.body` in the browser, and renders in place on
 *     the server.** The first half is not a preference. `editorial.css`'s
 *     `main { animation: kk-page-in 260ms var(--ease-out) both; }` animates
 *     `opacity`, and `both` keeps that animation *filling* forever — so every
 *     page's `<main>` is a permanent stacking context even though its computed
 *     opacity reads `1`. A `position: fixed` scrim rendered inside it is
 *     therefore trapped in `<main>`'s layer, which sits below the fixed
 *     `.nav` at `z-index: 50`, and **no z-index can get it out**: measured in
 *     the pane, a scrim at `z-index: 2147483000` still painted under the
 *     header, while an identical box appended to `document.body` at `60`
 *     covered it. That was the bug — redeeming a reward dimmed the page and
 *     left the header's search field and burger floating over the modal.
 *     Fixing `main`'s fill-mode instead would have unclamped every other
 *     page-level overlay at once (`.filters` 60, `.filters__scrim` 55,
 *     `.builder__popover` 61 — whose comment in polish.css says explicitly
 *     that it must *not* cover the header), so the portal is the narrower
 *     change: only the one surface that genuinely must cover everything moves.
 *
 *     The server branch is what keeps the cost at zero. `createPortal` throws
 *     under `react-dom/server` rather than degrading — the failure mode
 *     `Celebration` guards against, where it would take all 219 prerendered
 *     routes with it — and portalling unconditionally would also erase this
 *     file's only test surface, since `renderToStaticMarkup` is how the class
 *     and aria contracts are asserted (there is no jsdom in this repo). So
 *     when `document` is undefined the same tree renders in place: the
 *     prerender and the tests see exactly what they saw before, and no
 *     hydration mismatch is possible because every call site mounts its
 *     dialog closed, which Radix renders as nothing.
 *
 *  3. **It centres with `inset: 0; margin: auto`, never a transform.** A
 *     transform becomes the containing block for `position: fixed`
 *     descendants, which would silently re-anchor the photo viewer's chrome
 *     to the panel instead of the viewport. See primitives.css §8.
 *
 * Like `Disclosure`, this primitive owns **behaviour and wiring**; the
 * `variant` axis owns appearance, because a photo viewer, a paper card and a
 * navigation sheet are not one look with three sizes.
 *
 * docs/KK_VISUAL_DIRECTION.md §2 (shape), §5 (motion), §7 (one focus system),
 * §11 (the primitive layer).
 */

export type DialogVariant = 'panel' | 'media' | 'bare';
export type DialogSize = 'sm' | 'md' | 'lg';

export interface DialogProps {
  /** Open state. Call sites that mount conditionally pass `true`. */
  open: boolean;
  /**
   * Called for every dismissal route — Escape, the close button, a pointer
   * down outside the panel. One callback, so a call site cannot accidentally
   * wire three of them and forget the fourth.
   */
  onClose: () => void;
  /**
   * The accessible name. Required, and always rendered as the dialog's
   * `Title`, because that is what makes `aria-labelledby` resolve — a modal
   * that announces itself as "dialog" and nothing else is the defect this
   * prop makes uncompilable.
   */
  title: ReactNode;
  /** Small line above the title. `panel` only. */
  eyebrow?: ReactNode;
  /** Wired to `aria-describedby` when present. `panel` only. */
  description?: ReactNode;
  /**
   * `panel` is the paper card: KK head / scrolling body / foot, centred, on a
   * 45%-opaque scrim. `media` is the photo viewer: a transparent
   * viewport-sized box on a near-opaque scrim, whose children position
   * themselves. `bare` adds no appearance at all — `overlayClassName` and
   * `className` own it, for a surface that already has a complete treatment
   * of its own (the navigation sheet).
   */
  variant?: DialogVariant;
  /** Panel width: 440 / 560 / 960px. `panel` only. */
  size?: DialogSize;
  /**
   * A row pinned between the head and the scrolling body — for a control
   * that filters what is below it, which must not scroll away with it.
   */
  toolbar?: ReactNode;
  /** A row pinned below the scrolling body, for the dialog's actions. */
  footer?: ReactNode;
  /** Hide the head's close button when the foot already offers a way out. */
  showClose?: boolean;
  /** Accessible name for the close button. */
  closeLabel?: string;
  /** Extra classes on the panel (`Content`). */
  className?: string;
  /** Extra classes on the scrim (`Overlay`). */
  overlayClassName?: string;
  /** Extra classes on the scrolling body. */
  bodyClassName?: string;
  children: ReactNode;
}

/** Panel width per size lives in primitives.css §8, not here. */

export default function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  description,
  variant = 'panel',
  size = 'md',
  toolbar,
  footer,
  showClose = true,
  closeLabel = 'Close',
  className,
  overlayClassName,
  bodyClassName,
  children,
}: DialogProps) {
  // Recorded during render, not in an effect. Child effects run before the
  // parent's, and Radix's focus scope is a child — so by the time an effect
  // here could look, `document.activeElement` is already inside the panel.
  // During the render that flips `open` the old focus is still live.
  const returnTo = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open !== wasOpen.current) {
    wasOpen.current = open;
    if (open && typeof document !== 'undefined') {
      const active = document.activeElement;
      returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null;
    }
  }

  const isPanel = variant === 'panel';
  const isMedia = variant === 'media';

  const panelClass = [
    variant !== 'bare' && 'kk-dialog__panel',
    isPanel && `kk-dialog__panel--${size}`,
    isMedia && 'kk-dialog__panel--media',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const scrimClass = [
    variant !== 'bare' && 'kk-dialog__scrim',
    isMedia && 'kk-dialog__scrim--media',
    overlayClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const layers = (
    <>
      {/* The scrim carries Radix's scroll lock, so it is rendered even when a
          variant paints nothing on it. */}
      <RadixDialog.Overlay className={scrimClass || undefined} />
      <RadixDialog.Content
        className={panelClass || undefined}
        // `media` fills the viewport, so a press on the dark ground lands
        // inside the content and Radix's outside-dismiss never fires. The
        // target check is what keeps click-to-close working there — and it
        // replaces four `stopPropagation` calls at the call site, which is
        // the same rule stated once instead of once per child.
        onClick={
          isMedia
            ? (event) => {
                if (event.target === event.currentTarget) onClose();
              }
            : undefined
        }
        onCloseAutoFocus={(event) => {
          // Ours runs first and Radix's is skipped once the default is
          // prevented — which is the point: Radix would focus a Trigger
          // that does not exist here.
          event.preventDefault();
          returnTo.current?.focus();
        }}
      >
        {isPanel ? (
          <>
            <div className="kk-dialog__head">
              <div className="kk-dialog__heading">
                {eyebrow && <span className="kk-dialog__eyebrow">{eyebrow}</span>}
                <RadixDialog.Title className="kk-dialog__title">{title}</RadixDialog.Title>
                {description && (
                  <RadixDialog.Description className="kk-dialog__desc">
                    {description}
                  </RadixDialog.Description>
                )}
              </div>
              {showClose && (
                <IconButton
                  icon={X}
                  label={closeLabel}
                  size="md"
                  className="kk-dialog__close"
                  onClick={onClose}
                />
              )}
            </div>
            {toolbar && <div className="kk-dialog__toolbar">{toolbar}</div>}
            <div className={['kk-dialog__body', bodyClassName].filter(Boolean).join(' ')}>
              {children}
            </div>
            {footer && <div className="kk-dialog__foot">{footer}</div>}
          </>
        ) : (
          <>
            {/* The name still has to exist for `aria-labelledby` to resolve;
                these variants just do not show it. */}
            <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
            {children}
          </>
        )}
      </RadixDialog.Content>
    </>
  );

  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      {typeof document === 'undefined' ? layers : createPortal(layers, document.body)}
    </RadixDialog.Root>
  );
}
