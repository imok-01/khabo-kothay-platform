/**
 * KHABO KOTHAY — Discovery Facts Import Pipeline (Dry-Run by default)
 *
 * Loads database/pipelines/discovery-facts/pilot_facts.json and validates it
 * against the PROPOSED_1_3_discovery_facts.sql contract (the v1.3 migration):
 *
 *   - every fact references an existing restaurants.id (checked against live DB)
 *   - fact_type / confidence / status are valid enum values
 *   - status='APPROVED' facts MUST carry source_reference AND evidence_note
 *     (matches the `fact_approved_requires_evidence` CHECK constraint)
 *   - no duplicate (restaurant_id, fact_text) inside the file
 *
 * Writes FACTS_IMPORT_REPORT.md. Does NOT touch the database unless `--apply`
 * is passed. `--apply` is guarded and requires explicit approval — the pilot
 * facts must not be imported into the live DB yet (migration v1.3 is unexecuted).
 *
 * USAGE:
 *   node import_facts.js            # dry-run → FACTS_IMPORT_REPORT.md
 *   node import_facts.js --apply    # upsert into restaurant_discovery_facts
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const APPLY = process.argv.includes('--apply');
// Reads (dry-run) use the anon key. Writes (--apply) MUST use a service-role
// key: the v1.3 RLS policy grants anon/authenticated SELECT only.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = APPLY
  ? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  : process.env.VITE_SUPABASE_ANON_KEY;
const FACTS_FILE = path.join(__dirname, '..', '..', '..', 'DISCOVERY_FACTS_IMPORT_READY.json');
const REPORT_PATH = path.join(__dirname, 'FACTS_IMPORT_REPORT.md');

const FACT_TYPES = ['HISTORY', 'EXPERIENCE', 'CONCEPT', 'LOCATION', 'IDENTITY', 'OTHER'];
const CONFIDENCES = ['HIGH', 'MEDIUM', 'LOW'];
const STATUSES = ['DRAFT', 'REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'];

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function collectErrors(fact, index, seenKeys) {
  const errors = [];
  const at = `fact[${index}]`;
  if (!fact.restaurant_id) errors.push(`${at}: missing restaurant_id`);
  if (isBlank(fact.fact_text)) errors.push(`${at}: fact_text is blank`);
  if (!FACT_TYPES.includes(fact.fact_type)) errors.push(`${at}: invalid fact_type '${fact.fact_type}'`);
  if (!CONFIDENCES.includes(fact.confidence)) errors.push(`${at}: invalid confidence '${fact.confidence}'`);
  if (!STATUSES.includes(fact.status)) errors.push(`${at}: invalid status '${fact.status}'`);
  if (isBlank(fact.source_type)) errors.push(`${at}: source_type is blank`);
  if (fact.status === 'APPROVED') {
    if (isBlank(fact.source_reference)) errors.push(`${at}: APPROVED requires source_reference`);
    if (isBlank(fact.evidence_note)) errors.push(`${at}: APPROVED requires evidence_note`);
  }
  const key = `${fact.restaurant_id}|${String(fact.fact_text).trim().toLowerCase()}`;
  if (seenKeys.has(key)) errors.push(`${at}: duplicate (restaurant_id, fact_text)`);
  seenKeys.add(key);
  return errors;
}

async function main() {
  const client = createClient(SUPABASE_URL, SUPABASE_KEY);
  const raw = JSON.parse(fs.readFileSync(FACTS_FILE, 'utf8'));
  const facts = raw.facts || [];

  const { data: restaurants, error: restErr } = await client
    .from('restaurants')
    .select('id, name')
    .limit(1000);
  if (restErr) throw new Error(`failed to read restaurants: ${restErr.message}`);
  const restaurantIds = new Set(restaurants.map((r) => r.id));
  const restaurantName = Object.fromEntries(restaurants.map((r) => [r.id, r.name]));

  const seenKeys = new Set();
  const errors = [];
  const missingRestaurants = new Set();
  facts.forEach((fact, i) => {
    if (fact.restaurant_id && !restaurantIds.has(fact.restaurant_id)) {
      missingRestaurants.add(fact.restaurant_id);
      errors.push(`fact[${i}]: restaurant_id ${fact.restaurant_id} not found in restaurants table`);
    }
    errors.push(...collectErrors(fact, i, seenKeys));
  });

  const byRestaurant = {};
  facts.forEach((f) => {
    const name = restaurantName[f.restaurant_id] || f.restaurant_id;
    byRestaurant[name] = (byRestaurant[name] || 0) + 1;
  });

  const summary = {
    total: facts.length,
    approved: facts.filter((f) => f.status === 'APPROVED').length,
    byType: FACT_TYPES.map((t) => `${t}:${facts.filter((f) => f.fact_type === t).length}`).join(', '),
    byConfidence: CONFIDENCES.map((c) => `${c}:${facts.filter((f) => f.confidence === c).length}`).join(', '),
    byRestaurant: Object.entries(byRestaurant)
      .map(([k, v]) => `${k} (${v})`)
      .join(', '),
    errors: errors.length,
    missingRestaurants: missingRestaurants.size,
  };

  const report = [
    '# Discovery Facts Import Report',
    '',
    `Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`,
    `Date: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- Facts in file: ${summary.total}`,
    `- APPROVED: ${summary.approved}`,
    `- By fact_type: ${summary.byType}`,
    `- By confidence: ${summary.byConfidence}`,
    `- Validation errors: ${summary.errors}`,
    `- Unknown restaurant_ids: ${summary.missingRestaurants}`,
    '',
    '## Per-restaurant counts',
    '',
    summary.byRestaurant,
    '',
  ];

  if (errors.length > 0) {
    report.push('## Validation errors', '', ...errors.map((e) => `- ${e}`), '');
  }

  fs.writeFileSync(REPORT_PATH, report.join('\n'), 'utf8');
  console.log(`[${APPLY ? 'APPLY' : 'DRY-RUN'}] ${summary.total} facts, ${summary.approved} APPROVED, ${summary.errors} validation errors`);
  if (errors.length > 0) {
    errors.slice(0, 20).forEach((e) => console.log('  ! ' + e));
  }
  console.log(`Report written to ${REPORT_PATH}`);

  if (APPLY) {
    if (!SUPABASE_KEY) throw new Error('--apply requires VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
    if (errors.length > 0) {
      throw new Error('--apply aborted: validation errors present');
    }
    console.log('Applying upserts on (restaurant_id, fact_text)...');
    const { data, error } = await client
      .from('restaurant_discovery_facts')
      .upsert(
        facts.map(({ restaurant_name, ...rest }) => rest),
        { onConflict: 'restaurant_id,fact_text', ignoreDuplicates: false }
      )
      .select('id');
    if (error) throw new Error(`apply failed: ${error.message}`);
    console.log(`Applied ${data.length} facts.`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});