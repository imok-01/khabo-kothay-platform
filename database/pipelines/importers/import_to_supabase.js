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
const IMPORT_DIR = path.join(__dirname, '..', '..', 'imports', 'pilot');

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

// Validates and imports a single entity
async function validateAndImportEntity(entity) {
  const filePath = path.join(IMPORT_DIR, entity.file);
  console.log(`\n--- Processing ${entity.table} ---`);

  // PRE-INSERT VALIDATION 1: Confirm file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Validation Failed: File not found -> ${filePath}`);
    return false;
  }

  const records = await parseCsv(filePath);
  console.log(`Found ${records.length} records in ${entity.file}.`);

  if (records.length === 0) {
    console.log(`⚠️ No records to insert for '${entity.table}'. Skipping insert.`);
    return true; 
  }

  // PRE-INSERT VALIDATION 2: Confirm required columns
  const firstRecord = records[0];
  for (const col of entity.requiredCols) {
    if (!(col in firstRecord)) {
      console.error(`❌ Validation Failed: Required column missing -> '${col}' in ${entity.file}`);
      return false;
    }
  }
  console.log(`✅ Validation Passed: File exists and required columns are present.`);

  const cleanedRecords = records.map(cleanRecord);

  // SUPABASE INSERT LOGIC (Disabled for safety, replace logging with actual call when ready)
  let totalInserted = 0;
  for (let i = 0; i < cleanedRecords.length; i += BATCH_SIZE) {
    const batch = cleanedRecords.slice(i, i + BATCH_SIZE);
    
    /* === UNCOMMENT TO EXECUTE ACTUAL IMPORT ===
    const { data, error } = await supabase
      .from(entity.table)
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`❌ Insert Error in ${entity.table}:`, error.message);
      return false;
    }
    totalInserted += (data ? data.length : batch.length);
    */
    
    // Dry-run simulation counting
    totalInserted += batch.length; 
  }

  // POST-INSERT: Report inserted counts
  console.log(`✅ [DRY RUN] Would insert ${totalInserted} records into '${entity.table}'.`);
  return true;
}

async function main() {
  console.log("=== KHABO KOTHAY: SUPABASE IMPORT ===");

  for (const entity of ENTITIES) {
    const success = await validateAndImportEntity(entity);
    if (!success) {
      console.error(`\n🚨 Import halted at '${entity.table}' due to validation/insert failure. Dependency chain preserved.`);
      process.exit(1);
    }
  }

  console.log("\n✅ Supabase import script finished executing (Dry Run).");
}

main().catch(err => {
  console.error("Fatal exception:", err);
  process.exit(1);
});
