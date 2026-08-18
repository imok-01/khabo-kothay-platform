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

// Initialize Supabase client
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
const DRY_RUN = true; // this script is a validation/dry-run tool only — it never writes

// Import order defined by dependency hierarchy
const ENTITIES = [
  { table: 'restaurants', file: '01_restaurants_preview.csv', requiredCols: ['id', 'name'] },
  { table: 'restaurant_sources', file: '02_restaurant_sources_preview.csv', requiredCols: ['id', 'restaurant_id', 'source_type', 'source_identifier'] },
  { table: 'restaurant_attributes', file: '03_restaurant_attributes_preview.csv', requiredCols: ['id', 'restaurant_id', 'attribute_key'] },
  { table: 'review_signals', file: '04_review_signals_preview.csv', requiredCols: ['id', 'restaurant_id', 'source'] },
  { table: 'menus', file: '05_menus_preview.csv', requiredCols: ['id', 'restaurant_id', 'title'] },
  { table: 'menu_items', file: '06_menu_items_preview.csv', requiredCols: ['id', 'menu_id', 'item_name'] },
  { table: 'price_observations', file: '07_price_observations_preview.csv', requiredCols: ['id', 'menu_item_id'] },
  { table: 'image_references', file: '08_image_references_preview.csv', requiredCols: ['id', 'restaurant_id', 'image_url'] },
  { table: 'review_samples', file: '09_review_samples_preview.csv', requiredCols: ['restaurant_id', 'source'] } // Empty file, minimal columns
];

// Helper to parse CSV asynchronously
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

// Helper to convert CSV empty strings to SQL NULL
function cleanRecord(record) {
  const cleaned = {};
  for (const [key, value] of Object.entries(record)) {
    // Treat "NULL" literal or empty string as actual null
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

// Validates and imports a single entity
async function validateAndImportEntity(entity) {
  const filePath = path.join(IMPORT_DIR, entity.file);
  console.log(`\n--- Processing ${entity.table} ---`);

  // PRE-INSERT VALIDATION 1: Confirm file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Validation Failed: File not found -> ${filePath}`);
    return { success: false, table: entity.table, error: 'File not found' };
  }

  const records = await parseCsv(filePath);
  console.log(`Found ${records.length} records in ${entity.file}.`);

  if (records.length === 0) {
    console.log(`⚠️ No records for '${entity.table}'. Skipping.`);
    return { success: true, table: entity.table, toInsert: 0, toUpdate: 0, current: undefined };
  }

  // PRE-INSERT VALIDATION 2: Confirm required columns
  const firstRecord = records[0];
  for (const col of entity.requiredCols) {
    if (!(col in firstRecord)) {
      console.error(`❌ Validation Failed: Required column missing -> '${col}' in ${entity.file}`);
      return { success: false, table: entity.table, error: `Required column missing: ${col}` };
    }
  }
  console.log(`✅ Validation Passed: File exists and required columns are present.`);

  const cleanedRecords = records.map(cleanRecord);

  // Classify every row against the live table's existing ids (read-only):
  //   new id      -> would INSERT
  //   existing id -> would UPDATE (upsert onConflict 'id'; pilot rows preserved, no deletes)
  const existing = await fetchExistingIds(entity.table);
  let toInsert = 0;
  let toUpdate = 0;
  for (const r of cleanedRecords) {
    if (r.id && existing.has(r.id)) toUpdate++;
    else toInsert++;
  }

  console.log(`✅ [DRY RUN] ${records.length} rows | insert ${toInsert} | update (conflict, upserted) ${toUpdate} | conflicts ${toUpdate}`);
  return { success: true, table: entity.table, toInsert, toUpdate, current: existing.size };
}

async function main() {
  console.log("=== KHABO KOTHAY: SUPABASE IMPORT VALIDATION (DRY RUN — no writes) ===");
  console.log(`Import dir: ${IMPORT_DIR}`);

  const results = [];
  for (const entity of ENTITIES) {
    const res = await validateAndImportEntity(entity);
    if (!res.success) {
      console.error(`\n🚨 Validation halted at '${entity.table}' due to validation/insert failure. Dependency chain preserved.`);
      process.exit(1);
    }
    results.push(res);
  }

  console.log("\n=== Final Expected Counts (current + inserts; updates are in-place) ===");
  for (const res of results) {
    if (typeof res.current === 'number') {
      console.log(`  ${res.table}: ${res.current} -> ${res.current + res.toInsert}`);
    } else {
      console.log(`  ${res.table}: (no rows in package)`);
    }
  }

  console.log("\n✅ Validation complete (Dry Run). No data was written.");
}

main().catch(err => {
  console.error("Fatal exception:", err);
  process.exit(1);
});
