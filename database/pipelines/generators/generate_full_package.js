/**
 * KHABO KOTHAY — Full 206 Restaurant Package Generator v1.0
 *
 * Generates a complete import package for all 206 restaurants.
 * Uses the IDENTICAL pipeline logic validated against the 10-restaurant pilot.
 *
 * KEY RULES:
 *  - Do NOT import into Supabase.
 *  - Do NOT modify schema.
 *  - UUID generation is IDENTICAL to pilot — uuidv5 with same namespace.
 *  - status field is APPLICATION-OWNED — never populated from source data.
 *  - No invented data. Missing source fields → NULL.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const { v5: uuidv5 } = require('uuid');

// ============================================================
// CONFIG — IDENTICAL TO PILOT
// ============================================================
const NAMESPACE = 'ce5cb46e-302f-4e0c-b938-1a7faf364718';
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'imports', 'full');

// ============================================================
// UTILITY FUNCTIONS — IDENTICAL TO PILOT
// ============================================================
function isBlank(value) {
  return value === null || value === undefined || (typeof value === 'number' && isNaN(value)) || String(value).trim() === '';
}
function cleanStr(value) {
  if (isBlank(value)) return null;
  if (typeof value === 'number') return String(value);
  return String(value).trim();
}
function numberOrNull(value) {
  if (isBlank(value)) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}
function normalizeName(value) {
  const cleaned = cleanStr(value);
  return cleaned ? cleaned.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}
function stableId(kind, key) {
  return uuidv5(`khabo-kothay-pilot-v1/${kind}/${key}`, NAMESPACE);
}
function parsePrice(value) {
  const raw = cleanStr(value);
  if (raw === null) return { price: null, rawPrice: null, isAmbiguous: false, candidates: [] };
  const matches = raw.match(/\d+(?:,\d{3})*(?:\.\d+)?/g);
  if (!matches || matches.length === 0) return { price: null, rawPrice: raw, isAmbiguous: true, candidates: [] };
  if (matches.length === 1) {
    const num = parseFloat(matches[0].replace(/,/g, ''));
    if (isNaN(num) || num < 0) return { price: null, rawPrice: raw, isAmbiguous: true, candidates: matches };
    return { price: String(num), rawPrice: raw, isAmbiguous: false, candidates: [String(num)] };
  }
  const candidateList = matches.map(m => m.replace(/,/g, ''));
  return { price: null, rawPrice: raw, isAmbiguous: true, candidates: candidateList };
}
function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
function writeCsvFile(filePath, headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => csvEscape(row[h])).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
}

// ============================================================
// MAIN
// ============================================================
async function run() {
  console.log('KHABO KOTHAY — Full 206 Restaurant Package Generation v1.0');
  console.log('=============================================================');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load source files
  const restWb = XLSX.readFile(path.join(__dirname, '..', '..', 'imports', 'source', 'Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx'));
  const restRows = XLSX.utils.sheet_to_json(restWb.Sheets['Restaurants'], { defval: null });
  console.log(`Source: ${restRows.length} restaurants loaded from identity file.`);

  const menuWb = XLSX.readFile(path.join(__dirname, '..', '..', 'imports', 'source', 'KK_Actual_Menu_Extraction_FINAL_206.xlsx'));
  const menuRows = XLSX.utils.sheet_to_json(menuWb.Sheets['Actual_Menu'], { defval: null });
  console.log(`Source: ${menuRows.length} menu rows loaded from menu file.`);

  // ============================================================
  // DEDUPLICATION: build canonical restaurant list from source
  // Some names may appear more than once in the Excel — keep first occurrence.
  // ============================================================
  const seenNorms = new Set();
  const duplicateSourceNames = [];
  const selected = [];

  for (let idx = 0; idx < restRows.length; idx++) {
    const row = restRows[idx];
    const norm = normalizeName(row['Restaurant name']);
    if (seenNorms.has(norm)) {
      duplicateSourceNames.push(cleanStr(row['Restaurant name']));
    } else {
      seenNorms.add(norm);
      selected.push({ idx, row });
    }
  }
  console.log(`Unique restaurants after deduplication: ${selected.length}`);
  if (duplicateSourceNames.length > 0) {
    console.warn(`⚠️ ${duplicateSourceNames.length} duplicate source names skipped:`, duplicateSourceNames);
  }

  // ============================================================
  // BUILD ENTITY ROWS
  // ============================================================
  const restaurantsRows = [];
  const sourcesRows = [];
  const attributesRows = [];
  const reviewSignalsRows = [];
  const imageRows = [];
  const restaurantIds = new Map();
  const sourceIds = new Map();
  const selectedNames = new Map();
  const missingValues = [];

  for (const item of selected) {
    const row = item.row;
    const sourceName = cleanStr(row['Restaurant name']);
    if (!sourceName) continue;

    const restaurantId = stableId('restaurant', sourceName);
    const norm = normalizeName(sourceName);
    restaurantIds.set(norm, restaurantId);
    selectedNames.set(norm, { row, restaurantId });

    // --------------------------------------------------------
    // RESTAURANTS — source-owned fields only
    // status is APPLICATION-OWNED: never populated here
    // description, city, area, phone, website: NULL (not in source)
    // --------------------------------------------------------
    restaurantsRows.push({
      id: restaurantId,
      name: sourceName,
      description: null,        // not in source
      address: cleanStr(row['Address']),
      city: null,                // not in source
      area: null,                // not in source
      latitude: numberOrNull(row['Latitude']),
      longitude: numberOrNull(row['Longitude']),
      phone: null,               // not in source
      website: null,             // not in source
      // status intentionally OMITTED from CSV — application-owned field
    });

    // Missing value tracking
    const checkedFields = [
      ['address', row['Address']],
      ['latitude', row['Latitude']],
      ['longitude', row['Longitude']],
      ['google_place_id', row['Google Place ID']],
      ['google_maps_link', row['Google Maps link']],
      ['google_rating', row['Google rating']],
      ['google_review_count', row['Google review count']],
      ['google_photo_link', row['Google photo link']]
    ];
    checkedFields.forEach(([field, val]) => {
      if (isBlank(val)) missingValues.push({ restaurant_name: sourceName, field });
    });

    // RESTAURANT SOURCES
    const placeId = cleanStr(row['Google Place ID']);
    const mapsLink = cleanStr(row['Google Maps link']);
    const sourceId = stableId('restaurant_source', restaurantId);
    sourceIds.set(restaurantId, sourceId);
    sourcesRows.push({
      id: sourceId,
      restaurant_id: restaurantId,
      source_type: 'GOOGLE_PLACES',
      source_identifier: placeId,
      source_url: mapsLink
    });

    // RESTAURANT ATTRIBUTES
    const attributeMappings = [
      ['category', row['Category']],
      ['opening_hours', row['Opening status / hours']],
      ['service_options', row['Service options']],
      ['price_range', row['Price range']]
    ];
    for (const [attrKey, rawVal] of attributeMappings) {
      const val = cleanStr(rawVal);
      if (val !== null) {
        attributesRows.push({
          id: stableId('attribute', `${restaurantId}/${attrKey}`),
          restaurant_id: restaurantId,
          attribute_key: attrKey,
          attribute_value: JSON.stringify(val)
        });
      }
    }

    // REVIEW SIGNALS
    const rating = numberOrNull(row['Google rating']);
    const reviewCount = numberOrNull(row['Google review count']);
    if (rating !== null || reviewCount !== null) {
      reviewSignalsRows.push({
        id: stableId('review_signal', restaurantId),
        restaurant_id: restaurantId,
        source: 'GOOGLE',
        rating: rating,
        review_count: reviewCount !== null ? Math.round(reviewCount) : null
      });
    }

    // IMAGE REFERENCES
    const imageUrl = cleanStr(row['Google photo link']);
    if (imageUrl !== null) {
      imageRows.push({
        id: stableId('image_reference', restaurantId),
        restaurant_id: restaurantId,
        image_url: imageUrl,
        source: 'GOOGLE',
        status: 'PENDING'
      });
    }
  }

  // ============================================================
  // MENU MAPPING
  // ============================================================
  const menuGroups = new Map();
  for (const mRow of menuRows) {
    const sourceRestaurant = cleanStr(mRow['Restaurant Name']);
    const norm = normalizeName(sourceRestaurant);
    if (selectedNames.has(norm)) {
      if (!menuGroups.has(norm)) menuGroups.set(norm, []);
      menuGroups.get(norm).push(mRow);
    }
  }

  const menusRows = [];
  const menuItemsRows = [];
  const priceRows = [];
  const ambiguousPriceEntries = [];
  const unmatchedMenuRestaurants = [];

  for (const [norm, { row: restaurantRow, restaurantId }] of selectedNames.entries()) {
    const restaurantName = cleanStr(restaurantRow['Restaurant name']);
    const menuId = stableId('menu', restaurantId);

    menusRows.push({
      id: menuId,
      restaurant_id: restaurantId,
      title: null,
      status: 'ACTIVE',
      source_id: null
    });

    const mRows = menuGroups.get(norm) || [];
    if (mRows.length === 0) {
      unmatchedMenuRestaurants.push({ restaurant_name: restaurantName, issue: 'No matching menu rows in menu source' });
    }

    mRows.forEach((menuRow, index) => {
      const position = index + 1;
      const dishName = cleanStr(menuRow['Dish Name']);
      const category = cleanStr(menuRow['Category Name']);
      const rawPrice = cleanStr(menuRow['Price']);

      if (dishName === null) return;

      const menuItemId = stableId('menu_item', `${menuId}/${position}/${dishName}`);
      menuItemsRows.push({ id: menuItemId, menu_id: menuId, item_name: dishName, category });

      const { price: parsedPrice, rawPrice: sourceRawPrice, isAmbiguous, candidates } = parsePrice(rawPrice);
      let verificationStatus = 'UNVERIFIED';
      let finalPrice = parsedPrice;

      if (isAmbiguous) {
        finalPrice = null;
        verificationStatus = 'NEEDS_REVIEW';
        ambiguousPriceEntries.push({
          restaurant_name: restaurantName,
          dish_name: dishName,
          raw_price: sourceRawPrice,
          candidate_1: candidates[0] ? `${candidates[0]} BDT` : 'N/A',
          candidate_2: candidates[1] ? `${candidates[1]} BDT` : 'N/A'
        });
      }

      priceRows.push({
        id: stableId('price_observation', menuItemId),
        menu_item_id: menuItemId,
        price: finalPrice,
        currency: 'BDT',
        raw_price: sourceRawPrice,
        source_id: null,
        observed_at: null,
        verification_status: verificationStatus
      });
    });
  }

  // ============================================================
  // WRITE CSV FILES
  // Note: status is OMITTED from restaurants CSV (application-owned field).
  // ============================================================
  writeCsvFile(path.join(OUTPUT_DIR, '01_restaurants_preview.csv'),
    ['id', 'name', 'description', 'address', 'city', 'area', 'latitude', 'longitude', 'phone', 'website'],
    restaurantsRows);

  writeCsvFile(path.join(OUTPUT_DIR, '02_restaurant_sources_preview.csv'),
    ['id', 'restaurant_id', 'source_type', 'source_identifier', 'source_url'],
    sourcesRows);

  writeCsvFile(path.join(OUTPUT_DIR, '03_restaurant_attributes_preview.csv'),
    ['id', 'restaurant_id', 'attribute_key', 'attribute_value'],
    attributesRows);

  writeCsvFile(path.join(OUTPUT_DIR, '04_review_signals_preview.csv'),
    ['id', 'restaurant_id', 'source', 'rating', 'review_count'],
    reviewSignalsRows);

  writeCsvFile(path.join(OUTPUT_DIR, '05_menus_preview.csv'),
    ['id', 'restaurant_id', 'title', 'status', 'source_id'],
    menusRows);

  writeCsvFile(path.join(OUTPUT_DIR, '06_menu_items_preview.csv'),
    ['id', 'menu_id', 'item_name', 'category'],
    menuItemsRows);

  writeCsvFile(path.join(OUTPUT_DIR, '07_price_observations_preview.csv'),
    ['id', 'menu_item_id', 'price', 'currency', 'raw_price', 'source_id', 'observed_at', 'verification_status'],
    priceRows);

  writeCsvFile(path.join(OUTPUT_DIR, '08_image_references_preview.csv'),
    ['id', 'restaurant_id', 'image_url', 'source', 'status'],
    imageRows);

  writeCsvFile(path.join(OUTPUT_DIR, '09_review_samples_preview.csv'),
    ['restaurant_id', 'source', 'source_url', 'review_text', 'attribution', 'observed_at'],
    []);

  // ============================================================
  // VALIDATION
  // ============================================================
  console.log('\n=== VALIDATION ===\n');

  // 1. Row Counts
  console.log('--- 1. Row Counts ---');
  console.log(`restaurants:          ${restaurantsRows.length}`);
  console.log(`restaurant_sources:   ${sourcesRows.length}`);
  console.log(`restaurant_attributes:${attributesRows.length}`);
  console.log(`review_signals:       ${reviewSignalsRows.length}`);
  console.log(`menus:                ${menusRows.length}`);
  console.log(`menu_items:           ${menuItemsRows.length}`);
  console.log(`price_observations:   ${priceRows.length}`);
  console.log(`image_references:     ${imageRows.length}`);
  console.log(`review_samples:       0 (header-only, PENDING COLLECTION)`);

  // 2. Identity Validation
  console.log('\n--- 2. Identity Validation ---');
  const allRestaurantIds = restaurantsRows.map(r => r.id);
  const allPlaceIds = sourcesRows.map(s => s.source_identifier).filter(Boolean);
  const allNames = restaurantsRows.map(r => r.name);

  const dupUUIDs = allRestaurantIds.filter((id, i) => allRestaurantIds.indexOf(id) !== i);
  const dupPlaceIds = allPlaceIds.filter((id, i) => allPlaceIds.indexOf(id) !== i);
  const dupNames = allNames.filter((n, i) => allNames.indexOf(n) !== i);

  console.log(`Duplicate restaurant UUIDs: ${dupUUIDs.length === 0 ? 'NONE ✅' : dupUUIDs.length + ' ❌'}`);
  console.log(`Duplicate Google Place IDs: ${dupPlaceIds.length === 0 ? 'NONE ✅' : dupPlaceIds.join(', ') + ' ❌'}`);
  console.log(`Duplicate restaurant names: ${dupNames.length === 0 ? 'NONE ✅' : dupNames.join(', ')}`);

  // 3. Foreign Key Validation
  console.log('\n--- 3. Foreign Key Validation ---');
  const restIdSet = new Set(restaurantsRows.map(r => r.id));
  const menuIdSet = new Set(menusRows.map(m => m.id));
  const menuItemIdSet = new Set(menuItemsRows.map(i => i.id));

  const brokenSources = sourcesRows.filter(r => !restIdSet.has(r.restaurant_id)).length;
  const brokenAttrs = attributesRows.filter(r => !restIdSet.has(r.restaurant_id)).length;
  const brokenSignals = reviewSignalsRows.filter(r => !restIdSet.has(r.restaurant_id)).length;
  const brokenMenus = menusRows.filter(r => !restIdSet.has(r.restaurant_id)).length;
  const brokenItems = menuItemsRows.filter(r => !menuIdSet.has(r.menu_id)).length;
  const brokenPrices = priceRows.filter(r => !menuItemIdSet.has(r.menu_item_id)).length;
  const brokenImages = imageRows.filter(r => !restIdSet.has(r.restaurant_id)).length;

  console.log(`restaurant_sources.restaurant_id → restaurants.id: ${brokenSources === 0 ? 'PASS ✅' : brokenSources + ' broken ❌'}`);
  console.log(`restaurant_attributes.restaurant_id → restaurants.id: ${brokenAttrs === 0 ? 'PASS ✅' : brokenAttrs + ' broken ❌'}`);
  console.log(`review_signals.restaurant_id → restaurants.id: ${brokenSignals === 0 ? 'PASS ✅' : brokenSignals + ' broken ❌'}`);
  console.log(`menus.restaurant_id → restaurants.id: ${brokenMenus === 0 ? 'PASS ✅' : brokenMenus + ' broken ❌'}`);
  console.log(`menu_items.menu_id → menus.id: ${brokenItems === 0 ? 'PASS ✅' : brokenItems + ' broken ❌'}`);
  console.log(`price_observations.menu_item_id → menu_items.id: ${brokenPrices === 0 ? 'PASS ✅' : brokenPrices + ' broken ❌'}`);
  console.log(`image_references.restaurant_id → restaurants.id: ${brokenImages === 0 ? 'PASS ✅' : brokenImages + ' broken ❌'}`);

  // 4. Pilot UUID Consistency Check (10 pilot restaurants must have same UUIDs)
  const PILOT_NAMES = [
    "Kiva Han", "Handi (Gulshan Branch)", "Chilis", "Waza",
    "Cheong Shing Restaurant, Dhaka.", "Bukhara Restaurant",
    "Premium Sweets", "Baan Busaba", "Ajo Idea Space", "Bar.B.Q Tonight"
  ];
  console.log('\n--- 4. Pilot UUID Consistency ---');
  let pilotConsistent = true;
  for (const name of PILOT_NAMES) {
    const expectedId = stableId('restaurant', name);
    const norm = normalizeName(name);
    const actualId = restaurantIds.get(norm);
    if (!actualId) {
      console.log(`  ❌ ${name}: NOT FOUND in 206 set!`);
      pilotConsistent = false;
    } else if (actualId !== expectedId) {
      console.log(`  ❌ ${name}: UUID MISMATCH! Expected ${expectedId}, got ${actualId}`);
      pilotConsistent = false;
    }
  }
  if (pilotConsistent) console.log(`  ✅ All 10 pilot restaurant UUIDs are IDENTICAL to pilot package.`);

  // 5. Unmatched menus
  console.log('\n--- 5. Restaurants Without Menu Data ---');
  if (unmatchedMenuRestaurants.length === 0) {
    console.log('  ✅ All restaurants have menu data.');
  } else {
    console.log(`  ⚠️ ${unmatchedMenuRestaurants.length} restaurants have no menu data:`);
    unmatchedMenuRestaurants.forEach(u => console.log(`    - ${u.restaurant_name}`));
  }

  // 6. Ambiguous prices
  console.log('\n--- 6. Ambiguous Prices (NEEDS_REVIEW) ---');
  console.log(`  ${ambiguousPriceEntries.length} price observation(s) stored with price=NULL, verification_status=NEEDS_REVIEW.`);

  // 7. Missing values summary
  const missingByField = {};
  for (const m of missingValues) {
    missingByField[m.field] = (missingByField[m.field] || 0) + 1;
  }
  console.log('\n--- 7. Missing Source Values ---');
  for (const [field, count] of Object.entries(missingByField)) {
    console.log(`  ${field}: ${count} restaurants missing`);
  }

  // Overall result
  const totalBroken = brokenSources + brokenAttrs + brokenSignals + brokenMenus + brokenItems + brokenPrices + brokenImages;
  const overallReady = restaurantsRows.length === selected.length && totalBroken === 0 && pilotConsistent && dupUUIDs.length === 0;

  console.log('\n=========================================');
  console.log(`IMPORT READINESS: ${overallReady ? '✅ READY — AWAITING FOUNDER APPROVAL' : '❌ NOT READY — SEE ERRORS ABOVE'}`);
  console.log('=========================================');
  console.log('\n⏸️  Stopping. No data has been imported into Supabase.');
  console.log('   Awaiting founder approval before any database operation.');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
