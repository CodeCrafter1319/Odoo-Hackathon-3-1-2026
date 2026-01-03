// testRemoteBrowser.js
const puppeteer = require('puppeteer-core');
require('dotenv').config();
(async () => {
  try {
    const ws = process.env.BROWSERLESS_WSEndpoint;
    console.log('Using endpoint:', ws);
    if (!ws) {
      console.error('BROWSERLESS_WSEndpoint not set');
      process.exit(2);
    }

    // Increase the timeout and add some diagnostics
    const browser = await puppeteer.connect({
      browserWSEndpoint: ws,
      defaultViewport: null,
      timeout: 20000, // 20s
    });

    console.log('Connected to remote browser!');
    const page = await browser.newPage();
    await page.goto('https://google.com', { waitUntil: 'networkidle0', timeout: 20000 });
    console.log('Loaded google.com successfully');
    await browser.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Remote browser connect failed:');
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
