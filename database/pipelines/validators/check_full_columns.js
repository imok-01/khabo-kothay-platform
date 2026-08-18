const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IMPORT_DIR = path.join(__dirname, 'KHABO_KOTHAY_FULL_IMPORT_v1');

const ENTITIES = [
  { table: 'restaurants', file: '01_restaurants_preview.csv' },
  { table: 'restaurant_sources', file: '02_restaurant_sources_preview.csv' },
  { table: 'restaurant_attributes', file: '03_restaurant_attributes_preview.csv' },
  { table: 'review_signals', file: '04_review_signals_preview.csv' },
  { table: 'menus', file: '05_menus_preview.csv' },
  { table: 'menu_items', file: '06_menu_items_preview.csv' },
  { table: 'price_observations', file: '07_price_observations_preview.csv' },
  { table: 'image_references', file: '08_image_references_preview.csv' },
  { table: 'review_samples', file: '09_review_samples_preview.csv' }
];

async function getCsvHeaders(file) {
  const fp = path.join(IMPORT_DIR, file);
  if (!fs.existsSync(fp)) return [];
  return new Promise((resolve) => {
    let resolved = false;
    fs.createReadStream(fp).pipe(csv())
      .on('headers', h => { if (!resolved) { resolved = true; resolve(h); } })
      .on('end', () => { if (!resolved) resolve([]); });
  });
}

async function getSupabaseColumns() {
  const url = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;
  const response = await fetch(url, { headers: { 'Authorization': `Bearer ${supabaseKey}` } });
  const spec = await response.json();
  const tables = {};
  if (spec && spec.definitions) {
    for (const [key, def] of Object.entries(spec.definitions)) {
      if (def.properties) tables[key] = Object.keys(def.properties);
    }
  }
  return tables;
}

async function main() {
  const dbSchema = await getSupabaseColumns();
  let ready = true;
  for (const e of ENTITIES) {
    const csvHeaders = await getCsvHeaders(e.file);
    const dbCols = dbSchema[e.table] || [];
    const extra = csvHeaders.filter(c => !dbCols.includes(c));
    if (extra.length > 0) ready = false;
    console.log(`${e.table}: CSV=[${csvHeaders.join(', ')}] | Extra in CSV: ${extra.length === 0 ? 'None ✅' : extra.join(', ') + ' ❌'}`);
  }
  console.log(`\nSchema Compatibility: ${ready ? 'READY ✅' : 'NOT READY ❌'}`);
}
main();
