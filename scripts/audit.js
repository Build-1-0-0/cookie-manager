// scripts/audit.js
const puppeteer = require("puppeteer");

async function auditCookies(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  const cookies = await page.cookies();
  const audit = cookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    expires: cookie.expires,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    // Flag deprecated settings (e.g., missing SameSite)
    deprecated: !cookie.sameSite || cookie.expires === -1 ? true : false
  }));

  await browser.close();
  return { url, cookies: audit };
}

(async () => {
  const result = await auditCookies("https://example.com");
  // Post to Cloudflare Worker
  await fetch("https://your-worker.workers.dev", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result)
  });
})();
