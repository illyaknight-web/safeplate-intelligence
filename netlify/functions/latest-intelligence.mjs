import { getState } from "./lib/store.mjs";

const IMPORTANT_SEVERITIES = new Set(["CRITICAL","HIGH","WATCH"]);
const IMPORTANT_CATEGORIES = /recall|outbreak|public health alert|foodborne|early-warning precursor/i;
const CONTEXT_ONLY_CATEGORIES = /climate|weather context/i;

function ms(v){
  const t = new Date(v || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

function publicItem(x, now){
  const first = ms(x.firstSeenAt);
  const updated = ms(x.updatedAt);
  const last = ms(x.lastObservedAt);
  const newest = Math.max(first, updated, last);
  const ageMinutes = newest ? Math.max(0, Math.round((now - newest) / 60000)) : null;
  const isNew = first > 0 && (now - first) <= 6 * 60 * 60 * 1000;
  const isMaterialUpdate = updated > 0 && first > 0 && updated > first + 60000 && (now - updated) <= 6 * 60 * 60 * 1000;
  const category = String(x.category || "");
  const contextOnly = Boolean(x.contextOnly) || CONTEXT_ONLY_CATEGORIES.test(category);
  const important = IMPORTANT_SEVERITIES.has(String(x.severity || "").toUpperCase()) || IMPORTANT_CATEGORIES.test(category);
  const active = String(x.status || "").toUpperCase() !== "RESOLVED";
  const alertEligible = active && !contextOnly && important && (isNew || isMaterialUpdate);
  const evidence = Array.isArray(x.evidence) ? x.evidence[0] : null;
  return {
    id: x.id || null,
    title: x.title || x.product || "Food safety intelligence",
    product: x.product || "",
    company: x.company || "",
    hazard: x.hazard || "",
    category,
    severity: String(x.severity || "EMERGING").toUpperCase(),
    status: x.status || "",
    source: x.source || evidence?.source || "SAFEPLATE",
    sourceUrl: evidence?.url || null,
    recallDate: x.recallDate || x.sourcePostedAt || null,
    imageUrl: x.imageUrl || x.image_url || x.photoUrl || x.thumbnailUrl || null,
    summary: x.summary || evidence?.text || "",
    firstSeenAt: x.firstSeenAt || null,
    updatedAt: x.updatedAt || null,
    lastObservedAt: x.lastObservedAt || null,
    ageMinutes,
    isNew,
    isMaterialUpdate,
    contextOnly,
    alertEligible
  };
}

export default async () => {
  const state = await getState();
  const now = Date.now();
  const items = (state.incidents || [])
    .map(x => publicItem(x, now))
    .sort((a,b) => {
      if (a.alertEligible !== b.alertEligible) return a.alertEligible ? -1 : 1;
      const rank = {CRITICAL:4,HIGH:3,WATCH:2,EMERGING:1};
      if ((rank[b.severity]||0) !== (rank[a.severity]||0)) return (rank[b.severity]||0) - (rank[a.severity]||0);
      return ms(b.firstSeenAt || b.updatedAt || b.lastObservedAt) - ms(a.firstSeenAt || a.updatedAt || a.lastObservedAt);
    })
    .slice(0, 40);

  return Response.json({
    generatedAt: new Date().toISOString(),
    lastSync: state.meta?.lastSync || null,
    alertCount: items.filter(x => x.alertEligible).length,
    alerts: items.filter(x => x.alertEligible).slice(0, 10),
    latest: items.slice(0, 20)
  }, { headers: { "cache-control": "no-store" } });
};

export const config = { path: "/api/latest-intelligence" };
