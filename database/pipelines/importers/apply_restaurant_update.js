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
  const csvRows = await readCsv('01_restaurants_preview.csv');
  const csvById = {};
  for (const r of csvRows) {
    csvById[r.id] = r;
  }

  const { data: dbRows, error } = await supabase
    .from('restaurants')
    .select('id, name, description, city, area, phone, website, status')
    .in('id', Object.keys(csvById));

  if (error) {
    console.error('Error fetching from Supabase:', error.message);
    process.exit(1);
  }

  const UPDATE_FIELDS = ['description', 'city', 'area', 'phone', 'website', 'status'];
  let updatedCount = 0;

  for (const dbRow of dbRows) {
    const csvRow = csvById[dbRow.id];
    if (!csvRow) continue;

    const payload = {};
    for (const field of UPDATE_FIELDS) {
      payload[field] = nullIfEmpty(csvRow[field]);
    }

    const { error: updateError } = await supabase
      .from('restaurants')
      .update(payload)
      .eq('id', dbRow.id);

    if (updateError) {
      console.error(`Error updating ${dbRow.name}:`, updateError.message);
      process.exit(1);
    }

    console.log(`✅ Updated: ${dbRow.name}`);
    updatedCount++;
  }

  console.log(`\nTotal updated: ${updatedCount} restaurants.`);
  console.log('No other tables were modified.');
}

main();
