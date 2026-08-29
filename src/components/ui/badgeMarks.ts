import {
  Compass, Tag, Globe, Coffee, Flame, Feather, Trophy, Sparkles,
  type LucideIcon,
} from 'lucide-react';

/**
 * One glyph per badge, keyed by the ids in `BADGE_GOALS` (src/lib/profile.ts).
 *
 * Every earned badge used to render the same `BadgeCheck` rosette. Seven
 * different achievements shared one glyph, which is what made a wall of them
 * read as filler rather than as things a person collected. The fix is a choice,
 * not a drawing: Lucide stays the icon system, and these are seven of its own
 * glyphs picked so the silhouettes stay apart at 12px — the head band draws them
 * as a row of overlapping 18px pips, where a mark is recognised by outline
 * before it is recognised by detail. A ring with a needle, a tag, a meridian
 * globe, a cup, a flame, a feather and a cup-on-a-stem are seven different
 * outlines.
 *
 * A lookup table and a function, deliberately kept out of `marks.tsx`: that file
 * exports a component, and a module that exports both loses Fast Refresh.
 *
 * Deliberately not exhaustive — a stored badge from an older release has no
 * entry here, so `badgeMark()` falls back rather than throwing.
 */
export const BADGE_MARKS: Record<string, LucideIcon> = {
  'badge-food-explorer': Compass,
  'badge-budget-hunter': Tag,
  'badge-cuisine-explorer': Globe,
  'badge-cafe-hopper': Coffee,
  'badge-heat-seeker': Flame,
  'badge-first-review': Feather,
  'badge-top-reviewer': Trophy,
};

export function badgeMark(id: string): LucideIcon {
  return BADGE_MARKS[id] ?? Sparkles;
}
