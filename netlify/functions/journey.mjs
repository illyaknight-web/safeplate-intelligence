export default async (req) => {
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/unified-intelligence-v12.html`, { headers: { accept: "text/html" } });
  if (!r.ok) return new Response("SAFEPLATE Food Journey unavailable", { status: 502 });

  let html = await r.text();
  const queryBridge = `<script>
  window.addEventListener('DOMContentLoaded',()=>{
    const q=new URLSearchParams(location.search).get('q');
    if(!q)return;
    const apply=()=>{
      const input=document.getElementById('q');
      if(!input)return false;
      input.value=q;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      return true;
    };
    if(!apply()){
      let tries=0;
      const t=setInterval(()=>{tries++;if(apply()||tries>30)clearInterval(t)},100);
    }
  });
  </script>`;
  if (!html.includes("URLSearchParams(location.search).get('q')")) {
    html = html.includes('</body>') ? html.replace('</body>', `${queryBridge}</body>`) : `${html}${queryBridge}`;
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache"
    }
  });
};

export const config = { path: "/unified-intelligence.html" };
