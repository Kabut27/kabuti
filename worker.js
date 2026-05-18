export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Fungua ukurasa wa index.html
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

    // 2. ENDPOINT: /check-usage
    if (url.pathname === "/check-usage") {
      const clientId = url.searchParams.get("id") ? url.searchParams.get("id").trim().toLowerCase() : "";
      if (!clientId) {
        return new Response(JSON.stringify({ error: "Tafadhali weka ID au Jina lako la VPN." }), { status: 400, headers: corsHeaders });
      }

      // Kupata na kusafisha base URL kutoka wrangler.toml
      let base = (env.PANEL_URL || "https://rayoo.uk:8443/kabuti").trim().replace(/\/$/, "");
      const token = env.API_TOKEN;

      // Njia zote zinazoweza kutumiwa na 3X-UI kutoa inbounds data
      const pathsToTry = [
        `${base}/panel/api/inbounds`,
        `${base}/xui/API/inbounds`,
        `${base}/api/inbounds`,
        `https://rayoo.uk:8443/panel/api/inbounds`,
        `https://rayoo.uk:8443/xui/API/inbounds`
      ];

      let responseData = null;
      let lastErrorMessage = "";

      for (const targetUrl of pathsToTry) {
        try {
          const response = await fetch(targetUrl, {
            method: "GET",
            headers: {
              "Accept": "application/json",
              "X-Token": token
            },
            // Kuongeza timeout ili isikae muda mrefu ikisubiri link iliyokufa
            signal: AbortSignal.timeout(5000)
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.obj) {
              responseData = data.obj;
              break; 
            }
          }
        } catch (err) {
          lastErrorMessage = err.message;
        }
      }

      if (!responseData) {
        return new Response(JSON.stringify({ 
          error: `Imeshindwa kuunganisha kwenye VPS Server. Sababu: ${lastErrorMessage || "Connection Refused"}. Hakikisha Port 8443 iko wazi kule kwenye VPS Firewall (ufw allow 8443).` 
        }), { status: 502, headers: corsHeaders });
      }

      let clientInfo = null;

      // Kuanza kutafuta mteja
      for (const inbound of responseData) {
        if (!inbound.settings) continue;
        
        let settings;
        try {
          settings = JSON.parse(inbound.settings);
        } catch(e) { continue; }

        if (settings.clients) {
          const found = settings.clients.find(c => 
            (c.id && c.id.toLowerCase() === clientId) || 
            (c.email && c.email.toLowerCase() === clientId)
          );

          if (found) {
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
        return new Response(JSON.stringify({ error: "Mteja mwenye ID au Jina hili hajapatikana kwenye VPS yako." }), { status: 444, headers: corsHeaders });
      }

      return new Response(JSON.stringify(clientInfo), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};
