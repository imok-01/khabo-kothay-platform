const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const IMPORT_DIR = path.join(__dirname, '..', '..', 'imports', 'pilot');

const FILES = {
  restaurants: '01_restaurants_preview.csv',
  restaurant_sources: '02_restaurant_sources_preview.csv',
  restaurant_attributes: '03_restaurant_attributes_preview.csv',
  review_signals: '04_review_signals_preview.csv',
  menus: '05_menus_preview.csv',
  menu_items: '06_menu_items_preview.csv',
  price_observations: '07_price_observations_preview.csv',
  image_references: '08_image_references_preview.csv',
  review_samples: '09_review_samples_preview.csv'
};

async function readCsv(file) {
  const fp = path.join(IMPORT_DIR, file);
  if (!fs.existsSync(fp)) return [];
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(fp)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function main() {
  console.log("Starting Final Pre-Import Validation...");
  
  const data = {};
  for (const [key, file] of Object.entries(FILES)) {
    data[key] = await readCsv(file);
  }

  let allPass = true;

  // 1. Primary key uniqueness
  console.log("\n--- 1. Primary Key Uniqueness ---");
  for (const [key, rows] of Object.entries(data)) {
    if (rows.length === 0 || !rows[0].id) continue;
    const ids = new Set();
    let duplicates = 0;
    for (const r of rows) {
      if (ids.has(r.id)) duplicates++;
      ids.add(r.id);
    }
    if (duplicates > 0) {
      console.log(`❌ ${key}: ${duplicates} duplicate PKs found!`);
      allPass = false;
    } else {
      console.log(`✅ ${key}: All ${ids.size} PKs are unique.`);
    }
  }

  // 2. Foreign Key Relationships
  console.log("\n--- 2. Foreign Key Relationships ---");
  const checkFk = (child, childFk, parent, parentPk) => {
    const parentSet = new Set(data[parent].map(r => r[parentPk]));
    let orphans = 0;
    for (const r of data[child]) {
      if (!parentSet.has(r[childFk])) orphans++;
    }
    if (orphans > 0) {
      console.log(`❌ ${child}.${childFk} -> ${parent}.${parentPk}: ${orphans} orphan records found!`);
      allPass = false;
    } else {
      console.log(`✅ ${child}.${childFk} -> ${parent}.${parentPk}: All ${data[child].length} map perfectly.`);
    }
  };

  checkFk('restaurant_sources', 'restaurant_id', 'restaurants', 'id');
  checkFk('restaurant_attributes', 'restaurant_id', 'restaurants', 'id');
  checkFk('review_signals', 'restaurant_id', 'restaurants', 'id');
  checkFk('menus', 'restaurant_id', 'restaurants', 'id');
  checkFk('menu_items', 'menu_id', 'menus', 'id');
  checkFk('price_observations', 'menu_item_id', 'menu_items', 'id');
  checkFk('image_references', 'restaurant_id', 'restaurants', 'id');

  // 3. Special price verification
  console.log("\n--- 3. Special Price Verification (Handi Combo - 1) ---");
  const comboRecord = data.price_observations.find(r => r.raw_price === 'Tk 494 / Tk 549');
  if (comboRecord) {
    let valid = true;
    if (comboRecord.price !== '') valid = false; // stored as empty string in CSV
    if (comboRecord.verification_status !== 'NEEDS_REVIEW') valid = false;
    
    if (valid) {
      console.log(`✅ Handi Combo - 1 preserves raw_price="Tk 494 / Tk 549", price=NULL, verification_status=NEEDS_REVIEW.`);
    } else {
      console.log(`❌ Handi Combo - 1 failed check! Found: price="${comboRecord.price}", status="${comboRecord.verification_status}"`);
      allPass = false;
    }
  } else {
    console.log(`❌ Handi Combo - 1 record not found!`);
    allPass = false;
  }

  // 4. Confirm empty datasets
  console.log("\n--- 4. Empty Datasets ---");
  if (data.review_samples.length === 0) {
    console.log(`✅ review_samples: Verified 0 rows.`);
  } else {
    console.log(`❌ review_samples: Expected 0, found ${data.review_samples.length}`);
    allPass = false;
  }

  const tagsPath = path.join(IMPORT_DIR, 'restaurant_tags.csv');
  if (!fs.existsSync(tagsPath)) {
    console.log(`✅ restaurant_tags: Verified 0 rows (file does not exist).`);
  } else {
    console.log(`❌ restaurant_tags: File exists when it shouldn't.`);
    allPass = false;
  }

  console.log(`\nOVERALL STATUS: ${allPass ? 'PASS' : 'FAIL'}`);
}
main();
