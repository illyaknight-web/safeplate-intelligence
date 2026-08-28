export default async (req) => {
  const origin = new URL(req.url).origin;
  const r = await fetch(`${origin}/index.html`, { headers: { accept: "text/html" } });
  if (!r.ok) return new Response("SAFEPLATE homepage unavailable", { status: 502 });

  let html = await r.text();

  // The published HTML still contains the legacy inline application runtime.
  // It has a parser defect and is intentionally removed at the public root so
  // only the repaired external runtime controls navigation/data rendering.
  const lastScriptStart = html.lastIndexOf("<script>");
  const lastScriptEnd = html.lastIndexOf("</script>");
  if (lastScriptStart >= 0 && lastScriptEnd > lastScriptStart) {
    const legacy = html.slice(lastScriptStart, lastScriptEnd + 9);
    if (legacy.includes("SAFEPLATE live load failed") || legacy.includes("const data={incidents")) {
      html = html.slice(0, lastScriptStart) + html.slice(lastScriptEnd + 9);
    }
  }

  // Food Journey is the live geographic tracer, not the old static in-page panel.
  // Keep the data-route marker so production smoke tests and accessibility tooling
  // can verify that Journey is present while the click still opens the live tracer.
  html = html.replace(
    '<button data-route="journey">Food Journey</button>',
    '<button data-route="journey" type="button" onclick="location.href=\'/unified-intelligence.html\'">Food Journey</button>'
  );

  // Never flash misleading 0/51 or developer-facing "backend" language before
  // the live runtime has returned production status.
  html = html
    .replace("Feeds · checking", "Intelligence · initializing")
    .replace("States · checking 0/51", "States · initializing")
    .replace("Backend: checking…", "System status · initializing")
    .replace(">Checking…<", ">Initializing…<");

  const styleTag = '<link rel="stylesheet" href="/polish.css">';
  if (!html.includes('/polish.css')) {
    html = html.includes('</head>') ? html.replace('</head>', `${styleTag}</head>`) : `${styleTag}${html}`;
  }

  // Old #journey bookmarks/history should land on the same live tracer.
  const journeyRedirect = '<script>if(location.hash==="#journey")location.replace("/unified-intelligence.html");</script>';
  if (!html.includes('location.hash==="#journey"')) {
    html = html.includes('</head>') ? html.replace('</head>', `${journeyRedirect}</head>`) : `${journeyRedirect}${html}`;
  }

  const runtimeTag = '<script src="/live-alert.js" defer></script>';
  if (!html.includes('/live-alert.js')) {
    html = html.includes('</body>') ? html.replace('</body>', `${runtimeTag}</body>`) : `${html}${runtimeTag}`;
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache"
    }
  });
};

export const config = { path: "/" };
