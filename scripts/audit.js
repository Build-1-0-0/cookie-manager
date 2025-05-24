// scripts/audit.js
const puppeteer = require('puppeteer');

async function auditCookies(url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  const cookies = await page.cookies();
  const audit = cookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    expires: cookie.expires,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    deprecated: !cookie.sameSite || cookie.expires === -1
  }));

  await browser.close();
  return { url, cookies: audit };
}

(async () => {
  try {
    const result = await auditCookies(process.env.URL || 'https://example.com');
    const response = await fetch('https://your-worker.workers.dev/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    });
    console.log(await response.json());
  } catch (error) {
    console.error('Error:', error);
  }
})();
