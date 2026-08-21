#!/usr/bin/env node
/**
 * Test: Search for restaurant on Google Maps and find photos.
 */

const { chromium } = require('playwright');

const RESTAURANTS = [
  { name: 'Alfresco Banani', search: 'Alfresco Banani Dhaka' },
];

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  });
  
  const page = await context.newPage();
  
  // Go to Google Maps
  console.log('\n=== Opening Google Maps ===');
  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  
  console.log('Maps loaded:', page.url().includes('google.com/maps'));
  
  // Find search input — try multiple selectors
  const searchSelectors = [
    '#searchboxinput',
    'input[name="search"]',
    'input[aria-label="Search Google Maps"]',
    'input[type="text"]',
    '#searchbox input',
  ];
  
  let searchBox = null;
  for (const sel of searchSelectors) {
    searchBox = await page.$(sel);
    if (searchBox) {
      console.log('Found search box with selector:', sel);
      break;
    }
  }
  
  if (!searchBox) {
    // Try clicking on the search area first
    console.log('No search box found directly, trying to click search area...');
    const searchArea = await page.$('[aria-label="Search Google Maps"], .searchbox, #searchbox');
    if (searchArea) {
      await searchArea.click();
      await page.waitForTimeout(1000);
      searchBox = await page.$('#searchboxinput, input[name="search"]');
    }
  }
  
  if (searchBox) {
    for (const rest of RESTAURANTS) {
      console.log(`\n=== Searching: ${rest.search} ===`);
      
      await searchBox.click();
      await page.waitForTimeout(500);
      await searchBox.fill(rest.search);
      await searchBox.press('Enter');
      
      // Wait for results
      await page.waitForTimeout(8000);
      
      console.log('URL after search:', page.url());
      
      // Get page text
      const text = await page.evaluate(() => document.body?.innerText?.substring(0, 2000) || '');
      console.log('\n--- Page text ---');
      console.log(text.substring(0, 1000));
      
      // Look for the restaurant in results
      const resultLinks = await page.$$('a[href*="/maps/place/"]');
      console.log('\nPlace links found:', resultLinks.length);
      
      if (resultLinks.length > 0) {
        // Click first result
        console.log('Clicking first result...');
        await resultLinks[0].click();
        await page.waitForTimeout(5000);
        
        console.log('URL after click:', page.url());
        
        // Now look for Photos
        const allButtons = await page.$$('button');
        for (const btn of allButtons) {
          const label = await btn.getAttribute('aria-label');
          if (label && (label.includes('photo') || label.includes('Photo'))) {
            console.log('Found photo button:', label);
            await btn.click();
            await page.waitForTimeout(3000);
            break;
          }
        }
        
        // Count images
        const imgs = await page.$$('img[src*="googleusercontent"], img[src*="gstatic"]');
        console.log('Google images:', imgs.length);
        
        for (let i = 0; i < Math.min(10, imgs.length); i++) {
          const src = await imgs[i].getAttribute('src');
          const alt = await imgs[i].getAttribute('alt');
          if (src && (src.includes('googleusercontent') || src.includes('gstatic'))) {
            console.log(`  [${i}] "${alt?.substring(0, 30)}" → ${src.substring(0, 120)}`);
          }
        }
        
        // Take screenshot
        await page.screenshot({ path: 'database/pipelines/images/restaurant_photos_test.png' });
        console.log('\n📸 Screenshot saved');
      }
    }
  } else {
    console.log('❌ Could not find search box');
  }
  
  await browser.close();
  console.log('\nDone.');
})();
