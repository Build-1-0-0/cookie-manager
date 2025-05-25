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
        const { url } = await request.json();
        if (!url) {
          return new Response(JSON.stringify({ error: "Invalid data: URL is required" }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "https://cookie-manager.pages.dev"
            }
          });
        }

        let fetchedCookies = [];
        try {
          const targetResponse = await fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent': 'Cookie-Audit-Worker/1.0'
            }
          });

          const setCookieHeaders = targetResponse.headers.getAll
            ? targetResponse.headers.getAll('Set-Cookie') // Deprecated in some environments
            : targetResponse.headers.get('Set-Cookie')?.split(',') || [];

          fetchedCookies = setCookieHeaders.map(cookieString => {
            const parts = cookieString.split(';').map(part => part.trim());
            const [nameValue, ...attributes] = parts;
            const [name, ...valueParts] = nameValue.split('=');
            const value = valueParts.join('=');

            const cookie = {
              name: name.trim(),
              domain: '',
              path: '/',
              expires: null,
              secure: false,
              httpOnly: false,
              sameSite: ''
            };

            attributes.forEach(attr => {
              const [attrName, ...attrValueParts] = attr.split('=');
              const attrValue = attrValueParts.join('=');

              switch (attrName.toLowerCase()) {
                case 'domain':
                  cookie.domain = attrValue;
                  break;
                case 'path':
                  cookie.path = attrValue;
                  break;
                case 'expires': {
                  const date = new Date(attrValue);
                  if (!isNaN(date)) {
                    cookie.expires = date.getTime();
                  }
                  break;
                }
                case 'max-age': {
                  const maxAgeSeconds = parseInt(attrValue, 10);
                  if (!isNaN(maxAgeSeconds)) {
                    cookie.expires = Date.now() + maxAgeSeconds * 1000;
                  }
                  break;
                }
                case 'secure':
                  cookie.secure = true;
                  break;
                case 'httponly':
                  cookie.httpOnly = true;
                  break;
                case 'samesite':
                  cookie.sameSite = attrValue;
                  break;
              }
            });

            return cookie;
          });
        } catch (fetchError) {
          console.error("Error fetching target URL:", fetchError.message);
        }

        const sanitizedCookies = JSON.stringify(fetchedCookies.map(cookie => ({
          name: cookie.name,
          domain: cookie.domain,
          expires: cookie.expires !== null ? cookie.expires : undefined,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          deprecated: !cookie.sameSite
        })));

        await env.DB.prepare(
          "INSERT INTO audits (url, cookies, created_at) VALUES (?, ?, ?)"
        )
          .bind(url, sanitizedCookies, new Date().toISOString())
          .run();

        return new Response(JSON.stringify({
          message: "Audit saved",
          analyzedCookies: fetchedCookies.length
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "https://cookie-manager.pages.dev"
          }
        });
      } catch (error) {
        console.error("Error in /audit endpoint:", error.stack);
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

    // Default fallback for unsupported method/path
    return new Response(JSON.stringify({ error: "Method or path not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://cookie-manager.pages.dev"
      }
    });
  }
};
