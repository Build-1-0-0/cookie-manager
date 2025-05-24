export default {
  async fetch(request, env) {
    const { method } = request;
    const { pathname } = new URL(request.url);

    // Handle preflight OPTIONS requests for CORS
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "https://cookie-manager.pages.dev",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    // Handle POST /audit
    if (method === "POST" && pathname === "/audit") {
      try {
        const { url, cookies } = await request.json();
        if (!url || !cookies) {
          return new Response(JSON.stringify({ error: "Invalid data" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "https://cookie-manager.pages.dev"
            }
          });
        }

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
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://cookie-manager.pages.dev"
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://cookie-manager.pages.dev"
          }
        });
      }
    }

    // Handle GET /audits
    if (method === "GET" && pathname === "/audits") {
      try {
        const { results } = await env.DB.prepare(
          "SELECT * FROM audits ORDER BY created_at DESC LIMIT 10"
        ).all();
        return new Response(JSON.stringify(results), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://cookie-manager.pages.dev"
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://cookie-manager.pages.dev"
          }
        });
      }
    }

    // Default response for unsupported methods or paths
    return new Response(JSON.stringify({ error: "Method or path not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://cookie-manager.pages.dev"
      }
    });
  }
};
