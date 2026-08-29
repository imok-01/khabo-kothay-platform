import { BookOpen, Landmark, Lightbulb, MapPin, Sparkles, Utensils } from 'lucide-react';
import type { DiscoveryFactType } from '../domain/discoveryFacts';

/**
 * How each discovery fact type is announced on the restaurant page.
 *
 * `factType` was already in the domain object and had never been drawn. Showing
 * it is the difference between an anonymous bullet and a classified entry: with
 * five facts on one venue the reader can see that one is about the room and the
 * next is about where the building sits, which is what makes the set read as a
 * dossier rather than as trivia.
 *
 * This lives beside `DiscoveryFacts` rather than inside it because a module that
 * exports both a component and a constant loses fast refresh
 * (`react(only-export-components)`) — the same reason `ui/badgeMarks.ts` is its
 * own file.
 */

export interface FactKind {
  /** The caption above the fact. */
  label: string;
  Icon: typeof Landmark;
}

/**
 * The labels are written the way a caption is written, not the way the column is
 * spelled — `EXPERIENCE` is a database value, "In the room" is a label. Keyed by
 * the full union, so adding a seventh fact type is a type error here rather than
 * a silent fallback on the page.
 */
export const FACT_KINDS: Record<DiscoveryFactType, FactKind> = {
  HISTORY: { label: 'Origins', Icon: Landmark },
  EXPERIENCE: { label: 'In the room', Icon: Sparkles },
  CONCEPT: { label: 'The idea', Icon: Lightbulb },
  LOCATION: { label: 'Where it sits', Icon: MapPin },
  IDENTITY: { label: 'What it is', Icon: Utensils },
  OTHER: { label: 'Worth knowing', Icon: BookOpen },
};

/**
 * The transformer casts `fact_type` straight out of the row
 * (`row.fact_type as DiscoveryFactType`) with no validation, so a type added to
 * the table before it is added to the union arrives here as a string that maps
 * to nothing. Falling back to OTHER keeps the fact — which is the part that was
 * researched and approved — instead of dropping a caption-less row.
 */
export function factKind(type: string): FactKind {
  return FACT_KINDS[type as DiscoveryFactType] ?? FACT_KINDS.OTHER;
}
