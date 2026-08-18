const fs = require('fs');
const doc1 = fs.readFileSync('spec_foundation.txt', 'utf8');

const idx = doc1.indexOf('PART 3 — MENU + PRICING SYSTEM');
if (idx !== -1) {
  console.log(doc1.substring(idx, idx + 3500));
}
