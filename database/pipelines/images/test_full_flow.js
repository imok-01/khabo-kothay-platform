#!/usr/bin/env node
/**
 * Full flow test: Search Google Maps for restaurant, find photos.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const RESTAURANTS = [
  { id: 'daf5744e-c698-513d-a840-a79dcd317f8a', name: 'Alfresco Banani', search: 'Alfresco Banani Dhaka' },
  { id: '52ddccee-63db-57bb-8171-194f082d52f6', name: 'Al-Amar Lebanese Cuisine Gulshan', search: 'Al-Amar Lebanese Cuisine Gulshan Dhaka' },
  { id: 'ea76ed39-eefc-5eb8-b296-4d36d93982aa', name: 'Aaheli Kabab and Chinese Restaurant', search: 'Aaheli Kabab Dhaka' },
  { id: 'd9c46286-b961-57c1-bc1a-3db72f08b8e0', name: 'Bahar', search: 'Bahar restaurant Gulshan Dhaka' },
  { id: '4a6c85a5-8cf0-582a-883d-e670ac85be33', name: 'Bamboo shoot Gulshan', search: 'Bamboo Shoot Gulshan Dhaka' },
];

const RESULTS = [];

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
  
  // Open Google Maps
  console.log('\n=== Opening Google Maps ===');
  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(4000);
  console.log('Maps loaded:', page.url().includes('google.com/maps'));
  
  for (const rest of RESTAURANTS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${rest.name}`);
    console.log(`${'='.repeat(60)}`);
    
    const result = {
      restaurant_id: rest.id,
      restaurant_name: rest.name,
      google_place_id: '',
      identity_verified: false,
      images: [],
      coverage_status: 'NO_IMAGES',
      notes: '',
    };
    
    try {
      // Find search input
      const searchInput = await page.$('input[name="q"]');
      if (!searchInput) {
        result.notes = 'Search input not found';
        console.log('❌ Search input not found');
        RESULTS.push(result);
        continue;
      }
      
      // Clear and search
      await searchInput.click();
      await page.waitForTimeout(300);
      await searchInput.fill('');
      await searchInput.fill(rest.search);
      await searchInput.press('Enter');
      
      // Wait for results
      await page.waitForTimeout(8000);
      
      console.log('Search URL:', page.url().substring(0, 100));
      
      // Look for place results in the sidebar
      const resultLinks = await page.$$('a[href*="/maps/place/"]');
      console.log('Place links found:', resultLinks.length);
      
      if (resultLinks.length > 0) {
        // Get the first result's info
        const firstHref = await resultLinks[0].getAttribute('href');
        console.log('First result href:', firstHref?.substring(0, 100));
        
        // Extract place ID from URL
        const placeMatch = firstHref?.match(/0x[0-9a-f]+:0x[0-9a-f]+/);
        if (placeMatch) {
          result.google_place_id = placeMatch[0];
          console.log('Place ID:', placeMatch[0]);
        }
        
        // Click the first result
        await resultLinks[0].click();
        await page.waitForTimeout(6000);
        
        console.log('After click URL:', page.url().substring(0, 100));
        
        // Get place name from the page
        const placeName = await page.evaluate(() => {
          const h1 = document.querySelector('h1');
          return h1?.innerText || '';
        });
        console.log('Place name on page:', placeName);
        
        // Verify identity
        const nameWords = rest.name.toLowerCase().split(' ').filter(w => w.length > 2);
        const matches = nameWords.filter(w => placeName.toLowerCase().includes(w));
        result.identity_verified = matches.length >= 1;
        console.log('Identity verified:', result.identity_verified, `(${matches.length}/${nameWords.length} words)`);
        
        // Now look for Photos
        // Method 1: Find "Photos" button/tab
        const allButtons = await page.$$('button, [role="tab"]');
        let photosClicked = false;
        
        for (const btn of allButtons) {
          const label = await btn.getAttribute('aria-label') || await btn.evaluate(el => el.innerText);
          if (label && (label.toLowerCase().includes('photo') || label.toLowerCase().includes('see all photos'))) {
            console.log('Clicking:', label.substring(0, 50));
            await btn.click();
            await page.waitForTimeout(4000);
            photosClicked = true;
            break;
          }
        }
        
        // Method 2: Look for photos in the place panel
        if (!photosClicked) {
          // Try clicking on photo thumbnails if visible
          const photoThumbs = await page.$$('img[src*="googleusercontent"]');
          console.log('Photo thumbnails visible:', photoThumbs.length);
          
          if (photoThumbs.length > 0) {
            // Click first photo to open gallery
            await photoThumbs[0].click();
            await page.waitForTimeout(3000);
            photosClicked = true;
          }
        }
        
        // Collect all visible images
        const allImgs = await page.evaluate(() => {
          return [...document.querySelectorAll('img')].map(img => ({
            src: img.src,
            alt: img.alt || '',
            width: img.naturalWidth,
            height: img.naturalHeight,
          })).filter(img => 
            img.src.includes('googleusercontent') && 
            !img.src.includes('avatar') &&
            img.width > 50
          );
        });
        
        console.log('Google images found:', allImgs.length);
        
        // Deduplicate by src
        const seen = new Set();
        const unique = allImgs.filter(img => {
          if (seen.has(img.src)) return false;
          seen.add(img.src);
          return true;
        });
        
        console.log('Unique images:', unique.length);
        
        // Select up to 3 best images
        const selected = unique.slice(0, 3);
        selected.forEach((img, i) => {
          result.images.push({
            position: i + 1,
            source: 'Google Maps',
            reference: img.src,
            width: img.width,
            height: img.height,
            alt: img.alt,
            verification_status: result.identity_verified ? 'VERIFIED' : 'UNVERIFIED',
            notes: `Found on Google Maps for "${rest.name}". Alt: "${img.alt?.substring(0, 50)}"`,
          });
          console.log(`  Image ${i+1}: ${img.width}x${img.height} "${img.alt?.substring(0, 30)}"`);
        });
        
        result.coverage_status = `${selected.length}_IMAGES`;
        
        // Screenshot evidence
        await page.screenshot({ path: `database/pipelines/images/evidence_${rest.name.replace(/[^a-zA-Z]/g, '_').substring(0, 20)}.png` });
        
      } else {
        result.notes = 'No place results found for search';
        console.log('❌ No place results');
      }
      
    } catch (err) {
      result.notes = `Error: ${err.message}`;
      console.log('❌ Error:', err.message);
    }
    
    RESULTS.push(result);
    
    // Wait between restaurants
    console.log('\nWaiting 5s before next restaurant...');
    await page.waitForTimeout(5000);
  }
  
  // Save results
  const output = {
    pilot_date: new Date().toISOString(),
    browser: 'Playwright Chromium (visible)',
    restaurants_tested: RESULTS.length,
    restaurants_3_images: RESULTS.filter(r => r.images.length >= 3).length,
    restaurants_2_images: RESULTS.filter(r => r.images.length === 2).length,
    restaurants_1_image: RESULTS.filter(r => r.images.length === 1).length,
    restaurants_0_images: RESULTS.filter(r => r.images.length === 0).length,
    restaurants: RESULTS,
  };
  
  fs.writeFileSync('database/pipelines/images/google_maps_browser_photo_pilot.json', JSON.stringify(output, null, 2));
  console.log('\n✅ Results saved to google_maps_browser_photo_pilot.json');
  
  console.log('\n=== SUMMARY ===');
  console.log(`Tested: ${RESULTS.length}`);
  console.log(`3 images: ${output.restaurants_3_images}`);
  console.log(`2 images: ${output.restaurants_2_images}`);
  console.log(`1 image: ${output.restaurants_1_image}`);
  console.log(`0 images: ${output.restaurants_0_images}`);
  
  await browser.close();
})();
