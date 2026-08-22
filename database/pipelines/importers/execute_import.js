require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 500;

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

// Recompute menu estimates for affected restaurants
async function recomputeMenuEstimates(restaurantIds) {
  if (!restaurantIds || restaurantIds.length === 0) return;
  console.log(`\n🔄 Recomputing menu estimates for ${restaurantIds.length} restaurant(s)...`);
  
  for (const restaurantId of restaurantIds) {
    try {
      const estimate = await computeMenuEstimateForRestaurant(restaurantId);
      if (estimate) {
        const { error } = await supabase
          .from('restaurant_attributes')
          .upsert({
            restaurant_id: restaurantId,
            attribute_key: 'menuEstimate',
            attribute_value: estimate,
          }, { onConflict: 'restaurant_id,attribute_key' });
        if (error) throw error;
        console.log(`  ✅ ${restaurantId}: menuEstimate updated (low=${estimate.low}, high=${estimate.high}, items=${estimate.itemCount}, confidence=${estimate.confidence})`);
      } else {
        // Remove estimate if no menu data
        const { error } = await supabase
          .from('restaurant_attributes')
          .delete()
          .eq('restaurant_id', restaurantId)
          .eq('attribute_key', 'menuEstimate');
        if (error) throw error;
        console.log(`  🗑️ ${restaurantId}: menuEstimate removed (no usable menu data)`);
      }
    } catch (err) {
      console.error(`  ❌ ${restaurantId}: Failed to recompute menuEstimate - ${err.message}`);
    }
  }
}

// Import directory is configurable:
//   --import-dir <rel-dir>   (relative to database/)  e.g. --import-dir imports/KHABO_KOTHAY_FULL_IMPORT_v2
//   KK_IMPORT_DIR env
// Default: imports/pilot (unchanged behavior).
function resolveImportDir() {
  const argIdx = process.argv.indexOf('--import-dir');
  if (argIdx !== -1 && process.argv[argIdx + 1]) {
    return path.resolve(__dirname, '..', '..', process.argv[argIdx + 1]);
  }
  if (process.env.KK_IMPORT_DIR) {
    return path.resolve(__dirname, '..', '..', process.env.KK_IMPORT_DIR);
  }
  return path.join(__dirname, '..', '..', 'imports', 'pilot');
}
const IMPORT_DIR = resolveImportDir();
const DRY_RUN = process.argv.includes('--dry-run');

const ENTITIES = [
  { table: 'restaurants', file: '01_restaurants_preview.csv' },
  { table: 'restaurant_sources', file: '02_restaurant_sources_preview.csv' },
  { table: 'restaurant_attributes', file: '03_restaurant_attributes_preview.csv' },
  { table: 'review_signals', file: '04_review_signals_preview.csv' },
  { table: 'menus', file: '05_menus_preview.csv' },
  { table: 'menu_items', file: '06_menu_items_preview.csv' },
  { table: 'price_observations', file: '07_price_observations_preview.csv' },
  { table: 'image_references', file: '08_image_references_preview.csv' }
];

async function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

function cleanRecord(record) {
  const cleaned = {};
  for (const [key, value] of Object.entries(record)) {
    cleaned[key] = (value === '' || value === 'NULL') ? null : value;
  }
  return cleaned;
}

// Fetch all existing ids of a table (paged; PostgREST caps a page at 1000 rows).
async function fetchExistingIds(table) {
  const ids = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Failed to read existing ids from ${table}: ${error.message}`);
    ids.push(...(data || []).map(r => r.id));
    if (!data || data.length < PAGE) break;
  }
  return new Set(ids);
}

// Upsert strategy (safe, deterministic-id based):
//   - rows whose id already exists -> UPDATE (pilot rows preserved, no deletes)
//   - rows with a new id          -> INSERT
//   - no data is ever removed
async function upsertEntity(entity) {
  const filePath = path.join(IMPORT_DIR, entity.file);
  if (!fs.existsSync(filePath)) {
    return { success: false, table: entity.table, error: 'File missing' };
  }

  const records = await parseCsv(filePath);
  if (records.length === 0) {
    return { success: true, table: entity.table, count: 0, inserted: 0, updated: 0 };
  }

  const cleanedRecords = records.map(cleanRecord);
  const existing = await fetchExistingIds(entity.table);

  // Classify every row first: id present live -> would UPDATE; otherwise INSERT.
  let inserted = 0;
  let updated = 0;
  for (const r of cleanedRecords) {
    if (r.id && existing.has(r.id)) updated++;
    else inserted++;
  }

  if (DRY_RUN) {
    return { success: true, table: entity.table, count: records.length, inserted, updated };
  }

  let total = 0;
  for (let i = 0; i < cleanedRecords.length; i += BATCH_SIZE) {
    const batch = cleanedRecords.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from(entity.table)
      .upsert(batch, { onConflict: 'id' })
      .select('id');

    if (error) {
      return { success: false, table: entity.table, error: error.message };
    }
    // Track ids as we go so later batches classify correctly.
    for (const r of batch) if (r.id) existing.add(r.id);
    total += (data ? data.length : batch.length);
  }

  return { success: true, table: entity.table, count: total, inserted, updated };
}

async function currentCounts() {
  const counts = {};
  for (const entity of ENTITIES) {
    const { count, error } = await supabase.from(entity.table).select('*', { count: 'exact', head: true });
    counts[entity.table] = error ? -1 : (count || 0);
  }
  return counts;
}

async function main() {
  console.log(`=== KHABO KOTHAY: SUPABASE IMPORT (${DRY_RUN ? 'DRY RUN — no writes' : 'LIVE UPSERT'}) ===`);
  console.log(`Import dir: ${IMPORT_DIR}`);

  const before = await currentCounts();
  console.log('\n=== Current live row counts ===');
  for (const [t, c] of Object.entries(before)) console.log(`  ${t}: ${c}`);

  // Pre-import snapshot (LIVE mode only — before any write): counts + existing
  // ids for rollback, saved to imports/logs/YYYY-MM-DD_FULL_IMPORT_BACKUP.json.
  if (!DRY_RUN) {
    const logsDir = path.join(__dirname, '..', '..', 'imports', 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    const ids = {};
    for (const entity of ENTITIES) {
      ids[entity.table] = [...(await fetchExistingIds(entity.table))];
    }
    const stamp = new Date().toISOString();
    const backup = {
      created_at: stamp,
      import_dir: IMPORT_DIR,
      mode: 'UPSERT (onConflict id) — no deletes',
      counts: before,
      existing_ids: ids
    };
    const backupPath = path.join(logsDir, `${stamp.slice(0, 10)}_FULL_IMPORT_BACKUP.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`\n📦 Pre-import snapshot saved: ${backupPath}`);
  }

  const results = [];
  let halted = false;
  // Track restaurant IDs affected by menu/price changes for estimate recomputation
  const affectedRestaurantIds = new Set();

  for (const entity of ENTITIES) {
    const res = await upsertEntity(entity);
    results.push(res);

    if (!res.success) {
      console.error(`Error processing ${entity.table}: ${res.error}`);
      halted = true;
      break;
    }

    // Collect affected restaurant IDs for menu/price estimate recomputation
    if (['menus', 'menu_items', 'price_observations'].includes(entity.table) && res.inserted + res.updated > 0) {
      // Fetch restaurant_ids from the upserted records
      const filePath = path.join(IMPORT_DIR, entity.file);
      if (fs.existsSync(filePath)) {
        const records = await parseCsv(filePath);
        for (const r of records) {
          const cleaned = cleanRecord(r);
          if (cleaned.restaurant_id) affectedRestaurantIds.add(cleaned.restaurant_id);
          else if (cleaned.menu_id) {
            // For menu_items, we need to resolve menu_id -> restaurant_id
            // This will be handled by the price_observations recomputation
          }
        }
      }
    }

    const expectedFinal = before[entity.table] + res.inserted;
    console.log(`\n${entity.table}: ${res.count} rows in CSV | insert ${res.inserted} | update (conflict, upserted) ${res.updated} | expected final ${expectedFinal}`);
  }

  // Recompute menu estimates for affected restaurants (LIVE mode only)
  if (!DRY_RUN && !halted && affectedRestaurantIds.size > 0) {
    // Also find restaurants affected via menu_items -> menus -> restaurants
    // Fetch restaurant_ids for any menu_ids in the imported menu_items
    const menuItemsEntity = ENTITIES.find(e => e.table === 'menu_items');
    if (menuItemsEntity) {
      const filePath = path.join(IMPORT_DIR, menuItemsEntity.file);
      if (fs.existsSync(filePath)) {
        const records = await parseCsv(filePath);
        const menuIds = new Set();
        for (const r of records) {
          const cleaned = cleanRecord(r);
          if (cleaned.menu_id) menuIds.add(cleaned.menu_id);
        }
        if (menuIds.size > 0) {
          const { data: menus } = await supabase
            .from('menus')
            .select('id, restaurant_id')
            .in('id', [...menuIds]);
          if (menus) {
            for (const m of menus) affectedRestaurantIds.add(m.restaurant_id);
          }
        }
      }
    }
    // Also check for menus table changes
    const menusEntity = ENTITIES.find(e => e.table === 'menus');
    if (menusEntity) {
      const filePath = path.join(IMPORT_DIR, menusEntity.file);
      if (fs.existsSync(filePath)) {
        const records = await parseCsv(filePath);
        for (const r of records) {
          const cleaned = cleanRecord(r);
          if (cleaned.restaurant_id) affectedRestaurantIds.add(cleaned.restaurant_id);
        }
      }
    }

    await recomputeMenuEstimates([...affectedRestaurantIds]);
  }

  console.log('\n=== Summary ===');
  for (const res of results) {
    console.log(`${res.table}: ${res.success ? 'SUCCESS' : 'FAILED (' + res.error + ')'} | insert ${res.inserted} | update ${res.updated}`);
  }

  if (halted) {
    console.log('\nImport halted due to an error.');
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('\n✅ DRY RUN COMPLETE — no data was written.');
    console.log('Final expected counts (current + inserts, updates are in-place):');
    for (const res of results) {
      const expectedFinal = before[res.table] + res.inserted;
      console.log(`  ${res.table}: ${before[res.table]} -> ${expectedFinal}`);
    }
    return;
  }

  console.log('\n=== Final Database Row Verification ===');
  const after = await currentCounts();
  for (const [t, c] of Object.entries(after)) {
    console.log(`${t} count: ${c}`);
  }

  console.log('\n=== Special Verification: Handi Combo - 1 ===');
  const { data, error } = await supabase
    .from('price_observations')
    .select('price, raw_price, verification_status')
    .eq('raw_price', 'Tk 494 / Tk 549');

  if (error) {
    console.log("Error querying Handi Combo - 1:", error.message);
  } else if (data && data.length > 0) {
    const r = data[0];
    console.log(`price: ${r.price === null ? 'NULL' : r.price}`);
    console.log(`raw_price: "${r.raw_price}"`);
    console.log(`verification_status: ${r.verification_status}`);
  } else {
    console.log("Record not found in database.");
  }
}

main().catch(err => {
  console.error("Fatal exception:", err);
  process.exit(1);
});
