/**
 * KHABO KOTHAY — Restaurant Intelligence Enrichment Pipeline v1.0
 *
 * PHASE 2 of DATABASE_INTELLIGENCE_AUDIT.md. Enriches the live Supabase
 * dataset with source-backed discovery intelligence:
 *
 *   1. restaurant_attributes  — cuisines / mealTypes / signatureDishes
 *   2. verification_records   — provenance for every enrichment row
 *   3. restaurants            — area / city (only where evidence exists)
 *   4. menu_items             — category normalization (exact-match map)
 *
 * RULES (from the approved plan):
 *   - Evidence only. No fabrication. vibes/occasion/dietary/description are
 *     deliberately NOT populated (no source evidence exists).
 *   - No deletes, no ID changes, no overwrite of stronger values.
 *   - Frontend-compatible shapes: arrays for cuisines/mealTypes/signatureDishes.
 *   - Provenance uses the existing verification_records table (no schema change).
 *   - Dry-run by default. `--apply` performs safe upserts (requires approval).
 *
 * USAGE:
 *   node enrich_intelligence.js            # dry-run → ENRICHMENT_DIFF_REPORT.md
 *   node enrich_intelligence.js --apply    # perform upserts (after approval)
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { v5: uuidv5 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// ============================================================
// CONFIG — IDENTICAL NAMESPACE TO THE PACKAGE GENERATOR
// ============================================================
const NAMESPACE = 'ce5cb46e-302f-4e0c-b938-1a7faf364718';
const APPLY = process.argv.includes('--apply');

// Verification status constant. Founder decision (2026-08-18): use the existing
// SOURCE_VERIFIED enum value (option b) — no new enum value is created.
const VERIFICATION_STATUS = 'SOURCE_VERIFIED';

const DB_DIR = path.join(__dirname, '..', '..');
const SOURCE_DIR = path.join(DB_DIR, 'imports', 'source');
const IDENTITY_XLSX = path.join(SOURCE_DIR, 'Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx');
const MENU_XLSX = path.join(SOURCE_DIR, 'KK_Actual_Menu_Extraction_FINAL_206.xlsx');
const ALIAS_CSV = path.join(SOURCE_DIR, 'restaurant_menu_aliases.csv');
const CATEGORY_MAP = path.join(__dirname, 'menu_category_map.json');
const REPORT_PATH = path.join(__dirname, 'ENRICHMENT_DIFF_REPORT.md');

// ============================================================
// UTILITIES (identical semantics to the package generator)
// ============================================================
function isBlank(value) {
  return value === null || value === undefined || (typeof value === 'number' && isNaN(value)) || String(value).trim() === '';
}
function cleanStr(value) {
  if (isBlank(value)) return null;
  if (typeof value === 'number') return String(value);
  return String(value).trim();
}
function normalizeName(value) {
  const cleaned = cleanStr(value);
  return cleaned ? cleaned.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
}
function stableId(kind, key) {
  return uuidv5(`khabo-kothay-pilot-v1/${kind}/${key}`, NAMESPACE);
}

// ============================================================
// CURATED MAPPINGS (evidence-based, exact-match only)
// ============================================================
// Google `Category` value → canonical cuisines. Only values that ARE cuisines
// map; venue types ("Restaurant", "Buffet", "Food court", "Cafe"…) map to [].
const CUISINE_MAP = {
  Chinese: ['Chinese'],
  'Fast Food': ['Fast Food'],
  Steak: ['Steakhouse'],
  Buffet: [],
  Japanese: ['Japanese'],
  Thai: ['Thai'],
  Indian: ['Indian'],
  Bangladeshi: ['Bangladeshi'],
  Italian: ['Italian'],
  Bengali: ['Bengali'],
  Korean: ['Korean'],
  'Middle Eastern': ['Middle Eastern'],
  Turkish: ['Turkish'],
  Pizza: ['Pizza'],
  'Food court': [],
  Continental: ['Continental'],
  Mexican: ['Mexican'],
  Cafe: [],
  Asian: ['Asian'],
  'Southern Italian': ['Italian'],
  Hamburger: ['Burgers'],
  Cantonese: ['Chinese'],
  'Fusion restauran': ['Fusion'],
  Sushi: ['Japanese'],
  'Takeout restaura': [],
  Portuguese: ['Portuguese'],
  'Pan Asian': ['Asian'],
  'Asian Fusion': ['Asian'],
  'Coffee shop': [],
  'Fried Chicken': ['Fast Food'],
  'Dessert shop': [],
  'Fish & Chips': ['British'],
  Lebanese: ['Middle Eastern'],
  '4-star hotel': [],
  'Family-friendly': [],
  Seafood: ['Seafood'],
};

// Menu category → meal type (frontend controlled vocabulary only).
// Key: substring patterns found in menu category names. Values restricted to
// the frontend's MealType list: Breakfast, Brunch, Lunch, Snacks, Dinner, Dessert.
const MEAL_TYPE_PATTERNS = [
  { pattern: 'breakfast', mealType: 'Breakfast' },
  { pattern: 'brunch', mealType: 'Brunch' },
  { pattern: 'lunch', mealType: 'Lunch' },
  { pattern: 'dinner', mealType: 'Dinner' },
  { pattern: 'dessert', mealType: 'Dessert' },
  { pattern: 'snack', mealType: 'Snacks' },
];

// Menu category → signature-dish signal. Items under these sections are the
// restaurant's own labelling (Popular / Signature / Chef's special).
const SIGNATURE_PATTERNS = [
  'popular',
  'signature',
  'chef',
  'bestseller',
  'favourite',
  'favorites',
  'showstopper',
  'recommended',
  'special',
];

// Known Dhaka areas for `area` extraction — only when the address explicitly
// contains the area name (evidence, not inference).
const KNOWN_AREAS = [
  'Gulshan', 'Banani', 'Dhanmondi', 'Mohakhali', 'Baridhara', 'Bashundhara',
  'Uttara', 'Tejgaon', 'Niketan', 'Badda', 'Rampura', 'Mirpur', 'Motijheel',
  'Dilkusha', 'Kakrail', 'Shantinagar', 'Farmgate', 'Kawran Bazar',
  'Karwan Bazar', 'Paltan', 'Segunbagicha', 'Moghbazar', 'Hazaribagh',
  'New Market', 'Lalmatia', 'Mohammadpur', 'Khilgaon', 'Shyamoli',
];

// ============================================================
// SOURCE LOADING
// ============================================================
function loadIdentityRows() {
  const wb = XLSX.readFile(IDENTITY_XLSX);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
}

function loadMenuRows() {
  const wb = XLSX.readFile(MENU_XLSX);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
}

function loadAliases() {
  if (!fs.existsSync(ALIAS_CSV)) return [];
  const lines = fs.readFileSync(ALIAS_CSV, 'utf8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  const aliases = [];
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(',');
    if (f.length >= 4) {
      aliases.push({ restaurant_name: f[1].trim(), source_alias: f[2].trim() });
    }
  }
  return aliases;
}

function loadCategoryMap() {
  const raw = JSON.parse(fs.readFileSync(CATEGORY_MAP, 'utf8'));
  const { _meta, ...map } = raw;
  return map;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const categoryMap = loadCategoryMap();

  // ---- Load live data (paginated) -------------------------------------
  async function fetchAll(table, columns) {
    const all = [];
    let from = 0;
    while (true) {
      const { data, error } = await sb.from(table).select(columns).range(from, from + 999);
      if (error) throw new Error(`${table}: ${error.message}`);
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }
    return all;
  }

  const [restaurants, attributes, menus, menuItems, verification] = await Promise.all([
    fetchAll('restaurants', 'id,name,address,area,city,description'),
    fetchAll('restaurant_attributes', 'id,restaurant_id,attribute_key,attribute_value'),
    fetchAll('menus', 'id,restaurant_id'),
    fetchAll('menu_items', 'id,menu_id,item_name,category'),
    fetchAll('verification_records', 'id,restaurant_id,field_name,status,verification_source'),
  ]);

  const restByName = new Map();
  for (const r of restaurants) restByName.set(normalizeName(r.name), r);
  const aliasByNorm = new Map();
  for (const a of loadAliases()) aliasByNorm.set(normalizeName(a.source_alias), a);
  const attrsByRest = new Map();
  for (const a of attributes) {
    if (!attrsByRest.has(a.restaurant_id)) attrsByRest.set(a.restaurant_id, new Map());
    attrsByRest.get(a.restaurant_id).set(a.attribute_key, a);
  }
  const menuByRest = new Map();
  for (const m of menus) {
    if (!menuByRest.has(m.restaurant_id)) menuByRest.set(m.restaurant_id, []);
    menuByRest.get(m.restaurant_id).push(m.id);
  }
  const itemsByMenu = new Map();
  for (const i of menuItems) {
    if (!itemsByMenu.has(i.menu_id)) itemsByMenu.set(i.menu_id, []);
    itemsByMenu.get(i.menu_id).push(i);
  }

  // ---- Plan containers -------------------------------------------------
  const attrInserts = []; // { restaurant_id, attribute_key, value (array), source, confidence }
  const attrSkips = []; // { restaurant_id, attribute_key, reason }
  const restUpdates = []; // { restaurant_id, field, value, source }
  const categoryChanges = []; // { menu_item_id, from, to }
  const provenanceRecords = []; // { restaurant_id, field_name, field_value, verification_source }

  // ---- 1. Cuisines from identity Category ------------------------------
  const identityRows = loadIdentityRows();
  for (const row of identityRows) {
    const norm = normalizeName(row['Restaurant name']);
    const rest = restByName.get(norm);
    if (!rest) continue;
    const category = cleanStr(row['Category']);
    const cuisines = category ? (CUISINE_MAP[category] ?? []) : [];
    if (cuisines.length === 0) {
      attrSkips.push({ restaurant_id: rest.id, attribute_key: 'cuisines', reason: `no cuisine evidence (Category="${category ?? 'empty'}")` });
      continue;
    }
    const existing = attrsByRest.get(rest.id)?.get('cuisines');
    if (existing) {
      attrSkips.push({ restaurant_id: rest.id, attribute_key: 'cuisines', reason: 'already present' });
      continue;
    }
    attrInserts.push({ restaurant_id: rest.id, attribute_key: 'cuisines', value: cuisines, source: 'GOOGLE_PLACES', confidence: 'HIGH' });
    provenanceRecords.push({ restaurant_id: rest.id, field_name: 'cuisines', field_value: cuisines, verification_source: 'GOOGLE_PLACES' });
  }

  // ---- 2. Meal types + signature dishes from menu categories -----------
  for (const rest of restaurants) {
    const menuIds = menuByRest.get(rest.id) ?? [];
    const allItems = menuIds.flatMap((mid) => itemsByMenu.get(mid) ?? []);
    if (allItems.length === 0) continue;

    // Meal types: only from the restaurant's own menu category text.
    const mealTypes = new Set();
    for (const item of allItems) {
      const cat = (item.category ?? '').toLowerCase();
      for (const { pattern, mealType } of MEAL_TYPE_PATTERNS) {
        if (cat.includes(pattern)) mealTypes.add(mealType);
      }
    }
    const mealList = [...mealTypes];
    if (mealList.length > 0) {
      const existing = attrsByRest.get(rest.id)?.get('mealTypes');
      if (!existing) {
        attrInserts.push({ restaurant_id: rest.id, attribute_key: 'mealTypes', value: mealList, source: 'MENU_EXTRACTION', confidence: 'MEDIUM' });
        provenanceRecords.push({ restaurant_id: rest.id, field_name: 'mealTypes', field_value: mealList, verification_source: 'MENU_EXTRACTION' });
      } else {
        attrSkips.push({ restaurant_id: rest.id, attribute_key: 'mealTypes', reason: 'already present' });
      }
    }

    // Signature dishes: items under explicitly-labelled sections only.
    const sigItems = allItems.filter((i) => {
      const cat = (i.category ?? '').toLowerCase();
      return SIGNATURE_PATTERNS.some((p) => cat.includes(p));
    });
    if (sigItems.length > 0) {
      const existing = attrsByRest.get(rest.id)?.get('signatureDishes');
      if (!existing) {
        const dishes = [...new Set(sigItems.map((i) => i.item_name.trim()).filter(Boolean))].slice(0, 20);
        attrInserts.push({ restaurant_id: rest.id, attribute_key: 'signatureDishes', value: dishes, source: 'MENU_EXTRACTION', confidence: 'MEDIUM' });
        provenanceRecords.push({ restaurant_id: rest.id, field_name: 'signatureDishes', field_value: dishes, verification_source: 'MENU_EXTRACTION' });
      } else {
        attrSkips.push({ restaurant_id: rest.id, attribute_key: 'signatureDishes', reason: 'already present' });
      }
    }
  }

  // ---- 3. restaurants.area / city (evidence only) ----------------------
  for (const rest of restaurants) {
    const addr = (rest.address ?? '').toLowerCase();
    if (!rest.area && addr) {
      const hit = KNOWN_AREAS.find((a) => addr.includes(a.toLowerCase()));
      if (hit) restUpdates.push({ restaurant_id: rest.id, field: 'area', value: hit, source: 'ADDRESS_TEXT' });
    }
    if (!rest.city && (rest.address || rest.area)) {
      restUpdates.push({ restaurant_id: rest.id, field: 'city', value: 'Dhaka', source: 'DATASET_SCOPE' });
    }
  }

  // ---- 4. menu_items category normalization ----------------------------
  for (const item of menuItems) {
    if (!item.category) continue;
    const canonical = categoryMap[item.category];
    if (canonical && canonical !== item.category) {
      categoryChanges.push({ menu_item_id: item.id, from: item.category, to: canonical });
    }
  }

  // ---- 5. verification_records for every planned attribute -------------
  // (provenanceRecords built alongside each attribute above)

  // ============================================================
  // REPORT / APPLY
  // ============================================================
  const affectedRests = new Set([
    ...attrInserts.map((a) => a.restaurant_id),
    ...restUpdates.map((r) => r.restaurant_id),
  ]);
  const restById = new Map(restaurants.map((r) => [r.id, r]));

  if (!APPLY) {
    // ---- DRY-RUN REPORT ----
    const lines = [];
    lines.push('# ENRICHMENT DIFF REPORT');
    lines.push('');
    lines.push(`**Generated:** ${new Date().toISOString()} · **Mode:** DRY-RUN (no writes)`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Count |`);
    lines.push(`|---|---|`);
    lines.push(`| Restaurants affected (attributes or restaurant fields) | ${affectedRests.size} |`);
    lines.push(`| Attributes to add | ${attrInserts.length} |`);
    lines.push(`| Attributes skipped (already present / no evidence) | ${attrSkips.length} |`);
    lines.push(`| Restaurant field updates (area/city) | ${restUpdates.length} |`);
    lines.push(`| Menu category changes | ${categoryChanges.length} |`);
    lines.push(`| Provenance records to create | ${provenanceRecords.length} |`);
    lines.push('');
    lines.push('## Attributes to add');
    lines.push('');
    const byKey = {};
    for (const a of attrInserts) byKey[a.attribute_key] = (byKey[a.attribute_key] || 0) + 1;
    for (const [k, v] of Object.entries(byKey)) lines.push(`- **${k}**: ${v}`);
    lines.push('');
    lines.push('## Attributes skipped');
    lines.push('');
    const skipReasons = {};
    for (const s of attrSkips) skipReasons[s.reason] = (skipReasons[s.reason] || 0) + 1;
    for (const [k, v] of Object.entries(skipReasons)) lines.push(`- ${k}: ${v}`);
    lines.push('');
    lines.push('## Menu category changes (top 25 by count)');
    lines.push('');
    const changeCounts = {};
    for (const c of categoryChanges) {
      const key = `${c.from} → ${c.to}`;
      changeCounts[key] = (changeCounts[key] || 0) + 1;
    }
    const topChanges = Object.entries(changeCounts).sort((a, b) => b[1] - a[1]).slice(0, 25);
    for (const [k, v] of topChanges) lines.push(`- ${k}: ${v} items`);
    lines.push('');
    lines.push('## Restaurant field updates');
    lines.push('');
    const updByField = {};
    for (const u of restUpdates) updByField[`${u.field} (${u.source})`] = (updByField[`${u.field} (${u.source})`] || 0) + 1;
    for (const [k, v] of Object.entries(updByField)) lines.push(`- ${k}: ${v}`);
    lines.push('');
    lines.push('## Provenance records');
    lines.push('');
    const provByField = {};
    for (const p of provenanceRecords) provByField[`${p.field_name} (${p.verification_source})`] = (provByField[`${p.field_name} (${p.verification_source})`] || 0) + 1;
    for (const [k, v] of Object.entries(provByField)) lines.push(`- ${k}: ${v}`);
    lines.push('');
    lines.push('## Examples — 20 restaurant changes');
    lines.push('');
    lines.push('| Restaurant | Change |');
    lines.push('|---|---|');
    const exampleRests = [...affectedRests].slice(0, 20);
    for (const rid of exampleRests) {
      const name = restById.get(rid)?.name ?? rid;
      const adds = attrInserts.filter((a) => a.restaurant_id === rid).map((a) => `${a.attribute_key}: [${a.value.join(', ')}]`).join('; ');
      const ups = restUpdates.filter((u) => u.restaurant_id === rid).map((u) => `${u.field}=${u.value}`).join('; ');
      const detail = [adds, ups].filter(Boolean).join(' | ');
      lines.push(`| ${name} | ${detail || '(no attribute/restaurant change)'} |`);
    }
    lines.push('');
    lines.push('## ⚠️ DECISION REQUIRED BEFORE --apply');
    lines.push('');
    lines.push(`1. **verification_status enum:** The approved status \`SOURCE_CONFIRMED\` is **NOT in the live enum** (live values: UNKNOWN, SOURCE_VERIFIED, RESTAURANT_CONFIRMED, KK_VERIFIED, STALE, CONFLICTING, UNVERIFIED, NEEDS_REVIEW). Options: (a) add \`SOURCE_CONFIRMED\` to the enum via migration, or (b) use \`SOURCE_VERIFIED\` instead. Pipeline is parameterized via \`VERIFICATION_STATUS\` constant.`);
    lines.push('2. Cuisine mapping derived from Google `Category` values (list above in attrInserts).');
    lines.push(`3. \`city=Dhaka\` backfill for ${restUpdates.filter((u) => u.field === 'city').length} rows (dataset is Dhaka-scoped).`);
    lines.push('4. Signature-dish rule: only items under sections explicitly named Popular/Signature/Chef\'s special.');

    fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');
    console.log(`DRY-RUN complete → ${REPORT_PATH}`);
    console.log(`Attributes to add: ${attrInserts.length} | Skips: ${attrSkips.length} | Restaurant updates: ${restUpdates.length} | Category changes: ${categoryChanges.length} | Provenance: ${provenanceRecords.length}`);
    return;
  }

  // ---- APPLY MODE (requires explicit --apply) --------------------------
  console.log('APPLY MODE — performing upserts...');

  // 1. restaurant_attributes
  let attrDone = 0;
  for (const a of attrInserts) {
    const { error } = await sb.from('restaurant_attributes').upsert({
      id: stableId('attribute', `${a.restaurant_id}/${a.attribute_key}`),
      restaurant_id: a.restaurant_id,
      attribute_key: a.attribute_key,
      attribute_value: a.value,
    });
    if (error) throw new Error(`attribute upsert ${a.restaurant_id}/${a.attribute_key}: ${error.message}`);
    attrDone++;
  }

  // 2. verification_records
  let provDone = 0;
  for (const p of provenanceRecords) {
    const { error } = await sb.from('verification_records').upsert({
      id: stableId('verification', `${p.restaurant_id}/${p.field_name}/${p.verification_source}`),
      restaurant_id: p.restaurant_id,
      field_name: p.field_name,
      field_value: p.field_value,
      status: VERIFICATION_STATUS,
      verification_source: p.verification_source,
      verified_at: new Date().toISOString(),
    });
    if (error) throw new Error(`verification insert ${p.restaurant_id}/${p.field_name}: ${error.message}`);
    provDone++;
  }

  // 3. restaurants (area / city)
  let restDone = 0;
  for (const u of restUpdates) {
    const { error } = await sb.from('restaurants').update({ [u.field]: u.value }).eq('id', u.restaurant_id);
    if (error) throw new Error(`restaurant update ${u.restaurant_id}/${u.field}: ${error.message}`);
    restDone++;
  }

  // 4. menu_items category normalization
  let catDone = 0;
  for (const c of categoryChanges) {
    const { error } = await sb.from('menu_items').update({ category: c.to }).eq('id', c.menu_item_id);
    if (error) throw new Error(`category update ${c.menu_item_id}: ${error.message}`);
    catDone++;
  }

  console.log(`APPLY complete — attributes: ${attrDone}, provenance: ${provDone}, restaurant updates: ${restDone}, category changes: ${catDone}`);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});