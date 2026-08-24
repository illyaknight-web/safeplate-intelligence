import { getState } from "./lib/store.mjs";

// Public, read-only proof endpoint for retained surveillance-cycle timestamps.
export default async () => {
  const s = await getState();
  const cycles = (s.changes || [])
    .filter(x => x && x.title === "Surveillance cycle complete" && x.time)
    .map(x => ({ time: x.time, detail: x.detail || "" }))
    .sort((a,b) => new Date(a.time) - new Date(b.time));

  const gaps = [];
  for (let i = 1; i < cycles.length; i++) {
    const prev = new Date(cycles[i-1].time).getTime();
    const cur = new Date(cycles[i].time).getTime();
    if (Number.isFinite(prev) && Number.isFinite(cur)) {
      const minutes = Math.round((cur - prev) / 60000 * 10) / 10;
      gaps.push({ from: cycles[i-1].time, to: cycles[i].time, minutes, withinTolerance: minutes >= 25 && minutes <= 40 });
    }
  }

  return Response.json({
    generatedAt: new Date().toISOString(),
    configuredCycleMinutes: 30,
    lastSync: s.meta?.lastSync || null,
    cycleCountRetained: cycles.length,
    cycles,
    gaps,
    allRetainedGapsWithinTolerance: gaps.length ? gaps.every(g => g.withinTolerance) : null
  }, { headers: { "cache-control": "no-store" } });
};

export const config = { path: "/api/surveillance-history" };
