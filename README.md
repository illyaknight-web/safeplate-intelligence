# SAFEPLATE™ v35.13 — Production Candidate

SAFEPLATE™ is Function Media LLC's food-risk intelligence platform. This repository contains the public web interface, Netlify Functions backend, source registry, normalization logic, persistent state, climate context, validation corpus, and production deployment configuration.

## Current deployment posture

**Status: PRODUCTION CANDIDATE — final post-cleanup runtime verification in progress.**

The staging environment has already demonstrated a real successful surveillance cycle with live data, source-health reporting, and protected backend files. The final cleanup removes the temporary staging GET bootstrap from `/api/manual-sync` and restores the endpoint to authenticated POST-only operation before production promotion.

## Active verified runtime sources

The latest successful staging runtime audit verified all six currently active production connectors:

- FDA openFDA Food Enforcement
- FDA Active Foodborne Outbreak Investigations
- FDA Food Adverse Events
- USDA FSIS recall/public-health-alert feed through the official USDA/FSIS GovDelivery publication channel when the direct FSIS endpoint blocks cloud requests
- NOAA/CPC ENSO monitoring
- National Weather Service active hazards

SAFEPLATE must never label a source ONLINE unless that connector completed a successful runtime check.

## USDA FSIS resilience

The official FSIS API and legacy FSIS RSS paths can return HTTP 403 to cloud-hosted requests. SAFEPLATE therefore keeps the official FSIS API as the primary path and uses an authoritative USDA/FSIS GovDelivery feed as a fallback. Only records whose content represents a recall or public health alert are normalized into SAFEPLATE incidents. General USDA/FSIS news is not treated as recall evidence.

The bridge preserves source authority and capture time and is refreshed by `.github/workflows/fsis-bridge.yml`.

## Netlify backend

- Scheduled surveillance function: every 30 minutes
- Persistent state: Netlify Blobs
- `/api/incidents` — public read endpoint
- `/api/source-health` — public read endpoint
- `/api/system-status` — public read endpoint
- `/api/climate-watch` — public read endpoint
- `/api/validation-corpus` — public validation evidence endpoint
- `/api/manual-sync` — operator-only POST endpoint protected by `SAFEPLATE_ADMIN_TOKEN`
- `/api/analyst-intake` — operator-only intake endpoint protected by `SAFEPLATE_ADMIN_TOKEN`
- `/api/noaa-cdo` — protected NOAA CDO proxy

## Security posture

- Static publish root is limited to `site/`.
- Netlify Functions source files are outside the publish root.
- Runtime checks verified protected source/audit paths return 404.
- `SAFEPLATE_ADMIN_TOKEN` is configured as a secret in Netlify Functions contexts.
- Manual sync is authenticated POST-only in the production candidate.
- Dependency versions are pinned.
- Browser libraries are exact-version pinned and use verified integrity metadata where applicable.
- MapLibre is used directly; legacy Leaflet bridge dependencies were removed.
- External MapLibre CSS and Google Fonts dependencies were removed.
- Map attribution for OpenFreeMap/OpenStreetMap is visible and preserved.
- Security headers and CSP are defined in `netlify.toml`.

## Evidence and truth standard

SAFEPLATE distinguishes:

- confirmed recalls and official outbreak investigations;
- adverse-event signals;
- contextual climate/weather/environmental evidence;
- pending connectors that have not yet passed runtime validation.

Climate and weather are risk-context layers, not proof of food contamination. Correlation must not be presented as causation.

## Pending expansion sources

These remain registered or planned and must be activated only after source-specific runtime validation:

- CDC public foodborne content
- state health and agriculture departments
- county and city health departments
- CFIA
- EU RASFF
- retailer/manufacturer sources
- Trader Joe's
- UK Food Standards Agency
- suppliers and distributors
- laboratories and scientific literature
- water and irrigation data
- agriculture/growing-region conditions
- logistics and cold-chain data
- news/consumer/emerging signals

## Production promotion gates

Before public production promotion, the exact cleaned candidate must satisfy:

1. Netlify build/deploy succeeds.
2. `/api/system-status` returns HTTP 200 and `live: true` with fresh sync metadata.
3. `/api/source-health` returns HTTP 200 with all active production connectors ONLINE and zero active-source issues.
4. `/api/manual-sync` rejects unauthenticated GET requests.
5. protected backend/source paths continue to return 404.
6. the production deploy retains `SAFEPLATE_ADMIN_TOKEN` and required environment-variable scopes.
7. no temporary repair/smoke workflows remain; only the durable FSIS bridge workflow is retained.

## Early-warning direction

SAFEPLATE's long-term purpose is earlier warning, not merely recall aggregation. NOAA/CPC ENSO, NWS hazards, water, agriculture, growing-region, logistics, cold-chain, retailer, laboratory, scientific, and emerging-signal data should be correlated with commodities and geographies to identify elevated risk before a conventional recall timeline fully develops. Any predictive or correlation output must remain clearly separated from verified contamination evidence.

© 2026 Function Media LLC. All rights reserved.
