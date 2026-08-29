import type { ReactNode } from 'react';
import { BadgeCheck, Radio, Sigma, FlaskConical } from 'lucide-react';

/**
 * Provenance — Khabo Kothay's honesty layer, as a visual system.
 *
 * The product already refuses to invent data: prices are labelled estimated,
 * hours "being verified", menus "not verified yet". But that honesty used to
 * be rendered as grey 11px fine print, so telling the truth *looked* like
 * apologising for missing data.
 *
 * This turns the same claims into a graded confidence signal. Each level has
 * its own colour, icon and weight, so a user can see at a glance how much to
 * trust a number — and "verified" becomes something the platform visibly
 * earns rather than something buried under the thing it describes.
 *
 * Levels map 1:1 onto the source vocabulary used in `types.ts`:
 *  - `verified`  — confirmed against a source of record (verification_records,
 *                  live Google, owner-confirmed).
 *  - `recorded`  — captured from a permitted source but not independently
 *                  confirmed (scraped hours, recorded menu prices).
 *  - `derived`   — computed by us from data we hold (menu-derived cost
 *                  estimates). Never presented as fact.
 *  - `demo`      — placeholder/sample content. Always labelled, never quiet.
 *
 * Colours come from the `--prov-*` tokens in design-system.css.
 */

export type ProvenanceLevel = 'verified' | 'recorded' | 'derived' | 'demo';

const ICONS: Record<ProvenanceLevel, typeof BadgeCheck> = {
  verified: BadgeCheck,
  recorded: Radio,
  derived: Sigma,
  demo: FlaskConical,
};

/** Default label when a caller doesn't supply more specific wording. */
const DEFAULT_LABEL: Record<ProvenanceLevel, string> = {
  verified: 'Verified',
  recorded: 'Recorded',
  derived: 'Estimated',
  demo: 'Demo data',
};

export interface ProvenanceProps {
  level: ProvenanceLevel;
  /** Overrides the default label, e.g. "Verified address", "From Google Maps". */
  children?: ReactNode;
  /** `sm` for inline use beside a value; `md` (default) for section headers. */
  size?: 'sm' | 'md';
  /** Longer explanation surfaced as a tooltip. */
  title?: string;
}

export default function Provenance({ level, children, size = 'md', title }: ProvenanceProps) {
  const Icon = ICONS[level];
  return (
    <span className={`prov prov--${level} prov--${size}`} title={title}>
      {/* 12 for both sizes: 11 was off the icon ladder, and the `sm`/`md`
          difference is carried by `prov--sm` (type size and gap), not by a
          1px icon delta nobody can see. docs/KK_VISUAL_DIRECTION.md §8. */}
      <Icon size={12} aria-hidden="true" />
      {children ?? DEFAULT_LABEL[level]}
    </span>
  );
}

/**
 * The sentence-length counterpart: an evidence note tinted to its confidence
 * level instead of rendered as anonymous grey text. Used where the honest
 * caveat matters enough to read ("estimated from recorded menu prices"),
 * so the caveat carries the same colour identity as the badge above it.
 */
export function ProvenanceNote({ level, children }: { level: ProvenanceLevel; children: ReactNode }) {
  return <p className={`prov-note prov-note--${level}`}>{children}</p>;
}
