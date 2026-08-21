#!/usr/bin/env node
/**
 * Robust flow: Fresh page per restaurant, direct search URL, click photos for full size.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const RESTAURANTS = [
  { id: 'daf5744e-c698-513d-a840-a79dcd317f8a', name: 'Alfresco Banani', search: 'Alfresco Banani Dhaka' },
  { id: '52ddccee-63db-57bb-8171-194f082d52f6', name: 'Al-Amar Lebanese Cuisine Gulshan', search: 'Al-Amar Lebanese Cuisine Gulshan Dhaka' },
  { id: 'ea76ed39-eefc-5eb8-b296-4d36d93982aa', name: 'Aaheli Kabab and Chinese Restaurant', search: 'Aaheli Kabab Chinese Restaurant Dhaka' },
  { id: 'd9c46286-b961-57c1-bc1a-3db72f08b8e0', name: 'Bahar', search: 'Bahar restaurant Gulshan Dhaka' },
  { id: '4a6c85a5-8cf0-582a-883d-e670ac85be33', name: 'Bamboo Shoot Gulshan', search: 'Bamboo Shoot restaurant Gulshan Dhaka' },
];

const RESULTS = [];

async function processRestaurant(browser, rest, index) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index+1}/5] ${rest.name}`);
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
  
  // Fresh context per restaurant
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate directly to search URL
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(rest.search)}`;
    console.log('Navigating to:', searchUrl.substring(0, 80));
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(6000);
    
    console.log('URL:', page.url().substring(0, 100));
    
    // Check if we landed on a specific place or a search results page
    const urlHasPlace = page.url().includes('/maps/place/');
    
    if (urlHasPlace) {
      // Direct hit — we're on the place page
      console.log('Direct place match!');
      
      // Get place name
      const placeName = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
      console.log('Place name:', placeName);
      
      // Extract place ID from URL
      const dataMatch = page.url().match(/data=!.*?1s(0x[0-9a-f]+:0x[0-9a-f]+)/);
      if (dataMatch) {
        result.google_place_id = dataMatch[1];
        console.log('Place ID:', dataMatch[1]);
      }
      
      // Verify identity
      const nameWords = rest.name.toLowerCase().split(' ').filter(w => w.length > 2);
      const matches = nameWords.filter(w => placeName.toLowerCase().includes(w));
      result.identity_verified = matches.length >= Math.min(2, nameWords.length);
      console.log('Identity:', result.identity_verified ? '✅' : '❌', `(${matches.length}/${nameWords.length})`);
      
      // Find and click Photos
      await findAndClickPhotos(page, result, rest.name);
      
    } else {
      // Search results page — find the right place
      console.log('Search results page, looking for place...');
      
      const placeLinks = await page.$$('a[href*="/maps/place/"]');
      console.log('Place links:', placeLinks.length);
      
      if (placeLinks.length > 0) {
        // Click first result
        const href = await placeLinks[0].getAttribute('href');
        console.log('First result:', href?.substring(0, 80));
        
        await placeLinks[0].click();
        await page.waitForTimeout(6000);
        
        // Get place name
        const placeName = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
        console.log('Place name:', placeName);
        
        // Verify identity
        const nameWords = rest.name.toLowerCase().split(' ').filter(w => w.length > 2);
        const matches = nameWords.filter(w => placeName.toLowerCase().includes(w));
        result.identity_verified = matches.length >= Math.min(2, nameWords.length);
        console.log('Identity:', result.identity_verified ? '✅' : '❌', `(${matches.length}/${nameWords.length})`);
        
        // Find and click Photos
        await findAndClickPhotos(page, result, rest.name);
      } else {
        result.notes = 'No place results found';
        console.log('❌ No place links found');
      }
    }
    
    // Set final status
    result.coverage_status = `${result.images.length}_IMAGES`;
    
  } catch (err) {
    result.notes = `Error: ${err.message.substring(0, 200)}`;
    console.log('❌ Error:', err.message.substring(0, 100));
  }
  
  await context.close();
  return result;
}

async function findAndClickPhotos(page, result, restaurantName) {
  // Step 1: Find and click "Photos" button
  const buttons = await page.$$('button, [role="tab"], a');
  let photosClicked = false;
  
  for (const btn of buttons) {
    try {
      const label = await btn.getAttribute('aria-label') || await btn.evaluate(el => el.innerText?.trim());
      if (label && (label.toLowerCase().includes('photo') || label.toLowerCase().includes('see all photos'))) {
        console.log('Clicking photos:', label.substring(0, 50));
        await btn.click({ timeout: 5000 });
        await page.waitForTimeout(4000);
        photosClicked = true;
        break;
      }
    } catch {}
  }
  
  // Step 2: Collect all visible Google images
  const allImgs = await page.evaluate(() => {
    return [...document.querySelectorAll('img')].map(img => ({
      src: img.src,
      alt: img.alt || '',
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      displayWidth: img.clientWidth,
      displayHeight: img.clientHeight,
    })).filter(img => 
      img.src.includes('googleusercontent') && 
      img.naturalWidth > 30
    );
  });
  
  console.log('Google images visible:', allImgs.length);
  
  // Deduplicate
  const seen = new Set();
  const unique = allImgs.filter(img => {
    if (seen.has(img.src)) return false;
    seen.add(img.src);
    return true;
  });
  
  // Sort by size (largest first)
  unique.sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight));
  
  console.log('Unique images:', unique.length);
  
  // Step 3: Try to click on photos to get full-size versions
  const selectedUrls = [];
  
  // First, try clicking on photo thumbnails to open full view
  const photoElements = await page.$$('img[src*="googleusercontent"]');
  for (let i = 0; i < Math.min(5, photoElements.length); i++) {
    try {
      const src = await photoElements[i].getAttribute('src');
      const naturalWidth = await photoElements[i].evaluate(el => el.naturalWidth);
      
      // Only click on reasonably sized images (not tiny icons)
      if (naturalWidth > 50) {
        await photoElements[i].click({ timeout: 3000 });
        await page.waitForTimeout(2000);
        
        // After clicking, check for a larger image
        const largeImgs = await page.evaluate(() => {
          return [...document.querySelectorAll('img')].map(img => ({
            src: img.src,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
          })).filter(img => 
            img.src.includes('googleusercontent') && 
            img.naturalWidth > 200
          );
        });
        
        if (largeImgs.length > 0) {
          // Found a larger version
          const best = largeImgs.sort((a, b) => b.naturalWidth - a.naturalWidth)[0];
          if (!selectedUrls.includes(best.src)) {
            selectedUrls.push(best.src);
            console.log(`  Full-size ${selectedUrls.length}: ${best.naturalWidth}x${best.naturalHeight}`);
          }
        }
        
        // Press Escape to close any overlay
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    } catch {}
  }
  
  // If we didn't get enough full-size images, use the largest thumbnails
  for (const img of unique) {
    if (selectedUrls.length >= 3) break;
    if (!selectedUrls.includes(img.src)) {
      selectedUrls.push(img.src);
    }
  }
  
  // Build final image list
  for (let i = 0; i < Math.min(3, selectedUrls.length); i++) {
    result.images.push({
      position: i + 1,
      source: 'Google Maps',
      reference: selectedUrls[i],
      verification_status: result.identity_verified ? 'VERIFIED' : 'UNVERIFIED',
      notes: `Found on Google Maps for "${restaurantName}"`,
    });
  }
  
  console.log('Selected images:', result.images.length);
}

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  
  for (let i = 0; i < RESTAURANTS.length; i++) {
    const result = await processRestaurant(browser, RESTAURANTS[i], i);
    RESULTS.push(result);
    console.log(`\n→ ${result.coverage_status} (${result.images.length} images)`);
  }
  
  // Save results
  const output = {
    pilot_date: new Date().toISOString(),
    browser: 'Playwright Chromium (visible, fresh context per restaurant)',
    restaurants_tested: RESULTS.length,
    restaurants_3_images: RESULTS.filter(r => r.images.length >= 3).length,
    restaurants_2_images: RESULTS.filter(r => r.images.length === 2).length,
    restaurants_1_image: RESULTS.filter(r => r.images.length === 1).length,
    restaurants_0_images: RESULTS.filter(r => r.images.length === 0).length,
    restaurants: RESULTS,
  };
  
  fs.writeFileSync('database/pipelines/images/google_maps_browser_photo_pilot.json', JSON.stringify(output, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`Tested: ${RESULTS.length}`);
  console.log(`3 images: ${output.restaurants_3_images}`);
  console.log(`2 images: ${output.restaurants_2_images}`);
  console.log(`1 image: ${output.restaurants_1_image}`);
  console.log(`0 images: ${output.restaurants_0_images}`);
  console.log(`3-image coverage: ${(output.restaurants_3_images / RESULTS.length * 100).toFixed(0)}%`);
  console.log(`2+ coverage: ${((output.restaurants_3_images + output.restaurants_2_images) / RESULTS.length * 100).toFixed(0)}%`);
  
  await browser.close();
})();
