export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Kama mteja anafungua tu website ya kawaida ya index.html
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return await env.ASSETS.fetch(request);
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 2. ENDPOINT: /check-usage?id=MTEJA_ID
    if (url.pathname === "/check-usage") {
      const clientId = url.searchParams.get("id") ? url.searchParams.get("id").trim().toLowerCase() : "";
      if (!clientId) {
        return new Response(JSON.stringify({ error: "Tafadhali weka ID au Jina lako la VPN." }), { status: 400, headers: corsHeaders });
      }

      // Kujenga base URL vizuri kutoka wrangler.toml
      let base = (env.PANEL_URL || "https://rayoo.uk:8443/kabuti").replace(/\/$/, "");

      const token = env.API_TOKEN;

      // Tutajaribu njia kuu mbili za API za 3X-UI panel
      const pathsToTry = [
        `${base}/panel/api/inbounds`,
        `${base}/xui/API/inbounds`,
        `${base}/api/inbounds`
      ];

      let responseData = null;
      let fetchError = "";

      for (const targetUrl of pathsToTry) {
        try {
          const response = await fetch(targetUrl, {
            method: "GET",
            headers: {
              "Accept": "application/json",
              "X-Token": token
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.obj) {
              responseData = data.obj;
              break; // Tumepata data, acha kutafuta kwenye njia zingine
            }
          }
        } catch (err) {
          fetchError = err.message;
        }
      }

      if (!responseData) {
        return new Response(JSON.stringify({ 
          error: "Imeshindwa kuunganisha kwenye VPS au API Token sio sahihi. Hakikisha API_TOKEN imejazwa kwenye wrangler.toml." 
        }), { status: 502, headers: corsHeaders });
      }

      let clientInfo = null;

      // Kuanza upekuzi wa mteja ndani ya inbounds zote
      for (const inbound of responseData) {
        if (!inbound.settings) continue;
        
        let settings;
        try {
          settings = JSON.parse(inbound.settings);
        } catch(e) { continue; }

        if (settings.clients) {
          // Kutafuta kwa usahihi (kulinganisha ID, Email, au Remark ya mteja)
          const found = settings.clients.find(c => 
            (c.id && c.id.toLowerCase() === clientId) || 
            (c.email && c.email.toLowerCase() === clientId)
          );

          if (found) {
            // Kupata takwimu (stats) za huyu mteja
            const stats = responseData.flatMap(i => i.clientStats || []).find(s => s.email === found.email);
            
            clientInfo = {
              remark: found.email || inbound.remark || "Mteja",
              id: found.id,
              up: stats ? stats.up : 0,
              down: stats ? stats.down : 0,
              total: stats ? stats.total : 0,
              expiryTime: stats ? stats.expiryTime : 0
            };
            break;
          }
        }
      }

      if (!clientInfo) {
        return new Response(JSON.stringify({ error: "Mteja mwenye ID au Jina hili hajapatikana." }), { status: 444, headers: corsHeaders });
      }

      return new Response(JSON.stringify(clientInfo), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};
