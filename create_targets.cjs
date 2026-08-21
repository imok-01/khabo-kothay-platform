const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('input/KK_REVIEW_COLLECTION_TARGETS.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet).slice(0, 5);

const csv = ['google_place_id,restaurant_name,google_maps_link,pilot_order'];
data.forEach((r, i) => {
  csv.push(`${r.google_place_id},"${r.restaurant_name}","${r.google_maps_link}",${i+1}`);
});

fs.writeFileSync('data/output/google_maps_scraper_pilot/pilot_targets.csv', csv.join('\n'));
console.log('Created pilot_targets.csv');
console.log(csv.join('\n'));