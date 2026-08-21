#!/usr/bin/env node
/**
 * Test whether Playwright can open a visible browser and access Google Maps.
 * This is a DIAGNOSTIC test — not a production tool.
 */

const { chromium } = require('playwright');

const TEST_URL = 'https://www.google.com/maps/place/Alfresco+Banani+Dhaka/data=!4m7!3m6!1s0x3755c7b5c7fd929d:0x6ba7f3ac5654648e!8m2!3d23.7933656!4d90.4146485!16s%2Fg%2F11fkn0mzrx';

(async () => {
  console.log('Launching visible Chromium browser...');
  
  let browser;
  try {
    browser = await chromium.launch({
      headless: false,  // Visible browser
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
      ],
    });
    console.log('✅ Browser launched successfully');
  } catch (err) {
    console.log('❌ Browser launch failed:', err.message);
    console.log('\nTrying headless mode instead...');
    try {
      browser = await chromium.launch({ headless: true });
      console.log('✅ Headless browser launched');
    } catch (err2) {
      console.log('❌ Headless also failed:', err2.message);
      process.exit(1);
    }
  }
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  
  const page = await context.newPage();
  
  console.log('\nNavigating to Google Maps...');
  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded');
    console.log('URL:', page.url());
    console.log('Title:', await page.title());
    
    // Check for CAPTCHA
    const pageContent = await page.content();
    const hasCaptcha = pageContent.includes('captcha') || pageContent.includes('unusual traffic') || pageContent.includes('verify you are human');
    console.log('CAPTCHA detected:', hasCaptcha);
    
    if (hasCaptcha) {
      console.log('⚠️  Google is blocking automated access — CAPTCHA required');
      console.log('Page snippet:', pageContent.substring(0, 500));
    } else {
      // Try to find photos section
      console.log('\nLooking for Photos section...');
      
      // Wait for content to load
      await page.waitForTimeout(3000);
      
      // Check for photo-related elements
      const photoButtons = await page.$$('button[aria-label*="photo"], button[aria-label*="Photo"], [data-tab-id="photos"]');
      console.log('Photo buttons found:', photoButtons.length);
      
      // Check for image elements
      const images = await page.$$('img[src*="googleusercontent"], img[src*="gstatic"]');
      console.log('Google images found:', images.length);
      
      // Get page text to understand what loaded
      const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 1000) || '');
      console.log('\nPage text preview:', bodyText.substring(0, 500));
    }
    
  } catch (err) {
    console.log('❌ Navigation error:', err.message);
  }
  
  // Take a screenshot for evidence
  try {
    await page.screenshot({ path: 'database/pipelines/images/browser_test_screenshot.png' });
    console.log('\n📸 Screenshot saved');
  } catch (e) {
    console.log('Screenshot failed:', e.message);
  }
  
  await browser.close();
  console.log('\nBrowser closed.');
})();
