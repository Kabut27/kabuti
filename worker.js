export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Kama mtu anafungua tu page ya login kawaida
    if (url.pathname === "/" || url.pathname === "/index.html" || !url.pathname.startsWith("/api")) {
      return await env.ASSETS.fetch(request); 
    }

    // 2. Safisha URL na chukua ile PANEL_URL kutoka wrangler.toml
    let base = env.PANEL_URL || "https://rayoo.uk:88/kabuti";
    
    // Ondoa slash ya mwisho kama ipo ili isigongane
    base = base.replace(/\/$/, ""); 

    // Geuza ile pathname: toa neno "/api" ili kubaki na API halisi ya 3X-UI
    const cleanPath = url.pathname.replace(/^\/api/, "");

    // Tengeneza destination URL sahihi kabisa
    const targetUrl = new URL(base + cleanPath + url.search);

    // Kushughulikia CORS ya browser
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS, PUT, DELETE",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Kulazimisha headers sahihi ili Cloudflare isikatae (Inazuia HTTP 520)
    const modifiedHeaders = new Headers(request.headers);
    modifiedHeaders.set("Host", targetUrl.host);

    const modifiedRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: modifiedHeaders,
      body: request.body,
      redirect: "manual",
    });

    try {
      const response = await fetch(modifiedRequest);
      const newHeaders = new Headers(response.headers);

      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS, PUT, DELETE");
      newHeaders.set("Access-Control-Allow-Headers", "*");
      newHeaders.set("Access-Control-Allow-Credentials", "true");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      return new Response("Error connecting to panel VPS: " + err.message, { status: 502 });
    }
  },
};
