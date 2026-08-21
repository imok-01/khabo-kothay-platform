#!/usr/bin/env node
/**
 * Test v4: More careful analysis of what Google Maps actually shows.
 */

const { chromium } = require('playwright');

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
  
  console.log('\n=== Navigating to Google Maps ===');
  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(5000);
  
  console.log('URL:', page.url());
  console.log('Title:', await page.title());
  
  // Get visible text
  const bodyText = await page.evaluate(() => document.body?.innerText || '');
  console.log('\n--- Visible text (first 1000 chars) ---');
  console.log(bodyText.substring(0, 1000));
  
  // Check for specific elements
  const searchBox = await page.$('#searchboxinput');
  console.log('\nSearch box found:', !!searchBox);
  
  const mapCanvas = await page.$('#map, canvas');
  console.log('Map canvas found:', !!mapCanvas);
  
  // Check for sign-in modal vs actual content
  const signInModal = await page.$('[data-signin="1"], [aria-label="Sign in"]');
  console.log('Sign-in modal:', !!signInModal);
  
  // Check if we can interact despite sign-in prompt
  if (searchBox) {
    console.log('\n=== Attempting search ===');
    try {
      await searchBox.click();
      await page.waitForTimeout(500);
      await searchBox.fill('Alfresco Banani Dhaka');
      await searchBox.press('Enter');
      await page.waitForTimeout(8000);
      
      console.log('After search URL:', page.url());
      
      // Check for place results
      const resultText = await page.evaluate(() => document.body?.innerText?.substring(0, 1500) || '');
      console.log('\n--- Search results text ---');
      console.log(resultText.substring(0, 800));
      
      // Look for images
      const imgs = await page.$$('img');
      console.log('\nTotal img elements:', imgs.length);
      
      const googleImgs = await page.$$('img[src*="googleusercontent"], img[src*="gstatic"]');
      console.log('Google-hosted images:', googleImgs.length);
      
      for (let i = 0; i < Math.min(10, googleImgs.length); i++) {
        const src = await googleImgs[i].getAttribute('src');
        const alt = await googleImgs[i].getAttribute('alt');
        console.log(`  [${i}] alt="${alt?.substring(0, 40)}" src="${src?.substring(0, 100)}"`);
      }
    } catch (err) {
      console.log('Search error:', err.message);
    }
  }
  
  await page.screenshot({ path: 'database/pipelines/images/browser_test_v4.png' }).catch(() => {});
  console.log('\n📸 Screenshot saved');
  
  await browser.close();
})();
