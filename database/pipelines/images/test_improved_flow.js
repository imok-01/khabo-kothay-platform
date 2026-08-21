#!/usr/bin/env node
/**
 * Improved test: Try to get 3+ photos per restaurant.
 * Click "See all photos" or scroll to find more.
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
  console.log(`\n[${index+1}/5] ${rest.name}`);
  
  const result = {
    restaurant_id: rest.id,
    restaurant_name: rest.name,
    google_place_id: '',
    identity_verified: false,
    images: [],
    coverage_status: 'NO_IMAGES',
    notes: '',
  };
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to search
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(rest.search)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(6000);
    
    // Get place name
    const placeName = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
    console.log('  Place:', placeName);
    
    // Verify identity
    const nameWords = rest.name.toLowerCase().split(' ').filter(w => w.length > 2);
    const matches = nameWords.filter(w => placeName.toLowerCase().includes(w));
    result.identity_verified = matches.length >= Math.min(2, nameWords.length);
    console.log('  Identity:', result.identity_verified ? '✅' : '❌');
    
    // Extract place ID
    const dataMatch = page.url().match(/data=!.*?1s(0x[0-9a-f]+:0x[0-9a-f]+)/);
    if (dataMatch) result.google_place_id = dataMatch[1];
    
    // Step 1: Click "Photos" or "See all photos"
    const allElements = await page.$$('[role="tab"], button, a');
    for (const el of allElements) {
      try {
        const text = await el.evaluate(e => e.innerText?.trim().toLowerCase() || '');
        const label = await el.getAttribute('aria-label')?.toLowerCase() || '';
        if (text.includes('photo') || text.includes('see all') || label.includes('photo')) {
          console.log('  Clicking:', text || label);
          await el.click({ timeout: 5000 });
          await page.waitForTimeout(4000);
          break;
        }
      } catch {}
    }
    
    // Step 2: Collect ALL Google images
    let allImgs = await page.evaluate(() => {
      return [...document.querySelectorAll('img')].map(img => ({
        src: img.src,
        alt: img.alt || '',
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      })).filter(img => 
        img.src.includes('googleusercontent') && 
        img.naturalWidth > 30
      );
    });
    
    // Deduplicate
    const seen = new Set();
    const unique = allImgs.filter(img => {
      const key = img.src.split('=')[0]; // Normalize URL
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log('  Images found:', unique.length);
    
    // Step 3: Try scrolling the photos panel to load more
    const scrollablePanel = await page.$('[role="main"], .m6QErb, [class*="scroll"]');
    if (scrollablePanel) {
      for (let scroll = 0; scroll < 3; scroll++) {
        await scrollablePanel.evaluate(el => el.scrollTop += 300);
        await page.waitForTimeout(1500);
      }
      
      // Re-collect after scroll
      allImgs = await page.evaluate(() => {
        return [...document.querySelectorAll('img')].map(img => ({
          src: img.src,
          alt: img.alt || '',
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        })).filter(img => 
          img.src.includes('googleusercontent') && 
          img.naturalWidth > 30
        );
      });
      
      const seen2 = new Set();
      const afterScroll = allImgs.filter(img => {
        const key = img.src.split('=')[0];
        if (seen2.has(key)) return false;
        seen2.add(key);
        return true;
      });
      
      console.log('  After scroll:', afterScroll.length, 'images');
      
      // Merge
      for (const img of afterScroll) {
        const key = img.src.split('=')[0];
        if (!seen.has(key)) {
          unique.push(img);
          seen.add(key);
        }
      }
    }
    
    // Step 4: Sort by size and select top 3
    unique.sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight));
    
    // Try clicking on photos to get full-size versions
    const selectedRefs = [];
    const photoElements = await page.$$('img[src*="googleusercontent"]');
    
    for (let i = 0; i < Math.min(6, photoElements.length); i++) {
      if (selectedRefs.length >= 3) break;
      
      try {
        const naturalW = await photoElements[i].evaluate(el => el.naturalWidth);
        if (naturalW < 50) continue;
        
        await photoElements[i].click({ timeout: 3000 });
        await page.waitForTimeout(2000);
        
        // Look for full-size image
        const fullImgs = await page.evaluate(() => {
          return [...document.querySelectorAll('img')].map(img => ({
            src: img.src,
            w: img.naturalWidth,
            h: img.naturalHeight,
          })).filter(img => 
            img.src.includes('googleusercontent') && img.w > 200
          ).sort((a, b) => b.w - a.w);
        });
        
        if (fullImgs.length > 0 && !selectedRefs.some(r => r.split('=')[0] === fullImgs[0].src.split('=')[0])) {
          selectedRefs.push(fullImgs[0].src);
          console.log(`  Photo ${selectedRefs.length}: ${fullImgs[0].w}x${fullImgs[0].h}`);
        }
        
        await page.keyboard.press('Escape');
        await page.waitForTimeout(800);
      } catch {}
    }
    
    // Fill remaining from largest thumbnails
    for (const img of unique) {
      if (selectedRefs.length >= 3) break;
      const key = img.src.split('=')[0];
      if (!selectedRefs.some(r => r.split('=')[0] === key)) {
        selectedRefs.push(img.src);
      }
    }
    
    // Build result
    for (let i = 0; i < Math.min(3, selectedRefs.length); i++) {
      result.images.push({
        position: i + 1,
        source: 'Google Maps',
        reference: selectedRefs[i],
        verification_status: result.identity_verified ? 'VERIFIED' : 'UNVERIFIED',
        notes: `Found on Google Maps for "${rest.name}"`,
      });
    }
    
    result.coverage_status = `${result.images.length}_IMAGES`;
    console.log(`  → ${result.coverage_status}`);
    
  } catch (err) {
    result.notes = `Error: ${err.message.substring(0, 200)}`;
    console.log('  ❌ Error:', err.message.substring(0, 80));
  }
  
  await context.close();
  return result;
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
  }
  
  // Save
  const output = {
    pilot_date: new Date().toISOString(),
    browser: 'Playwright Chromium (visible, fresh context per restaurant)',
    method: 'Direct search URL → place page → photos → scroll → click for full size',
    restaurants_tested: RESULTS.length,
    restaurants_3_images: RESULTS.filter(r => r.images.length >= 3).length,
    restaurants_2_images: RESULTS.filter(r => r.images.length === 2).length,
    restaurants_1_image: RESULTS.filter(r => r.images.length === 1).length,
    restaurants_0_images: RESULTS.filter(r => r.images.length === 0).length,
    restaurants: RESULTS,
  };
  
  fs.writeFileSync('database/pipelines/images/google_maps_browser_photo_pilot.json', JSON.stringify(output, null, 2));
  
  console.log('\n=== SUMMARY ===');
  console.log(`Tested: ${RESULTS.length}`);
  console.log(`3 images: ${output.restaurants_3_images}`);
  console.log(`2 images: ${output.restaurants_2_images}`);
  console.log(`1 image: ${output.restaurants_1_image}`);
  console.log(`0 images: ${output.restaurants_0_images}`);
  
  await browser.close();
})();
