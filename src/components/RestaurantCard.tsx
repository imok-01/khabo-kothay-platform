import { memo, useRef } from 'react';
import type { CSSProperties, FocusEvent, PointerEvent } from 'react';
import { animated, useSpring } from '@react-spring/web';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Heart,
  Bookmark,
  Scale,
  ChefHat,
  Utensils,
  Flame,
  Sparkles,
  Check,
} from 'lucide-react';
import type { Restaurant } from '../types';
import { priceForTwoDisplay } from '../lib/priceDisplay';
import { formatCurrency } from '../lib/format';
import { formatDistance } from '../lib/geo';
import { openNowLabel } from '../lib/openHours';
import { useFavorites } from '../context/FavoritesContext';
import { useSaved } from '../context/SavedContext';
import { useCompare } from '../context/CompareContext';
import { getOffersForRestaurant, OFFERS_ENABLED } from '../hooks/useOffers';
import { track } from '../lib/analytics';
import type { MatchResult } from '../domain/recommendation';
import { selectRestaurantPhotos } from '../lib/photos';
import { isPointerMotion, prefersReducedMotion } from '../lib/pointerIntent';
import RestaurantImage from './RestaurantImage';
import RatingSource from './RatingSource';
import MatchIndicator from './MatchIndicator';
import { IconButton } from './ui';

/**
 * The restaurant card.
 *
 * Phase C rebuilt this around one idea: a Khabo Kothay card should say *why*
 * it is in front of you. A generic listing shows a photo, a name and a price;
 * this shows the match score, what the kitchen is actually known for, and how
 * confident we are in the price. That reasoning is the product.
 *
 * Layer map for the media, one owner per corner so nothing can collide:
 *   top-left     flags     (Featured, offer)
 *   top-right    actions   (favourite / save / compare — outside the link)
 *   bottom-left  status    (open now, veg)
 *   bottom-right match     (KK match ring + label)
 *
 * Variants:
 *   editorial — full-bleed lead card; name and tagline sit on the photo
 *   standard  — the default vertical card
 *   compact   — horizontal, for rails
 *
 * `featured` is still accepted as an alias for `editorial` so the eight pages
 * that render this component did not all have to change at once.
 *
 * Honesty rules that must not be relaxed:
 *  - An estimated price is labelled "est." — never presented as recorded.
 *  - Derived intelligence is never labelled as verified; the intel chips state
 *    what the kitchen is known for, which is true at every provenance level,
 *    and the detail page owns the provenance breakdown.
 *  - The match explanation stays outside `<Link>` so its button never hijacks
 *    navigation to the restaurant.
 */

type CardVariant = 'editorial' | 'featured' | 'standard' | 'compact';

interface RestaurantCardProps {
  restaurant: Restaurant;
  distanceKm?: number;
  match?: MatchResult;
  highlighted?: boolean;
  /** true when the match is built from real user signals (profile/favourites) */
  personalized?: boolean;
  /** true when an explicit search intent (builder/filters) is active */
  intentActive?: boolean;
  variant?: CardVariant;
}

/** One intel chip: what this card knows about the kitchen. */
interface Intel {
  key: string;
  label: string;
  tone: 'known' | 'dish' | 'spice' | 'vibe' | 'service';
}

/**
 * Longest signature dish that still reads as a chip rather than a sentence.
 * The catalogue's dish names run from 5 to 65 characters (median 19); at this
 * cap 69 of the 71 venues that have dishes recorded still get a chip, and
 * nothing has to be truncated to fit.
 */
const DISH_CHIP_MAX = 24;

/**
 * Chip-dedupe key. Case, punctuation and a trailing plural are all stripped,
 * because the sources overlap in wording rather than in spelling: a venue can
 * carry the characteristic "Quick bites" and the occasion "Quick bite", or the
 * specialty "Burgers" and the cuisine "Burger". Printing both reads as a
 * rendering bug, so they collapse to one chip.
 */
const chipKey = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/s$/, '');

/** Shortest key length worth stem-matching, so short words never collide. */
const STEM_MIN = 5;

/**
 * The intelligence line, built strictly from recorded fields in descending
 * order of how much each one tells a diner:
 *
 *   1. approved specialty      — what the kitchen is known for
 *   2. signature dish          — the most concrete fact we hold
 *   3. food characteristic     — how the kitchen skews ("Dessert-focused")
 *   4. strongest KK signal     — community evidence
 *   5. vibe                    — the room
 *   6. best-for occasion       — when to go ("Quick bite")
 *   7. cuisine                 — the broad category
 *   8. dining feature          — LAST RESORT, see below
 *
 * Never invented, never more than three chips — beyond three they stop being a
 * signal and become a tag cloud.
 *
 * Tiers 3, 6 and 8 read `restaurant.intelligence` fields that this card
 * previously ignored (it looked only at `specialties`), which left 64 of 207
 * cards with a blank intelligence line while their data sat unread.
 */
function intelFor(restaurant: Restaurant, limit: number): Intel[] {
  const out: Intel[] = [];
  const taken: Array<{ key: string; tone: Intel['tone'] }> = [];
  const push = (key: string, label: string, tone: Intel['tone']) => {
    const text = label.trim();
    if (!text || out.length >= limit) return;
    const norm = chipKey(text);
    const duplicate = taken.some((t) => {
      if (t.key === norm) return true;
      // Categories that share a stem are the same claim twice — "Desserts"
      // next to "Dessert-focused" — so the weaker one is dropped and the slot
      // goes to the next tier. Dishes are exempt: a dish is specific content,
      // never a restatement, so "Seafood" keeps its "Seafood Fried Rice".
      if (tone === 'dish' || t.tone === 'dish') return false;
      return (
        norm.length >= STEM_MIN &&
        t.key.length >= STEM_MIN &&
        (t.key.startsWith(norm) || norm.startsWith(t.key))
      );
    });
    if (duplicate) return;
    taken.push({ key: norm, tone });
    out.push({ key, label: text, tone });
  };
  const intel = restaurant.intelligence;

  const specialty = intel?.specialties[0];
  if (specialty) push(`sp-${specialty}`, specialty, 'known');

  // A named signature dish is the most concrete thing the catalogue records
  // about a kitchen — "Beef Cheese Burger" tells a diner more than "Fast food"
  // — so it outranks the softer signals below. Over-long names are skipped
  // rather than clipped: a truncated dish reads as breakage, and the venue
  // still has the chips below it.
  const dish = restaurant.signatureDishes.find((d) => {
    const t = d.trim();
    return t.length > 0 && t.length <= DISH_CHIP_MAX;
  });
  if (dish) push(`sd-${dish}`, dish, 'dish');

  const character = intel?.foodCharacteristics[0];
  if (character) push(`fc-${character}`, character, 'known');

  // Strongest recorded community signal. Sorted rather than taken first so a
  // weak signal never outranks a strong one purely by array order.
  const signal = [...(restaurant.khabo.signals ?? [])].sort((a, b) => b.strength - a.strength)[0];
  if (signal) push(`sg-${signal.id}`, signal.label, 'spice');

  const vibe = restaurant.vibes[0];
  if (vibe) push(`vb-${vibe}`, vibe, 'vibe');

  const occasion = intel?.bestFor[0];
  if (occasion) push(`bf-${occasion}`, occasion, 'vibe');

  // Cuisine backs the line out to the chip limit. It is NOT a guaranteed floor:
  // only about half the catalogue has a cuisine recorded, so this line can end
  // up empty and the layout must not reserve space for it.
  for (const c of restaurant.cuisines) push(`cu-${c}`, c, 'known');

  // Last resort only. A dining feature ("Delivery") is recorded and useful but
  // says nothing about the kitchen, and 183 of 207 venues have one — promoting
  // it any higher would print the same chip on nearly every card and the line
  // would stop meaning anything. So it fills a line that is otherwise empty
  // (50 of the 64 such cards) and never joins one that already says something.
  if (out.length === 0) {
    const feature = intel?.diningFeatures[0];
    if (feature) push(`df-${feature}`, feature, 'service');
  }

  return out;
}

function IntelIcon({ tone }: { tone: Intel['tone'] }) {
  if (tone === 'dish') return <Utensils size={12} aria-hidden="true" />;
  if (tone === 'spice') return <Flame size={12} aria-hidden="true" />;
  if (tone === 'vibe') return <Sparkles size={12} aria-hidden="true" />;
  if (tone === 'service') return <Check size={12} aria-hidden="true" />;
  return <ChefHat size={12} aria-hidden="true" />;
}

/** Number + honest qualifier, so an estimate can never read as recorded. */
function priceParts(restaurant: Restaurant): { value: string; note: string; noteClass: string } {
  const price = priceForTwoDisplay(restaurant);
  if (price.kind === 'verified' && price.priceForTwo) {
    return { value: formatCurrency(price.priceForTwo), note: 'for two', noteClass: '' };
  }
  if (price.kind === 'estimated' && price.estimate) {
    return {
      value: `${formatCurrency(price.estimate.low)}–${formatCurrency(price.estimate.high)}`,
      note: 'est. for two',
      noteClass: ' rcard__price-note--est',
    };
  }
  return { value: '—', note: 'no price yet', noteClass: ' rcard__price-note--none' };
}

/**
 * THE HOVER: WHY THE FRAME DOES NOT MOVE
 * ======================================
 * The card used to answer the pointer with `transform: translateY(-5px)` on
 * `.rcard` itself, and that single line was the whole defect. A hover target
 * that displaces itself vacates the strip it just left: park the cursor in the
 * bottom five pixels of a card and the lift carries the card's edge up past
 * the pointer, `:hover` is lost, the card drops back down, the pointer is
 * inside it again, and it lifts. The loop runs at whatever rate the compositor
 * can turn it around. Underneath it, `.rcard__media img` was interpolating
 * scale 1.03 to 1.09 over `--dur-slower` (680ms), so every oscillation
 * restarted a two-thirds-of-a-second image transform from wherever the last
 * one had reached — which is precisely the flickering zoom that was reported.
 *
 * So the invariant this file now keeps is: THE HOVER TARGET NEVER MOVES. The
 * `<article>` is the target and carries no transform in any state, which makes
 * its hit area provably identical to its layout box at every moment, and makes
 * hover re-entry not merely unlikely but structurally impossible.
 *
 * What responds instead is the photograph — an absolutely positioned layer
 * inside an `overflow: hidden` frame, so it can move as much as it likes
 * without touching the card's box, its neighbours or the grid.
 *
 * A hit-area-safe frame motion does exist: scaling *up* only ever grows the
 * box, so a point inside the resting box stays inside the scaled one. It was
 * tried and dropped, because scaling the frame scales the type inside it, and
 * a card whose name softens and re-sharpens on every hover trades one quality
 * defect for another. Elevation is carried by the shadow and the border
 * instead, which is what elevation actually is.
 */

/** Photo scale at rest, and under the pointer. */
const MEDIA_REST = 1.03;
/**
 * Half the travel the CSS had (0.03 against 0.06). On a 272px column that is
 * 8.2px of growth, about 4px of drift at each edge — plainly legible as
 * movement, nowhere near a zoom.
 */
const MEDIA_HOVER = 1.06;

/**
 * The settle/answer pair of design-system.css §8b, expressed as physics rather
 * than as two durations. Integrated at 1ms over this 0.03 travel:
 *
 *   ENTER 300/26  half-way at  84ms, 90% at 162ms, arrives at 212ms
 *   LEAVE 180/22  half-way at 113ms, 90% at 228ms, arrives at 316ms
 *
 * The same 1.5x asymmetry as the 160ms answer against the 260ms settle: the
 * card replies quickly and lets go slowly.
 *
 * `clamp` because a card that bounces is a card that looks cheap, and an
 * explicit `precision` because the default is derived from the travel — on a
 * 0.03 distance it would work out at 3e-5 and hold the spring open for the best
 * part of a second after the last visible movement, N springs deep on a grid.
 */
const HOVER_ENTER = { tension: 300, friction: 26, clamp: true, precision: 0.0002 };
const HOVER_LEAVE = { tension: 180, friction: 22, clamp: true, precision: 0.0002 };

function RestaurantCard({
  restaurant,
  distanceKm,
  match,
  highlighted = false,
  personalized = false,
  intentActive = false,
  variant = 'standard',
}: RestaurantCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isSaved, toggleSaved } = useSaved();
  const { isComparing, toggleCompare } = useCompare();
  const fav = isFavorite(restaurant.id);
  const saved = isSaved(restaurant.id);
  const comparing = isComparing(restaurant.id);
  const openStatus = openNowLabel(restaurant.openingHours);
  const offers = OFFERS_ENABLED ? getOffersForRestaurant(restaurant.id) : [];
  const image = selectRestaurantPhotos(restaurant, 'card').photos[0];
  const price = priceParts(restaurant);

  const [mediaStyle, media] = useSpring(() => ({ scale: MEDIA_REST, config: HOVER_LEAVE }));

  /**
   * Two latches and one reconciler, which is the answer to "make sure multiple
   * mouseenter/mouseleave events cannot fight each other". Pointer and keyboard
   * are tracked separately so that focusing a card the mouse is already over,
   * or moving the mouse off a card that still holds focus, cannot cancel the
   * other one's claim. `on` records what the spring was last told, so a storm
   * of boundary events collapses to at most one `start` per genuine change —
   * and because a spring is a physical object rather than a queued transition,
   * a reversal mid-flight carries its velocity through the turn instead of
   * restarting. Modelled: reversing 40ms into the enter leaves the photo 17%
   * out and still travelling at 2.1e-4/ms, and the leave spring absorbs that
   * momentum and reaches rest in 354ms rather than snapping back.
   */
  const latch = useRef({ pointer: false, focus: false, on: false });
  const sync = () => {
    const on = latch.current.pointer || latch.current.focus;
    if (on === latch.current.on) return;
    latch.current.on = on;
    media.start({
      scale: on ? MEDIA_HOVER : MEDIA_REST,
      config: on ? HOVER_ENTER : HOVER_LEAVE,
      immediate: prefersReducedMotion(),
    });
  };

  /**
   * Entering is gated on the pointer having actually moved (see
   * `lib/pointerIntent`), so cards sliding under a stationary cursor during a
   * scroll start nothing. Leaving is never gated — the pointer really has left,
   * and refusing that would strand a card in its hover state.
   *
   * Touch is excluded outright rather than relying on a media query: a tap
   * fires `pointerenter` too, and a card left zoomed after a tap is exactly the
   * "hover that feels broken on touch" this is meant to avoid.
   */
  const onEnter = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    if (!isPointerMotion(e)) return;
    latch.current.pointer = true;
    sync();
  };
  // The self-heal for the case above: the pointer stops, the page scrolls a new
  // card under it, and the next real movement is a `pointermove` with no
  // `pointerenter` to follow it. One boolean test once the card is already
  // hovered, which is the state it spends nearly all its time in.
  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (latch.current.pointer || e.pointerType === 'touch') return;
    latch.current.pointer = true;
    sync();
  };
  const onLeave = () => {
    latch.current.pointer = false;
    sync();
  };
  const onFocusIn = () => {
    latch.current.focus = true;
    sync();
  };
  const onFocusOut = (e: FocusEvent<HTMLElement>) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    latch.current.focus = false;
    sync();
  };

  /*
   * `featured` used to be an alias for `editorial`, and that alias was the
   * bug on every guide, cuisine and area page. `editorial` puts the name
   * and tagline in an overlay ON the photo and takes them out of the body —
   * a treatment that only works at the size the homepage `.spread` gives
   * it. Dropped into a 272px `auto-fill` column beside three standard
   * cards, the same markup read as a card whose body had failed to load:
   * chips and a price with no name above them.
   *
   * `featured` is now its own variant, and the fix is structural rather
   * than cosmetic. It keeps the body every other card has — so there is no
   * arrangement of data in which it can render as an empty gap — and earns
   * its prominence from the grid instead: it spans the full row and lays
   * the photo out beside the text, which makes the featured photo the
   * largest on the page rather than, as before, the smallest.
   *
   * What it deliberately does NOT do is claim a rank. Guide, cuisine and
   * area pages order by `data.filter(collection.match)` — catalogue order,
   * not a ranking — so a "Top pick" or "#1" badge here would be inventing
   * a claim the data does not make. It is the *first* entry, presented
   * larger; nothing more is asserted.
   */
  const isEditorial = variant === 'editorial';
  const isFeatured = variant === 'featured';
  const isCompact = variant === 'compact';
  const v = variant;

  // The featured card's body is a full row wide, so it can carry a fourth
  // intel chip without wrapping into the crowding the 272px column suffers.
  const intel = intelFor(restaurant, isCompact ? 2 : isFeatured ? 4 : 3);
  // A match is only worth showing as a score when something real backs it:
  // a personal signal or an explicit search intent. Otherwise it is arithmetic
  // on defaults, and we say so in the foot instead.
  const scoreIsMeaningful = Boolean(match) && (personalized || intentActive);
  const pct = Math.min(100, Math.max(4, match?.score ?? 0));

  const nameEl = <h3 className="rcard__name">{restaurant.name}</h3>;
  const taglineEl = restaurant.tagline ? (
    <p className="rcard__tagline">{restaurant.tagline}</p>
  ) : null;

  return (
    <article
      className={`rcard rcard--${v}${highlighted ? ' rcard--highlighted' : ''}`}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
      onFocus={onFocusIn}
      onBlur={onFocusOut}
    >
      <Link
        to={`/restaurant/${restaurant.id}`}
        className="rcard__link"
        aria-label={`View ${restaurant.name}`}
        onClick={() => track('result_clicked', { id: restaurant.id })}
      >
        <div className="rcard__media">
          {/* The one thing that moves. A layer of its own so the spring writes
              `transform` to an element that owns nothing else — the existing
              `.rcard__media .img-wrap` rules are descendant selectors and reach
              straight through it, so the photograph's own box is untouched. */}
          <animated.div className="rcard__zoom" style={mediaStyle}>
            <RestaurantImage
              source={image}
              name={restaurant.name}
              width={isEditorial || isFeatured ? 1200 : isCompact ? 320 : 640}
            />
          </animated.div>

          <div className="rcard__flags">
            {restaurant.khabo.featured && (
              <span className="rcard__flag rcard__flag--featured">Featured</span>
            )}
            {offers.length > 0 && (
              <span className="rcard__flag rcard__flag--offer">{offers[0].discountLabel}</span>
            )}
          </div>

          {/* Live status, on the photo, where it is read before the name. */}
          <div className="rcard__status">
            {openStatus && (
              <span
                className={`rcard__pill ${openStatus === 'Open now' ? 'rcard__pill--open' : 'rcard__pill--shut'}`}
              >
                {openStatus}
              </span>
            )}
            {!restaurant.vegUnknown && (
              <span
                className={`rcard__pill ${restaurant.isVeg ? 'rcard__pill--veg' : 'rcard__pill--nonveg'}`}
              >
                {restaurant.isVeg ? 'Veg' : 'Non-veg'}
              </span>
            )}
          </div>

          {scoreIsMeaningful && match && (
            <div
              className={`rcard__match-badge${match.score < 25 ? ' rcard__match-badge--low' : ''}`}
              aria-hidden="true"
            >
              <span
                className="rcard__ring"
                style={{ '--pct': pct } as CSSProperties}
              />
              <strong>{Math.round(match.score)}</strong>
              <span>{personalized ? 'KK match' : 'Search fit'}</span>
            </div>
          )}

          {isEditorial && (
            <div className="rcard__overlay">
              {nameEl}
              {taglineEl}
            </div>
          )}
        </div>

        <div className="rcard__body">
          {!isEditorial && (
            <div className="rcard__head">
              {nameEl}
              <span className="rcard__rating">
                <RatingSource restaurant={restaurant} showCount={false} />
              </span>
            </div>
          )}
          {!isEditorial && taglineEl}

          {/* The compact variant used to hide both the chips and the whole
              match zone, which left the homepage rails showing generic
              listings. It now carries a condensed match instead. */}
          {isCompact && scoreIsMeaningful && match && (
            <span className="rcard__mini">
              <span className="rcard__ring" style={{ '--pct': pct } as CSSProperties} />
              <strong>{Math.round(match.score)}</strong>
              <span>{personalized ? 'match' : 'fit'}</span>
            </span>
          )}

          {/* Before there is any behaviour to match on, the pill above has
              nothing to show and `.rcard__facts`'s `margin-top: auto` turns
              its slot into 64px of slack under the name. This holds that slot
              with the reason it is empty, so the score arrives in place of a
              sentence rather than in place of a gap. No number, no ring and no
              bar — a hollow ring reads as 0%, which is the one thing this
              state must not claim. CSS hides it where the line cannot fit
              (polish.css section 10): the rail body is 187px at 375 and the
              sentence needs 250px, and a two-line nudge would grow the card
              past the editorial card it sits beside. */}
          {isCompact && match && !scoreIsMeaningful && (
            <span className="rcard__mini-nudge">Complete your profile for a match score</span>
          )}

          {intel.length > 0 && (
            <div className="rcard__intel">
              {intel.map((i) => (
                <span
                  key={i.key}
                  className={`rcard__intel-item${i.tone === 'known' ? '' : ` rcard__intel-item--${i.tone}`}`}
                >
                  <IntelIcon tone={i.tone} />
                  <span className="rcard__intel-label">{i.label}</span>
                </span>
              ))}
            </div>
          )}

          <div className="rcard__facts">
            <span className="rcard__where">
              <MapPin size={14} aria-hidden="true" />
              <span className="rcard__where-name">{restaurant.location || 'Dhaka'}</span>
              {distanceKm !== undefined && (
                <span className="rcard__distance">· {formatDistance(distanceKm)}</span>
              )}
            </span>
            {isEditorial && (
              <span className="rcard__rating">
                <RatingSource restaurant={restaurant} showCount={false} />
              </span>
            )}
            <span className="rcard__price">
              <span className="rcard__price-value">{price.value}</span>
              <span className={`rcard__price-note${price.noteClass}`}>{price.note}</span>
            </span>
          </div>
        </div>
      </Link>

      {/* Match explanation lives OUTSIDE the card link so its button never
          hijacks the navigation to the restaurant page. Compact cards show the
          condensed match inline above instead — a reasons popover inside a
          128px rail card cannot be read.

          The `!isCompact` guard is also why a compact card carries no foot in
          any state, and that is a layout constraint rather than an editorial
          choice. `.rcard--compact` is `flex-direction: row` (phase-c.css
          §4), so a foot that is a sibling of the link becomes a COLUMN beside
          it: measured on the homepage rail, a one-line nudge foot took 299px
          of a 502px card and left the body 73px, which clipped every name to a
          45px box ("Chef's Tabl…") and truncated the intel chips to single
          letters. Wrapping it under the card instead would grow each rail card
          by a line and break the rail's height agreement with the editorial
          card beside it. So on a first visit the rail cards are the discovery
          cards they already are — photo, name, chips, area, distance, price —
          and the section's one nudge line sits in the editorial card's foot,
          exactly where its match bar appears once a profile exists to match
          on. */}
      {match && !isCompact && (
        <div className="rcard__foot">
          {personalized ? (
            <MatchIndicator match={match} mode="personal" />
          ) : intentActive ? (
            <MatchIndicator match={match} mode="search" />
          ) : (
            <span className="rcard__nudge">Complete your profile for personalised matches.</span>
          )}
        </div>
      )}

      {/* Action cluster — revealed on hover at pointer widths, always visible
          on touch. Never inside the link.

          These are IconButtons, so the 34px circle now carries a 44px pointer
          target it did not have before. The `rcard__act` class stays because
          the card is where the responsive box/reach overrides live (28px in a
          compact card, 30px in the ≤640 grid — see phase-c.css and
          polish.css); the `--*-on` class stays because the one-shot pop is
          keyed off it. The "on" colour is passed rather than set in CSS: a
          heart is terracotta, a save espresso, a comparison the vibe accent,
          and primitives.css loads after phase-c.css so a class-level rule
          would lose to the primitive's own `[aria-pressed]` fill. */}
      <div className="rcard__actions">
        <IconButton
          icon={Heart}
          label={fav ? `Remove ${restaurant.name} from favourites` : `Add ${restaurant.name} to favourites`}
          tone="glass"
          pressed={fav}
          onColor="var(--terracotta)"
          fillWhenPressed
          onClick={() => toggleFavorite(restaurant.id)}
          className={`rcard__act ${fav ? 'rcard__act--fav-on' : ''}`}
        />
        <IconButton
          icon={Bookmark}
          label={saved ? `Remove ${restaurant.name} from saved` : `Save ${restaurant.name} for later`}
          tone="glass"
          pressed={saved}
          onColor="var(--primary)"
          fillWhenPressed
          onClick={() => toggleSaved(restaurant.id)}
          className={`rcard__act ${saved ? 'rcard__act--save-on' : ''}`}
        />
        {/* No `fillWhenPressed`: a filled balance scale is a blob. It reads as
            "on" from the indigo disc behind it. */}
        <IconButton
          icon={Scale}
          label={comparing ? `Remove ${restaurant.name} from comparison` : `Add ${restaurant.name} to comparison`}
          tone="glass"
          pressed={comparing}
          onColor="var(--vibe)"
          onClick={() => toggleCompare(restaurant.id)}
          className={`rcard__act ${comparing ? 'rcard__act--compare-on' : ''}`}
        />
      </div>
    </article>
  );
}

/**
 * Memoised because of what a results grid does to it. Every card on Explore is
 * wired to page-level state, so before this the pointer crossing one card
 * boundary re-rendered all of them — and a card render is not free: three
 * context reads, `openNowLabel` against the clock, an offers lookup, a photo
 * selection, `intelFor`'s dedupe pass and a price derivation, none of them
 * memoised inside. The props are stable by construction (`results`, `matches`,
 * `distances` and `scores` are all `useMemo`d on the page and none of them
 * depends on the highlight), so a hover now re-renders nothing at all: the
 * response is a spring writing one transform, outside React.
 */
export default memo(RestaurantCard);
