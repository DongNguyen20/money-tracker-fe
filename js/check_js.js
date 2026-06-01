const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
  
  // click a nav item
  await page.click('button[data-view="transactions"]');
  await new Promise(r => setTimeout(r, 1000));
  
  await browser.close();
})();
