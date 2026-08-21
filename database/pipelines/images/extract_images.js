#!/usr/bin/env node
/**
 * Khabo Kothay — Restaurant Image Extraction Pipeline v2
 * 
 * Strategy: Process in small batches of 5 restaurants,
 * with 10s delay between requests and 120s cooldown between batches.
 * Restaurant Guru allows ~5-6 requests before rate limiting.
 * 
 * Usage:
 *   node extract_images.js [--start N] [--batch N] [--dry-run]
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ─── Configuration ───────────────────────────────────────────────────────────
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const IMAGES_DIR = path.join(__dirname);
const CHECKPOINT_FILE = path.join(IMAGES_DIR, 'checkpoint.json');
const OUTPUT_FILE = path.join(IMAGES_DIR, 'restaurant_images.json');
const PROGRESS_LOG = path.join(IMAGES_DIR, 'progress.log');

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : def;
};

const START_INDEX = parseInt(getArg('--start', '0'), 10);
const BATCH_SIZE = parseInt(getArg('--batch', '206'), 10);
const DRY_RUN = args.includes('--dry-run');

// Timing: 5 restaurants per mini-batch, 10s between requests, 120s cooldown
const REQUEST_DELAY = 10000;     // 10s between each request
const BATCH_SIZE_INNER = 5;      // 5 restaurants per mini-batch
const BATCH_COOLDOWN = 120000;   // 2 minutes between mini-batches
const RATE_LIMIT_BACKOFF = 180000; // 3 minutes if rate limited

// ─── Supabase Client ─────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Utility Functions ───────────────────────────────────────────────────────

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function log(msg) {
  const ts = new Date().toISOString().substring(11, 19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync(PROGRESS_LOG, line + '\n');
}

function normalizeForUrl(name) {
  return name
    .replace(/[()'']/g, '')
    .replace(/&/g, 'and')
    .replace(/[,]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/[^a-zA-Z0-9-]/g, '');
}

function normalizeForMatch(name) {
  return name.toLowerCase().replace(/['']/g, '').replace(/[,]/g, '').replace(/\s+/g, ' ').trim();
}

// ─── HTTP Functions ──────────────────────────────────────────────────────────

function httpGet(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        httpGet(redirectUrl, timeout).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function httpHead(url, timeout = 10000) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' }, timeout }, (res) => {
      resolve({ url, status: res.statusCode, contentType: res.headers['content-type'] || '', size: parseInt(res.headers['content-length'] || '0') });
    });
    req.on('error', () => resolve({ url, status: 'ERROR', contentType: '', size: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ url, status: 'TIMEOUT', contentType: '', size: 0 }); });
    req.end();
  });
}

// ─── Image Extraction ────────────────────────────────────────────────────────

function extractImageUrls(html) {
  const images = new Set();
  // img02.restaurantguru.com editorial photos
  for (const m of html.matchAll(/https?:\/\/img0[12]\.restaurantguru\.com\/[^\s"'<>]+\.jpg/g)) images.add(m[0]);
  // img.restaurantguru.ru review photos
  for (const m of html.matchAll(/https?:\/\/img\.restaurantguru\.ru\/reviews\/original\/[^\s"'<>]+\.jpg/g)) images.add(m[0]);
  // data-src
  for (const m of html.matchAll(/data-src=["']([^"']+restaurantguru[^"']+\.jpg)/g)) images.add(m[1]);
  return [...images];
}

function categorizeImage(url) {
  const u = url.toLowerCase();
  if (u.includes('/small/') || u.includes('/maps/') || u.includes('/meals/small/') || u.includes('w26') || u.includes('w166')) return 'SKIP';
  if (u.includes('interior')) return 'INTERIOR';
  if (u.includes('exterior') || u.includes('facade') || u.includes('storefront')) return 'EXTERIOR';
  if (u.includes('food') || u.includes('dish') || u.includes('meal') || u.includes('dinner') || u.includes('burger') || u.includes('pizza') || u.includes('sushi') || u.includes('meat') || u.includes('grill') || u.includes('bbq') || u.includes('buffet')) return 'FOOD';
  if (u.includes('dessert') || u.includes('cake')) return 'DESSERT';
  if (u.includes('design') || u.includes('decor') || u.includes('ambiance') || u.includes('ambience')) return 'AMBIANCE';
  if (u.includes('drink') || u.includes('beverage') || u.includes('coffee')) return 'DRINK';
  if (u.includes('review') || u.includes('original/')) return 'USER_REVIEW';
  return 'GENERAL';
}

function verifyBranchMatch(restaurantName, html) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].toLowerCase() : '';
  const normalizedName = normalizeForMatch(restaurantName);
  const nameWords = normalizedName.split(' ').filter((w, i) => w.length > 2 || i === 0);

  let matchCount = 0;
  for (const word of nameWords) { if (title.includes(word)) matchCount++; }

  const branchWords = ['gulshan', 'banani', 'dhanmondi', 'uttara', 'mirpur', 'motijheel', 'bashundhara', 'lalmatia'];
  const nameBranch = branchWords.find(b => normalizedName.includes(b));
  const titleBranch = branchWords.find(b => title.includes(b));
  if (nameBranch && titleBranch && nameBranch !== titleBranch) return { match: false, reason: `Branch mismatch: ${nameBranch} vs ${titleBranch}` };

  const hasFoodContent = title.includes('restaurant') || title.includes('menu') || title.includes('food');
  if (matchCount >= 2) return { match: true, reason: `${matchCount}/${nameWords.length} words matched` };
  if (nameWords.length <= 2 && matchCount >= 1 && hasFoodContent) return { match: true, reason: `Short name + food content` };
  if (nameWords.length === 1 && matchCount >= 1) return { match: true, reason: `Single word match` };

  return { match: false, reason: `${matchCount}/${nameWords.length} words in title: "${title}"` };
}

function selectBestImages(imageUrls, existingCount) {
  const categorized = imageUrls.map(url => ({ url, cat: categorizeImage(url) })).filter(i => i.cat !== 'SKIP');

  const selected = [];
  // Priority: 1 exterior/interior, 1 food/ambiance
  const extInt = categorized.filter(i => ['EXTERIOR', 'INTERIOR'].includes(i.cat));
  if (extInt.length > 0) selected.push(extInt[0]);

  const foodAmb = categorized.filter(i => ['FOOD', 'AMBIANCE', 'DESSERT'].includes(i.cat) && !selected.find(s => s.url === i.url));
  if (foodAmb.length > 0 && selected.length < 2) selected.push(foodAmb[0]);

  // Fill remaining
  if (selected.length < 2) {
    for (const item of categorized) {
      if (selected.length >= 2) break;
      if (!selected.find(s => s.url === item.url)) selected.push(item);
    }
  }

  return selected.slice(0, 2);
}

// ─── Core Processing ─────────────────────────────────────────────────────────

async function processOneRestaurant(restaurant, existingImages) {
  const result = {
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name,
    branch_location: restaurant.area || 'Dhaka',
    images: [],
    sources_tried: [],
    errors: [],
  };

  // Image 1: existing Google image
  if (existingImages.length > 0) {
    result.images.push({
      image_number: 1, image_url: existingImages[0].image_url,
      source_name: 'Google', source_page_url: restaurant.source_url || '',
      attribution_note: 'Google Maps photo', verification_status: 'VERIFIED', category: 'EXISTING',
    });
  }

  // Try Restaurant Guru
  const slug = normalizeForUrl(restaurant.name);
  const rgUrl = `https://restaurantguru.com/${slug}-Dhaka`;

  result.sources_tried.push({ source: 'Restaurant Guru', url: rgUrl });

  try {
    const resp = await httpGet(rgUrl);

    if (resp.status === 503) {
      result.sources_tried[0].status = 'rate_limited';
      return { result, rateLimited: true };
    }

    if (resp.status !== 200) {
      result.sources_tried[0].status = resp.status;
      return { result, rateLimited: false };
    }

    result.sources_tried[0].status = 200;

    const branchCheck = verifyBranchMatch(restaurant.name, resp.data);
    result.sources_tried[0].branch_check = branchCheck;

    if (!branchCheck.match) {
      return { result, rateLimited: false };
    }

    const imageUrls = extractImageUrls(resp.data);
    if (imageUrls.length === 0) return { result, rateLimited: false };

    const selected = selectBestImages(imageUrls, existingImages.length);

    for (const sel of selected) {
      if (result.images.length >= 3) break;
      const v = await httpHead(sel.url);
      if (v.status === 200 && v.contentType.includes('image')) {
        result.images.push({
          image_number: result.images.length + 1, image_url: sel.url,
          source_name: 'Restaurant Guru', source_page_url: rgUrl,
          attribution_note: 'Restaurant Guru image', verification_status: 'VERIFIED',
          url_valid: true, identity_verified: branchCheck.match, category: sel.cat, size_bytes: v.size,
        });
      }
      await sleep(1000);
    }
  } catch (err) {
    result.errors.push(err.message);
  }

  return { result, rateLimited: false };
}

// ─── Checkpoint / Persistence ────────────────────────────────────────────────

function loadCheckpoint() {
  try { if (fs.existsSync(CHECKPOINT_FILE)) return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8')); } catch {}
  return { processed: [] };
}

function saveCheckpoint(processedIds) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ processed: [...processedIds] }, null, 2));
}

function loadResults() {
  try { if (fs.existsSync(OUTPUT_FILE)) return JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')); } catch {}
  return { restaurants: [], metadata: { started_at: new Date().toISOString() } };
}

function saveResults(results) {
  results.metadata.updated_at = new Date().toISOString();
  results.metadata.total_restaurants = results.restaurants.length;
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log('═══════════════════════════════════════════════════════');
  log('KK Image Extraction Pipeline v2 — Rate-Limit-Aware');
  log('═══════════════════════════════════════════════════════');
  log(`Config: start=${START_INDEX} batch=${BATCH_SIZE} request_delay=${REQUEST_DELAY}ms batch_cooldown=${BATCH_COOLDOWN}ms`);

  const checkpoint = loadCheckpoint();
  const processedIds = new Set(checkpoint.processed || []);
  log(`Resuming: ${processedIds.size} already processed`);

  const results = loadResults();

  // Fetch restaurants
  const { data: restaurants } = await supabase.from('restaurants').select('id, name').order('name');
  if (!restaurants?.length) { log('ERROR: No restaurants'); return; }

  // Fetch existing images
  const { data: allImages } = await supabase.from('image_references').select('restaurant_id, image_url');
  const imgMap = {};
  allImages?.forEach(img => { (imgMap[img.restaurant_id] = imgMap[img.restaurant_id] || []).push(img); });

  // Fetch source URLs
  const { data: sources } = await supabase.from('restaurant_sources').select('restaurant_id, source_url');
  const srcMap = {};
  sources?.forEach(s => { srcMap[s.restaurant_id] = s; });

  const batch = restaurants.slice(START_INDEX, START_INDEX + BATCH_SIZE);
  log(`Processing ${batch.length} restaurants`);

  let processed = 0, with3 = 0, with2 = 0, with1 = 0, with0 = 0;
  let totalRateLimits = 0, consecutiveRateLimits = 0;

  for (let i = 0; i < batch.length; i++) {
    const restaurant = batch[i];
    if (processedIds.has(restaurant.id)) continue;

    log(`\n[${i + 1}/${batch.length}] ${restaurant.name}`);

    if (DRY_RUN) { log('  DRY RUN — skip'); continue; }

    const existingImages = imgMap[restaurant.id] || [];
    const sourceUrl = srcMap[restaurant.id]?.source_url || '';

    const { result, rateLimited } = await processOneRestaurant(
      { ...restaurant, source_url: sourceUrl }, existingImages
    );

    if (rateLimited) {
      consecutiveRateLimits++;
      totalRateLimits++;
      log(`  ⚠️  Rate limited (${consecutiveRateLimits} consecutive)`);

      if (consecutiveRateLimits >= 2) {
        const backoff = RATE_LIMIT_BACKOFF;
        log(`  ⏳ Backoff ${backoff / 1000}s after ${consecutiveRateLimits} consecutive limits`);
        await sleep(backoff);
        consecutiveRateLimits = 0;
      } else {
        await sleep(BATCH_COOLDOWN);
      }
      // Don't count this as processed — retry later
      continue;
    }

    consecutiveRateLimits = 0;
    results.restaurants.push(result);
    processedIds.add(restaurant.id);
    processed++;

    const verified = result.images.filter(i => i.verification_status === 'VERIFIED').length;
    if (verified >= 3) with3++;
    else if (verified === 2) with2++;
    else if (verified === 1) with1++;
    else with0++;

    const imgSummary = result.images.filter(i => i.image_url).map(i => i.category).join('+');
    log(`  ✅ ${verified} verified: ${imgSummary}`);

    // Checkpoint every 5
    if (processed % 5 === 0) {
      saveCheckpoint(processedIds);
      saveResults(results);
      log(`  💾 Saved (${processedIds.size} total)`);
      // Batch cooldown every 5
      log(`  ⏳ Batch cooldown ${BATCH_COOLDOWN / 1000}s...`);
      await sleep(BATCH_COOLDOWN);
    } else {
      await sleep(REQUEST_DELAY);
    }

    // Progress report every 20
    if (processed % 20 === 0) {
      log(`\n  📊 ${processed}/${batch.length} | 3:${with3} 2:${with2} 1:${with1} 0:${with0} | Rate limits:${totalRateLimits}`);
    }
  }

  // Final save
  saveCheckpoint(processedIds);
  saveResults(results);

  log('\n═══════════════════════════════════════════════════════');
  log('BATCH COMPLETE');
  log('═══════════════════════════════════════════════════════');
  log(`Processed: ${processed}`);
  log(`3 verified: ${with3}`);
  log(`2 verified: ${with2}`);
  log(`1 verified: ${with1}`);
  log(`0 additional: ${with0}`);
  log(`Rate limit incidents: ${totalRateLimits}`);
  log(`Output: ${OUTPUT_FILE}`);
}

main().catch(err => { log(`FATAL: ${err.message}`); console.error(err); process.exit(1); });
