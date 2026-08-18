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
const IMPORT_DIR = path.join(__dirname, '..', '..', 'imports', 'pilot');

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

async function insertEntity(entity) {
  const filePath = path.join(IMPORT_DIR, entity.file);
  if (!fs.existsSync(filePath)) {
    return { success: false, table: entity.table, error: 'File missing' };
  }

  const records = await parseCsv(filePath);
  if (records.length === 0) return { success: true, table: entity.table, count: 0 };

  const cleanedRecords = records.map(cleanRecord);
  let totalInserted = 0;

  for (let i = 0; i < cleanedRecords.length; i += BATCH_SIZE) {
    const batch = cleanedRecords.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from(entity.table)
      .insert(batch)
      .select('id');

    if (error) {
      return { success: false, table: entity.table, error: error.message };
    }
    totalInserted += (data ? data.length : batch.length);
  }

  return { success: true, table: entity.table, count: totalInserted };
}

async function main() {
  const results = [];
  let halted = false;

  for (const entity of ENTITIES) {
    console.log(`Inserting into ${entity.table}...`);
    const res = await insertEntity(entity);
    results.push(res);
    
    if (!res.success) {
      console.error(`Error inserting into ${entity.table}: ${res.error}`);
      halted = true;
      break;
    }
  }

  console.log("\n=== Import Results ===");
  for (const res of results) {
    console.log(`${res.table}: ${res.success ? 'SUCCESS (' + res.count + ' rows)' : 'FAILED (' + res.error + ')'}`);
  }

  if (halted) {
    console.log("\nImport halted due to an error.");
    process.exit(1);
  }

  console.log("\n=== Final Database Row Verification ===");
  for (const entity of ENTITIES) {
    const { count, error } = await supabase.from(entity.table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`${entity.table}: Error fetching count -> ${error.message}`);
    } else {
      console.log(`${entity.table} count: ${count}`);
    }
  }

  console.log("\n=== Special Verification: Handi Combo - 1 ===");
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

main();
