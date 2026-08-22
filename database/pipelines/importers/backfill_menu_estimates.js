require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Categories to exclude from estimate calculation (must match src/lib/costEstimate.ts EXCLUDED_CATEGORY_RE)
const EXCLUDED_CATEGORY_RE = /beverage|drinks?|juice|shake|smoothie|mocktail|cocktail|soft.?drink|water|tea|coffee|espresso|latte|cappuccino|dessert|sweets|ice.?cream|pastr|bakery|cake|side|starter|appetizer|salad|fries|chips|naan|roti|paratha|bread|sauce|chutney|dip|add-?on|extra|topping/i;

function roundToTen(n) {
  return Math.max(1, Math.round(n / 10) * 10);
}

function medianOf(sorted) {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Compute menu estimate for a restaurant from its menu data
async function computeMenuEstimateForRestaurant(restaurantId) {
  // Fetch menus for this restaurant
  const { data: menus, error: menusError } = await supabase
    .from('menus')
    .select('id, restaurant_id')
    .eq('restaurant_id', restaurantId);
  if (menusError) throw menusError;
  if (!menus || menus.length === 0) return null;

  // Fetch all menu items for these menus
  const menuIds = menus.map(m => m.id);
  let allItems = [];
  for (const menuId of menuIds) {
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('id, menu_id, item_name, category')
      .eq('menu_id', menuId);
    if (itemsError) throw itemsError;
    if (items) allItems.push(...items);
  }
  if (allItems.length === 0) return null;

  // Fetch price observations for all items
  const itemIds = allItems.map(i => i.id);
  let allObservations = [];
  const PAGE = 1000;
  for (let offset = 0; offset < itemIds.length; offset += PAGE) {
    const chunk = itemIds.slice(offset, offset + PAGE);
    const { data: obs, error: obsError } = await supabase
      .from('price_observations')
      .select('id, menu_item_id, price, verification_status')
      .in('menu_item_id', chunk);
    if (obsError) throw obsError;
    if (obs) allObservations.push(...obs);
  }

  // Build observations by item_id
  const obsByItem = {};
  for (const o of allObservations) {
    if (!obsByItem[o.menu_item_id]) obsByItem[o.menu_item_id] = [];
    obsByItem[o.menu_item_id].push(o);
  }

  // Compute estimate using the same logic as frontend
  const DISPLAYABLE_STATUSES = new Set(['UNVERIFIED', 'SOURCE_VERIFIED', 'RESTAURANT_CONFIRMED', 'KK_VERIFIED']);
  const prices = [];
  for (const item of allItems) {
    if (EXCLUDED_CATEGORY_RE.test(item.category || '')) continue;
    const observations = obsByItem[item.id] || [];
    const displayable = observations
      .filter(o => DISPLAYABLE_STATUSES.has(o.verification_status))
      .sort((a, b) => (a.observed_at || '').localeCompare(b.observed_at || ''));
    if (displayable.length > 0) {
      const latest = displayable[displayable.length - 1];
      if (latest.price !== null && latest.price > 0) {
        prices.push(latest.price);
      }
    }
  }

  if (prices.length === 0) return null;

  const sorted = [...prices].sort((a, b) => a - b);
  const rawMedian = medianOf(sorted);
  const trimmed = sorted.filter(p => p >= rawMedian / 2 && p <= rawMedian * 2);
  if (trimmed.length === 0) return null;
  const median = medianOf(trimmed);

  return {
    low: roundToTen(median * 2),
    high: roundToTen(median * 2 * 1.2),
    median: Math.round(median * 100) / 100,
    itemCount: prices.length,
    confidence: prices.length < 5 ? 'low' : prices.length < 15 ? 'medium' : 'high',
  };
}

async function backfillMenuEstimates() {
  console.log('=== MENU ESTIMATE BACKFILL ===');
  console.log('Fetching all restaurants...');

  // Fetch all restaurant IDs
  const { data: restaurants, error: restError } = await supabase
    .from('restaurants')
    .select('id, name');
  if (restError) throw restError;

  console.log(`Found ${restaurants.length} restaurants. Computing estimates...`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const restaurant of restaurants) {
    try {
      const estimate = await computeMenuEstimateForRestaurant(restaurant.id);
      if (estimate) {
        const { error } = await supabase
          .from('restaurant_attributes')
          .upsert({
            restaurant_id: restaurant.id,
            attribute_key: 'menuEstimate',
            attribute_value: estimate,
          }, { onConflict: 'restaurant_id,attribute_key' });
        if (error) throw error;
        console.log(`  ✅ ${restaurant.name} (${restaurant.id}): menuEstimate stored (low=${estimate.low}, high=${estimate.high}, items=${estimate.itemCount}, confidence=${estimate.confidence})`);
        successCount++;
      } else {
        // Remove any existing estimate if no usable menu data
        const { error } = await supabase
          .from('restaurant_attributes')
          .delete()
          .eq('restaurant_id', restaurant.id)
          .eq('attribute_key', 'menuEstimate');
        if (error) throw error;
        console.log(`  ⚪ ${restaurant.name} (${restaurant.id}): no usable menu data, estimate removed`);
        skippedCount++;
      }
    } catch (err) {
      console.error(`  ❌ ${restaurant.name} (${restaurant.id}): Failed - ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n=== BACKFILL COMPLETE ===');
  console.log(`  Successful: ${successCount}`);
  console.log(`  Skipped (no menu): ${skippedCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Total: ${restaurants.length}`);
}

backfillMenuEstimates().catch(err => {
  console.error('Fatal exception:', err);
  process.exit(1);
});