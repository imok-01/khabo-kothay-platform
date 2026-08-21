#!/usr/bin/env node
/**
 * Test v3: Use domcontentloaded instead of networkidle (Google Maps keeps loading).
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
  
  // Test: Go to Google Maps with shorter timeout
  console.log('\n=== Test: Google Maps ===');
  try {
    await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    console.log('URL:', page.url());
    console.log('Title:', await page.title());
    
    const content = await page.content();
    const hasCaptcha = content.includes('unusual traffic') || content.includes('verify you are human') || content.includes('accounts.google.com');
    const hasSignIn = content.includes('Sign in') && content.includes('Google Accounts');
    console.log('CAPTCHA/Block:', hasCaptcha || hasSignIn);
    
    if (hasCaptcha || hasSignIn) {
      console.log('⚠️  Google is blocking automated access');
      console.log('Redirected to:', page.url().substring(0, 100));
      
      // Check if it's a sign-in page
      if (page.url().includes('accounts.google.com')) {
        console.log('Google redirected to sign-in — bot detection triggered');
      }
    } else {
      console.log('✅ Maps loaded successfully!');
      
      // Try search
      const searchBox = await page.$('#searchboxinput');
      if (searchBox) {
        console.log('Search box found, searching...');
        await searchBox.fill('Alfresco Banani Dhaka');
        await searchBox.press('Enter');
        await page.waitForTimeout(5000);
        
        console.log('Search URL:', page.url());
        
        // Check for results
        const imgs = await page.$$('img[src*="googleusercontent"]');
        console.log('Images found:', imgs.length);
        
        for (let i = 0; i < Math.min(3, imgs.length); i++) {
          const src = await imgs[i].getAttribute('src');
          console.log(`  Img ${i+1}: ${src?.substring(0, 120)}`);
        }
      }
    }
  } catch (err) {
    console.log('Error:', err.message);
  }
  
  await page.screenshot({ path: 'database/pipelines/images/browser_test_v3.png' }).catch(() => {});
  await browser.close();
  console.log('\nDone.');
})();
