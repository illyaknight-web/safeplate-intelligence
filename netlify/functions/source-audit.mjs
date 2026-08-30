import { getState } from "./lib/store.mjs";
import { SOURCE_REGISTRY } from "./lib/sources.mjs";

const RUNTIME_VALIDATED = new Set(["cdc_content","cfia_recalls","uk_fsa_alerts"]);

export default async () => {
  const state = await getState();
  const health = new Map((state.sourceHealth || []).filter(Boolean).map(x => [x.id, x]));
  const now = Date.now();
  const sources = SOURCE_REGISTRY.filter(Boolean).filter(x => x.display !== false).map(reg => {
    const h = health.get(reg.id);
    const lastChecked = h?.lastChecked || null;
    const ageMinutes = lastChecked ? Math.max(0, Math.floor((now - new Date(lastChecked).getTime()) / 60000)) : null;
    const runtimePassed = RUNTIME_VALIDATED.has(reg.id) && Boolean(lastChecked) && h?.status === "ONLINE";
    const connected = Boolean(reg.active) || runtimePassed;
    return {
      id: reg.id,
      name: reg.name,
      family: reg.family,
      kind: reg.kind,
      connected,
      executionStatus: h?.status || (connected ? "PENDING" : "PLANNED"),
      lastChecked,
      ageMinutes,
      note: h?.note || reg.note || (connected ? "Awaiting execution" : "Connector planned"),
      authority: Boolean(reg.authority)
    };
  });
  const federal = sources.filter(x => x.family === "Federal");
  const federalChecked = federal.filter(x => x.lastChecked).length;
  const federalOnline = federal.filter(x => x.executionStatus === "ONLINE").length;
  const federalIssues = federal.filter(x => ["DEGRADED", "OFFLINE"].includes(x.executionStatus)).length;
  const coverage = state.stateCoverage || { total: 51, checked: 0, online: 0, degraded: 0, lastSync: null };
  const lastSync = state.meta?.lastSync || null;
  const lastMs = lastSync ? new Date(lastSync).getTime() : null;
  const nextSync = Number.isFinite(lastMs) ? new Date(lastMs + 30 * 60000).toISOString() : null;
  const lastAgeMinutes = Number.isFinite(lastMs) ? Math.max(0, Math.floor((now - lastMs) / 60000)) : null;
  const nextInMinutes = nextSync ? Math.max(0, Math.ceil((new Date(nextSync).getTime() - now) / 60000)) : null;
  return Response.json({
    cycleMinutes: 30,
    lastSync,
    lastAgeMinutes,
    nextSync,
    nextInMinutes,
    federal: { total: federal.length, checked: federalChecked, online: federalOnline, issues: federalIssues },
    jurisdictions: { total: 51, checked: coverage.checked || 0, online: coverage.online || 0, degraded: coverage.degraded || 0, lastSync: coverage.lastSync || null },
    sources
  }, { headers: { "cache-control": "no-store" } });
};

export const config = { path: "/api/source-audit" };
