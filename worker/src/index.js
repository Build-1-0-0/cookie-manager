// worker/src/index.js
export default {
  async fetch(request, env) {
    const { method } = request;
    const { pathname } = new URL(request.url);

    // POST: Store new audit
    if (method === "POST" && pathname === "/audit") {
      try {
        const { url, cookies } = await request.json();
        if (!url || !cookies) {
          return new Response(JSON.stringify({ error: "Invalid data" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Sanitize cookies (remove sensitive values)
        const sanitizedCookies = JSON.stringify(cookies.map(cookie => ({
          name: cookie.name,
          domain: cookie.domain,
          expires: cookie.expires,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          deprecated: !cookie.sameSite || cookie.expires === -1
        })));

        await env.DB.prepare(
          "INSERT INTO audits (url, cookies, created_at) VALUES (?, ?, ?)"
        )
          .bind(url, sanitizedCookies, new Date().toISOString())
          .run();

        return new Response(JSON.stringify({ message: "Audit saved" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // GET: Retrieve audits
    if (method === "GET" && pathname === "/audits") {
      try {
        const { results } = await env.DB.prepare(
          "SELECT * FROM audits ORDER BY created_at DESC LIMIT 10"
        ).all();
        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    return new Response(JSON.stringify({ error: "Method or path not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
};
