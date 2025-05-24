// worker/src/index.js
export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      const { url, cookies } = await request.json();
      // Sanitize inputs
      if (!url || !cookies) return new Response("Invalid data", { status: 400 });

      // Store in D1
      await env.DB.prepare("INSERT INTO audits (url, cookies, created_at) VALUES (?, ?, ?)")
        .bind(url, JSON.stringify(cookies), new Date().toISOString())
        .run();

      return new Response("Audit saved", { status: 200 });
    }
    return new Response("Method not allowed", { status: 405 });
  }
};
