export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Kama request inatafuta faili la login au asset za kawaida za website
    if (url.pathname === "/" || url.pathname === "/index.html" || !url.pathname.startsWith("/api")) {
      // Hapa inatafuta lile faili lako la index.html lililopo kwenye GitHub/Cloudflare Pages
      return await env.ASSETS.fetch(request); 
    }

    // 2. Kama request ni ya API kwenda kwenye VPS yako ya 3X-UI
    const base = env.PANEL_URL || "http://rayoo.uk:88/kabuti";

    // Kushughulikia CORS za browser
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

    const targetUrl = new URL(base + url.pathname + url.search);
    const modifiedRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
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
