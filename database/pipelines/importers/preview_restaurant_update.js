require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const IMPORT_DIR = path.join(__dirname, 'KHABO_KOTHAY_PILOT_IMPORT_v1');

async function readCsv(file) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path.join(IMPORT_DIR, file))
      .pipe(csv())
      .on('data', d => results.push(d))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function nullIfEmpty(val) {
  if (val === '' || val === null || val === undefined) return null;
  return val;
}

async function main() {
  // 1. Read corrected CSV
  const csvRows = await readCsv('01_restaurants_preview.csv');
  const csvById = {};
  for (const r of csvRows) {
    csvById[r.id] = r;
  }

  // 2. Fetch current Supabase restaurants
  const { data: dbRows, error } = await supabase
    .from('restaurants')
    .select('id, name, description, city, area, phone, website, status')
    .in('id', Object.keys(csvById));

  if (error) {
    console.error('Error fetching from Supabase:', error.message);
    process.exit(1);
  }

  const UPDATE_FIELDS = ['description', 'city', 'area', 'phone', 'website', 'status'];

  const previewRows = [];

  for (const dbRow of dbRows) {
    const csvRow = csvById[dbRow.id];
    if (!csvRow) continue;

    const changes = {};
    let hasChange = false;

    for (const field of UPDATE_FIELDS) {
      const dbVal = dbRow[field] ?? null;
      const csvVal = nullIfEmpty(csvRow[field]);
      if (dbVal !== csvVal) {
        changes[field] = { current: dbVal, new: csvVal };
        hasChange = true;
      }
    }

    previewRows.push({
      id: dbRow.id,
      name: dbRow.name,
      hasChange,
      changes
    });
  }

  // Output preview report as JSON
  console.log(JSON.stringify(previewRows, null, 2));
}

main();
