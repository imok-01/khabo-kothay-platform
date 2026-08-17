/**
 * Recovers the pre-migration demo restaurant dataset from the last build that
 * still contained it (dist/assets/index-B9PiXN1S.js) into
 * src/data/demo/demo-restaurants.ts.
 *
 * The original src/data/restaurants.ts was replaced by the real 206-restaurant
 * Dhaka dataset before a backup could be taken, so this script extracts the
 * compiled module from the previous production bundle. The recovered module is
 * used ONLY as a stable fixture by behaviour tests.
 *
 * Run: node scripts/extract-demo-reference.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const candidates = [
  path.join(ROOT, 'dist', 'assets', 'index-B9PiXN1S.js'),
];
const bundlePath = candidates.find((p) => fs.existsSync(p));
if (!bundlePath) {
  console.error('Bundle with demo data not found — was dist cleaned?');
  process.exit(1);
}

const s = fs.readFileSync(bundlePath, 'utf8');
const start = s.indexOf('var ie=[');
if (start === -1) {
  console.error('Demo restaurants array not found in the bundle.');
  process.exit(1);
}
const helpersStart = s.lastIndexOf('function ne', start);
if (helpersStart === -1) {
  console.error('Helper functions not found before the array.');
  process.exit(1);
}

// Bracket-match the array literal.
let depth = 0;
let i = s.indexOf('[', start);
const arrStart = i;
for (; i < s.length; i++) {
  const c = s[i];
  if (c === '[') depth += 1;
  else if (c === ']') {
    depth -= 1;
    if (depth === 0) break;
  }
}

const segment = s.slice(helpersStart, i + 1).replace('var ie=', 'const _fixture =');

const header = `// @ts-nocheck
// Reference copy of the pre-migration demo restaurant dataset (Kolkata).
// Recovered from the last pre-migration production build
// (${path.basename(bundlePath)}) after src/data/restaurants.ts was replaced by
// the real Dhaka dataset. This module is NOT part of the active catalogue — it
// exists only as a stable fixture for behaviour tests. Do not edit by hand;
// regenerate with scripts/extract-demo-reference.mjs.
import type { Restaurant } from '../../types';
`;

// The compiled fixture is untyped; consumers (tests) need the Restaurant type,
// so re-export it under an explicit annotation. This file is @ts-nocheck, so
// the assignment is never validated — only the declared type is used.
const footer = `
export const restaurants: Restaurant[] = _fixture;
`;

const out = path.join(ROOT, 'src', 'data', 'demo', 'demo-restaurants.ts');
fs.writeFileSync(out, header + segment + footer);
console.log(`Wrote ${out} (${segment.length} bytes of fixture data)`);
