# SAFEPLATE LIVE v35.4 — DEPLOY READY

This package contains the current one-file SAFEPLATE master front end plus the Netlify back-of-house.

## Active at first deployment
- 30-minute Netlify Scheduled Function
- FDA openFDA food enforcement adapter
- USDA FSIS recall adapter
- persistent beta state via Netlify Blobs
- /api/incidents
- /api/source-health
- /api/manual-sync
- /api/analyst-intake
- /api/system-status
- /api/climate-watch

## Registered but still PENDING
CDC; state/local agencies; international authorities; retailer/manufacturer; supplier/distributor; labs/science; NOAA/CPC ENSO/El Niño; flood/heat/drought; water/irrigation; agriculture/growing regions; logistics/cold-chain; emerging/news/consumer signals.

SAFEPLATE must never label a source LIVE until that connector has actually completed a successful check.

## How to prove the backend is live
1. Published Netlify deploy succeeds.
2. `surveillance` appears in Functions with a Scheduled badge.
3. Run it once manually in Netlify.
4. `/api/system-status` reports `live: true` and a real `lastSync`.
5. `/api/source-health` shows real timestamps/statuses.
6. The front end begins filling incidents/source-health from the backend.

## El Niño / early-warning direction
NOAA/CPC ENSO and environmental sources belong in SAFEPLATE as contextual early-warning evidence. Climate signals should be correlated with growing region, commodity, water, harvest, logistics and historical-event data. They must never be presented as proof that a food is contaminated.


## v35.5 early-warning updates
- FDA Active Foodborne Outbreak Investigations adapter is ACTIVE.
- NOAA/CPC El Niño climate-context adapter is ACTIVE.
- Climate context is stored separately from contamination evidence.
- Added `/api/validation-corpus` with official-source benchmark cases, including frozen blueberries and active unidentified-product outbreaks.
- The blueberry case is intended for retrospective lead-time testing: illness cluster -> exposure interviews -> retailer stop-sale -> supplier recall -> expanded recall -> inspection/import controls.


## v35.6 pre-production audit fixes
- Fixed invalid `netlify.toml` syntax that would have broken deployment.
- Added production security headers.
- Surveillance source calls now run concurrently to remain inside Netlify Scheduled Functions' 30-second execution limit.
- FDA outbreak records use stable source dates and content hashes; unchanged records no longer appear falsely changed every 30 minutes.
- Active FDA outbreak records are reconciled when they leave FDA's active table.
- Added `lastObservedAt` to distinguish source freshness from event publication date.
- Corrected NOAA/CPC ENSO source to the official ENSO Diagnostic Discussion.
- HTML sources now request HTML instead of `application/json`.
- LIVE status now requires a fresh successful sync (<=75 minutes); stale data is explicitly labeled STALE.
- Climate-watch data is now displayed in Environmental Context.
- Manual sync and Analyst Intake are protected by `SAFEPLATE_ADMIN_TOKEN`.
- Analyst Intake validates source type, URL, length, and required fields.
- Public read endpoints remain read-only.


## v35.7 public-source integrations
ACTIVE / no key required:
- FDA enforcement
- FDA active outbreak investigations
- FDA food adverse events (optional key recommended)
- USDA FSIS recalls
- CDC Content Services outbreak signal search
- NOAA/CPC ENSO advisory
- NWS active flood/heat/hurricane/tropical storm alerts
- Trader Joe's public recall announcements
- UK Food Standards Agency public food alerts

Optional free keys:
- FDA_API_KEY
- NOAA_CDO_TOKEN
- SAFEPLATE_ADMIN_TOKEN (self-generated secret for operator-only actions)

Registered but still pending:
- CFIA RSS: CFIA confirms recall/safety alert RSS availability; exact feed must be verified before activation.
- EU RASFF Window: public searchable system exists; connector pending a stable terms-safe interface.
- Other grocery/farm/manufacturer pages remain registry candidates and should be activated one-by-one after parser validation.

## v35.8 — Red-Team Remediated

Deployment posture: **STAGING CANDIDATE. Do not label production LIVE until runtime source checks pass.**

Applied independent red-team findings:
- C-1: exact FSIS/FDA recall classification matching.
- C-2: SOURCE_REGISTRY sparse-array repair plus null-safe rendering.
- H-1: public static files isolated under `site/`; functions are not under the publish root.
- H-5: NOAA CDO proxy requires operator authorization.

Truth standard:
- No fabricated or hypothetical source is shown as live.
- Unverified CDC Content Services / Trader Joe's / UK FSA adapters are disabled pending runtime validation.
- Adverse events are signals, not confirmed causal outbreaks.
- Climate/weather are contextual risk modifiers, not contamination evidence.
- Cross-source entity resolution, true incident correlation, predictive early-warning scoring, and a persistent graph remain open engineering work.


## v35.9 production-remediation pass

Top-line status: **STILL CONDITIONAL — NOT PRODUCTION LIVE**

Completed locally:
- A-3 dependency versions pinned exactly:
  - `@netlify/blobs` 10.7.13
  - `@netlify/functions` 5.3.0
  - `cheerio` 1.2.0
- Browser library URLs pinned:
  - Leaflet 1.9.4
  - MapLibre GL JS 5.7.3
  - MapLibre GL Leaflet 0.1.0
  - D3 7.9.0
- SRI metadata added where a real published integrity value was available:
  - Leaflet: official published SHA-256 SRI
  - MapLibre GL 5.7.3: published SHA-512 SRI
  - D3 7.9.0: published SHA-512 SRI
- **MapLibre GL Leaflet adapter remains without SRI.** No independently verified file-level SRI hash was available in this execution environment, so no hash was fabricated. This keeps A-4 open until the exact adapter bytes are hashed and the deployed page is tested.

Still blocking production LIVE:
- A-1: exact v35.9 package has not yet been deployed and runtime-verified on Netlify.
- A-2: post-deploy public-source-file 404 tests cannot be performed until A-1.
- A-4: adapter SRI must still be generated/verified or the adapter must be self-hosted; runtime console test is still required.
- A-5: `SAFEPLATE_ADMIN_TOKEN` is not currently configured in the connected Netlify project environment.


## v35.10 independent-review staging candidate

An independent second audit verified the v35.9 diff and found no functional regressions.

Status: **SAFE FOR PRIVATE STAGING — NOT PRODUCTION LIVE**

Confirmed:
- dependency pins are real published versions;
- existing script SRI work is legitimate;
- v35.8 backend fixes remain byte-identical in v35.9;
- no new backend regressions were introduced.

Open before public production:
- actual Netlify runtime proof (A-1);
- post-deploy source-file 404 proof (A-2);
- `SAFEPLATE_ADMIN_TOKEN` must be configured in the real Netlify environment (A-5);
- MapLibre GL 5.7.3 external CSS has no integrity attribute and must be hashed or self-hosted before public production.


## v35.11 production-code candidate

A-4 has been closed at the code/package level without fabricating SRI values:
- Leaflet and the Leaflet/MapLibre bridge were removed.
- SAFEPLATE now uses MapLibre GL JS directly.
- External MapLibre CSS was removed and replaced with the minimal local canvas CSS required for this non-control map use.
- MapLibre GL JS remains exact-version pinned with verified SRI.
- D3 remains exact-version pinned with verified SRI.
- CSP no longer allows external stylesheet origins.

Still not allowed to claim production LIVE until:
- A-1 exact Netlify runtime deployment evidence is captured;
- A-2 deployed source/audit file 404 checks pass;
- A-5 SAFEPLATE_ADMIN_TOKEN is set in the live Netlify environment.

- Removed Google Fonts network dependency. SAFEPLATE now uses local/system font stacks, leaving no external stylesheet requests.


## v35.12 map attribution compliance fix
- Removed the CSS rule that suppressed MapLibre's control container.
- Restored visible attribution controls.
- Added explicit attribution text for OpenFreeMap and OpenStreetMap contributors.
- No backend code changed in this pass.

Runtime gates A-1, A-2, and A-5 remain open until the exact package is deployed and verified on Netlify.
Staging deployment trigger — August 20, 2026
