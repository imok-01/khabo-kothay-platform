#!/usr/bin/env node
/**
 * Test v2: Navigate to Google Maps homepage first, then search for restaurant.
 * Avoids direct place URLs that may trigger bot detection.
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
  
  // Test 1: Go to Google Maps homepage
  console.log('\n=== Test 1: Google Maps homepage ===');
  try {
    await page.goto('https://www.google.com/maps', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('URL:', page.url());
    console.log('Title:', await page.title());
    
    const hasCaptcha = (await page.content()).includes('unusual traffic') || (await page.content()).includes('verify you are human');
    console.log('CAPTCHA:', hasCaptcha);
    
    if (!hasCaptcha) {
      // Try searching for a restaurant
      console.log('\n=== Test 2: Search for restaurant ===');
      
      // Find search box
      const searchBox = await page.$('#searchboxinput, input[name="search"]');
      if (searchBox) {
        await searchBox.fill('Alfresco Banani Dhaka');
        await searchBox.press('Enter');
        await page.waitForTimeout(5000);
        
        console.log('After search URL:', page.url());
        
        // Check for results
        const resultText = await page.evaluate(() => document.body?.innerText?.substring(0, 800) || '');
        console.log('Result text:', resultText.substring(0, 500));
        
        // Look for photos
        const photoElements = await page.$$('img[src*="googleusercontent"]');
        console.log('Google images found:', photoElements.length);
        
        // Try to click on the first result
        const firstResult = await page.$('[role="feed"] a, .section-result a, a[href*="/maps/place/"]');
        if (firstResult) {
          console.log('\n=== Test 3: Click first result ===');
          await firstResult.click();
          await page.waitForTimeout(5000);
          
          console.log('After click URL:', page.url());
          
          // Look for Photos tab/button
          const photosTab = await page.$('button[data-tab-id="photos"], [aria-label*="photo"], [aria-label*="Photo"]');
          if (photosTab) {
            console.log('Photos tab found! Clicking...');
            await photosTab.click();
            await page.waitForTimeout(3000);
            
            // Count photos
            const photos = await page.$$('img[src*="googleusercontent"]');
            console.log('Photos visible:', photos.length);
            
            // Get photo URLs
            for (let i = 0; i < Math.min(5, photos.length); i++) {
              const src = await photos[i].getAttribute('src');
              console.log(`  Photo ${i+1}: ${src?.substring(0, 100)}`);
            }
          } else {
            console.log('No photos tab found');
          }
        }
      } else {
        console.log('Search box not found');
      }
    }
  } catch (err) {
    console.log('Error:', err.message);
  }
  
  // Screenshot
  try {
    await page.screenshot({ path: 'database/pipelines/images/browser_test_v2.png' });
    console.log('\n📸 Screenshot saved');
  } catch (e) {}
  
  await browser.close();
  console.log('\nDone.');
})();
