import type { FilterCriteria } from './filter';
import type { GeoPoint } from './geo';

/**
 * One place that knows how a URL param maps onto a `FilterCriteria` field.
 *
 * Explore's state contract is the URL, and its `criteria` memo already does this
 * mapping once for the live search. But the redesigned surface has to answer a
 * second question all over the place — "how many places would I get if I also
 * picked this?" — for every mood chip and every option in the refine drawer.
 * Writing that mapping a second time inside the drawer is how the count and the
 * result drift apart, so both read this instead.
 *
 * It is deliberately a *patch* on an existing criteria object rather than a
 * builder: a count is only useful if it is contextual ("14 more in Gulshan",
 * not "18 in Gulshan, ignoring everything else you asked for").
 *
 * `partySize`, `dining` and `sortBy` are absent on purpose. They are real params
 * and they do change the ranking and the stated intent, but `filterRestaurants`
 * does not read them on Explore — so they must not be given a count, because a
 * count implies the option narrows the results and these do not.
 */
export function withParam(
  base: FilterCriteria,
  key: string,
  value: string,
  origin?: GeoPoint | null,
): FilterCriteria {
  const c: FilterCriteria = { ...base };
  const on = value === '1';
  switch (key) {
    case 'q':
      c.query = value || undefined;
      break;
    case 'location':
      c.location = value;
      break;
    case 'cuisine':
      c.cuisine = value;
      break;
    case 'specialty':
      c.specialty = value;
      break;
    case 'budget':
      c.budget = value;
      break;
    case 'mealType':
      c.mealType = value;
      break;
    case 'vibe':
      c.vibe = value;
      break;
    // Diet is one three-state control: '' clears both flags, '1' is veg-only,
    // '0' is non-veg-only. Setting `vegOnly: false` for '0' would read as "no
    // diet filter" and the count would silently not move.
    case 'veg':
      c.vegOnly = value === '1';
      c.nonVegOnly = value === '0';
      break;
    case 'openNow':
      c.openNow = on;
      break;
    case 'outdoor':
      c.outdoorSeating = on;
      break;
    case 'delivery':
      c.delivery = on;
      break;
    case 'family':
      c.familyFriendly = on;
      break;
    case 'quiet':
      c.quiet = on;
      break;
    case 'maxPrice':
      c.maxPriceForTwo = value ? Number(value) : undefined;
      break;
    case 'rating':
      c.minRating = value ? Number(value) : undefined;
      break;
    case 'availability':
      c.availability = (value || undefined) as FilterCriteria['availability'];
      break;
    // A distance cap without an origin is not a filter, it is a lie — so the
    // pair is set and cleared together.
    case 'distance':
      if (value && origin) {
        c.withinKm = Number(value);
        c.origin = origin;
      } else {
        c.withinKm = undefined;
        c.origin = undefined;
      }
      break;
    default:
      break;
  }
  return c;
}
