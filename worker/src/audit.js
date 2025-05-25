export async function handleAudit(request, env) {
  try {
    const { url, cookies } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "Invalid data: URL is required" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://cookie-manager.pages.dev"
        }
      });
    }

    let cookiesToProcess = [];

    if (cookies && Array.isArray(cookies) && cookies.length > 0) {
      cookiesToProcess = cookies;
    } else {
      try {
        const targetResponse = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "Cookie-Audit-Worker/1.0"
          }
        });

        const setCookieHeaders = targetResponse.headers.getAll
          ? targetResponse.headers.getAll("Set-Cookie")
          : targetResponse.headers.get("Set-Cookie")?.split(',') || [];

        cookiesToProcess = setCookieHeaders.map(header => {
          const parts = header.split(";").map(p => p.trim());
          const [nameValue, ...attrs] = parts;
          const [name, ...valueParts] = nameValue.split("=");
          const value = valueParts.join("=");

          const cookie = {
            name: name.trim(),
            domain: '',
            path: '/',
            expires: null,
            secure: false,
            httpOnly: false,
            sameSite: ''
          };

          attrs.forEach(attr => {
            const [key, ...valParts] = attr.split("=");
            const val = valParts.join("=");

            switch (key.toLowerCase()) {
              case "domain": cookie.domain = val; break;
              case "path": cookie.path = val; break;
              case "expires":
                const exp = new Date(val);
                if (!isNaN(exp)) cookie.expires = exp.getTime();
                break;
              case "max-age":
                const maxAge = parseInt(val, 10);
                if (!isNaN(maxAge)) cookie.expires = Date.now() + maxAge * 1000;
                break;
              case "secure": cookie.secure = true; break;
              case "httponly": cookie.httpOnly = true; break;
              case "samesite": cookie.sameSite = val; break;
            }
          });

          return cookie;
        });
      } catch (fetchErr) {
        console.error(`Error fetching cookies from ${url}:`, fetchErr.message);
      }
    }

    const sanitizedCookies = JSON.stringify(cookiesToProcess.map(cookie => {
      const isDeprecated = typeof cookie.deprecated === "boolean"
        ? cookie.deprecated
        : (!cookie.sameSite || cookie.expires === -1);

      return {
        name: cookie.name,
        domain: cookie.domain,
        expires: cookie.expires,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        deprecated: isDeprecated
      };
    }));

    await env.DB.prepare(
      "INSERT INTO audits (url, cookies, created_at) VALUES (?, ?, ?)"
    )
      .bind(url, sanitizedCookies, new Date().toISOString())
      .run();

    return new Response(JSON.stringify({ message: "Audit saved", analyzedCookies: cookiesToProcess.length }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://cookie-manager.pages.dev"
      }
    });

  } catch (error) {
    console.error("Error in /audit handler:", error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://cookie-manager.pages.dev"
      }
    });
  }
}
