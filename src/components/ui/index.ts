/**
 * The KK primitive layer.
 *
 * These are the reusable controls the product is assembled from, and they
 * exist so that a decision about a control is made once here rather than
 * re-made at every call site. Their paint lives in `src/primitives.css`,
 * loaded last, beside them.
 *
 * They are deliberately not a generic component kit: each one encodes a
 * rule from docs/KK_VISUAL_DIRECTION.md that the product had been breaking
 * — an icon size, a tap target, an accessible name, a busy state — and
 * carries the reasoning with it.
 */
export { default as Button } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button';
export { default as ConfirmButton } from './ConfirmButton';
export type { ConfirmButtonProps } from './ConfirmButton';
export { default as IconButton } from './IconButton';
export type {
  IconButtonProps,
  IconButtonShape,
  IconButtonSize,
  IconButtonTone,
} from './IconButton';
export { default as Chip } from './Chip';
export type { ChipProps, ChipSize } from './Chip';
export { default as Badge } from './Badge';
export type { BadgeProps, BadgeSize, BadgeTone } from './Badge';
export { default as Field } from './Field';
export type { FieldProps } from './Field';
export { default as Select } from './Select';
export type { SelectAlign, SelectOption, SelectProps } from './Select';
export { default as Disclosure } from './Disclosure';
export type {
  DisclosureProps,
  DisclosureGround,
  DisclosureMarker,
  DisclosureVariant,
} from './Disclosure';
export { default as Dialog } from './Dialog';
export type { DialogProps, DialogSize, DialogVariant } from './Dialog';
export { default as Celebration } from './Celebration';
export type { CelebrationProps } from './Celebration';
export { default as CopyCode } from './CopyCode';
export type { CopyCodeProps, CopyCodeSize, CopyCodeVariant } from './CopyCode';
/* `SpotlightDeck` is the one primitive imported from its own module rather than
   from here, and its types are the reason the line below is `export type`: a
   value re-export is a runtime edge, so re-exporting the deck put its gsap
   dependency in the barrel's dependency graph — and the barrel is imported by
   the header, the footer and the shell, i.e. by every page. Measured: 68 kB of
   gsap fetched on first load of every route, for a deck that appears on the
   restaurant page. `export type` is erased at compile time and carries no such
   edge, so the types stay. Import the component as
   `from './ui/SpotlightDeck'`. */
export type {
  SpotlightCardProps,
  SpotlightDeckProps,
} from './SpotlightDeck';
/* Marks, not primitives: a drawing and a lookup table rather than two controls.
   They live here because every other shared piece of KK's visual vocabulary is
   imported from this one place. Split across two modules because one of them
   exports a component and the other does not. */
export { CoinMark } from './marks';
export { BADGE_MARKS, badgeMark } from './badgeMarks';
