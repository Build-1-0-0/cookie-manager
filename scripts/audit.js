import fetch from 'node-fetch';
const puppeteer = require('puppeteer');

async function auditCookies(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });
    await page.setBypassCSP(true);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);
    const cookies = await page.cookies();
    const audit = cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      expires: cookie.expires,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      deprecated: !cookie.sameSite || cookie.expires === -1,
    }));
    console.log(`Cookies for ${url}:`, audit);
    return { url, cookies: audit };
  } catch (error) {
    console.error(`Error auditing ${url}:`, error);
    return { url, cookies: [] };
  } finally {
    await browser.close();
  }
}

(async () => {
  const urls = ['https://github.com', 'https://example.com'];
  const workerUrl = 'https://cookie-manager.africancontent807.workers.dev/audit';
  for (const url of urls) {
    try {
      const result = await auditCookies(url);
      if (result.cookies.length === 0) {
        console.warn(`No cookies captured for ${url}`);
      }
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
      }
      const responseData = await response.json();
      console.log(`Audit response for ${url}:`, responseData);
    } catch (error) {
      console.error(`Error posting audit for ${url}:`, error);
    }
  }
})();
