export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Kama mteja anafungua tu website ya kawaida ya index.html
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return await env.ASSETS.fetch(request);
    }

    // CORS Headers kwa ajili ya kuwapa ruhusa wateja kupata data
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 2. ENDPOINT MPYA: /check-usage?id=MTEJA_ID
    if (url.pathname === "/check-usage") {
      const clientId = url.searchParams.get("id");
      if (!clientId) {
        return new Response(JSON.stringify({ error: "Tafadhali weka ID yako ya VPN." }), { status: 400, headers: corsHeaders });
      }

      const base = (env.PANEL_URL || "http://rayoo.uk:88/kabuti").replace(/\/$/, "");
      const token = env.API_TOKEN;

      // URL ya kuvuta wateja wote kutoka kwenye 3X-UI panel
      // (Tunavuta list ya inbounds yote, halafu Worker inachuja mteja mmoja)
      const targetUrl = `${base}/panel/api/inbounds`;

      try {
        const response = await fetch(targetUrl, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "X-Token": token // Inajazwa kimya kimya hapa backend bila mteja kuiona!
          }
        });

        if (!response.ok) {
          return new Response(JSON.stringify({ error: "Imeshindwa kuunganisha kwenye VPS Server." }), { status: 502, headers: corsHeaders });
        }

        const data = await response.json();
        
        if (!data.success || !data.obj) {
          return new Response(JSON.stringify({ error: "Panel haijarudisha data zozote." }), { status: 500, headers: corsHeaders });
        }

        // Hapa tunamtafuta mteja (Client) kulingana na ID au Remark aliyoweka kwenye fomu
        let clientInfo = null;

        for (const inbound of data.obj) {
          if (!inbound.settings) continue;
          
          let settings;
          try {
            settings = JSON.parse(inbound.settings);
          } catch(e) { continue; }

          if (settings.clients) {
            // Kutafuta kwenye mifumo ya VLESS/VMESS/Trojan
            const found = settings.clients.find(c => c.id === clientId || c.email === clientId);
            if (found) {
              // Kupata stats za huyu mteja (Upload, Download na Limit) kutoka kwenye inbound client stats
              const stats = data.obj.flatMap(i => i.clientStats || []).find(s => s.email === found.email);
              
              clientInfo = {
                remark: found.email || "Mteja",
                id: found.id,
                up: stats ? stats.up : 0,
                down: stats ? stats.down : 0,
                total: stats ? stats.total : 0, // Jumla ya data alizopewa (kama ipo)
                expiryTime: stats ? stats.expiryTime : 0 // Muda wa kuisha (kama upo)
              };
              break;
            }
          }
        }

        if (!clientInfo) {
          return new Response(JSON.stringify({ error: "ID au jina uliloweka halijapatikana kwenye mfumo wetu." }), { status: 444, headers: corsHeaders });
        }

        // Tunarudisha taarifa za mteja mmoja tu kwa usalama!
        return new Response(JSON.stringify(clientInfo), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: "Error wa kiufundi: " + err.message }), { status: 502, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
