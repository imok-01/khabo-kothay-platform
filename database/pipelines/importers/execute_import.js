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

  for (const entity of ENTITIES) {
    const res = await upsertEntity(entity);
    results.push(res);

    if (!res.success) {
      console.error(`Error processing ${entity.table}: ${res.error}`);
      halted = true;
      break;
    }

    const expectedFinal = before[entity.table] + res.inserted;
    console.log(`\n${entity.table}: ${res.count} rows in CSV | insert ${res.inserted} | update (conflict, upserted) ${res.updated} | expected final ${expectedFinal}`);
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
