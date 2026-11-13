# AgencyOS

AI-assisted operating system for a local-business marketing agency. Initial pilot: HVAC contractors in the Phoenix metropolitan area, Arizona.

## Current MVP

- MyPI prospect workspace with search and lane filters.
- Four-lane sales decision framework (A/B/C/D/Unknown).
- Evidence-first classification rules.
- CSV prospect import and export.
- Prospect detail drawer with evidence status and recommended next step.
- Server-side HasData Google Maps discovery endpoint; the API key is read only from `HASDATA_API_KEY` on the Railway server.
- MyPI live discovery button imports real Google Maps business listings while leaving advertising evidence as Unknown until separately audited.
- Sample records are explicitly illustrative and are not real businesses or verified market research.

## Run locally

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
npm run preview
```

## CSV import

Import a CSV with a header row. Supported columns: `name` (or `business`), `city`, `state`, `website`, and `ads`.

Accepted website values: `yes`, `no`, or a website URL. Accepted ads values: `good`, `active`, `problem`, `none` / `none-found`. Active ads without a quality assessment remain Unknown; Lane D requires good ads and a good website to be verified. Missing or ambiguous values remain Unknown.

## Lane rules

- **A — Website:** no website verified → website offer first.
- **B — Ads with a problem:** active ads with an identifiable issue → fix the documented issue.
- **C — Website, no ads found:** website exists and a documented ad review found no active ads → lead-generation offer.
- **D — Good site and ads:** website and active ads appear established → skip or nurture.
- **Unknown:** insufficient or conflicting evidence → research; do not guess.

A failed lookup is not proof that a company has no ads. Store the evidence source and date before using a lane for outreach. If a business has no website, Lane A takes priority and the website is the first offer.

## Integrations and security

HasData Google Maps Search is connected through the Express server in `server.js`. The server reads `HASDATA_API_KEY` from its environment and sends it in the `x-api-key` header. The key is never sent to the browser. Live discovery also requires a separate `AGENCYOS_DISCOVERY_PASSWORD` secret; the user enters that password in the dashboard and the server validates it before spending credits. The discovery endpoint currently runs one fixed Phoenix HVAC search, caches results for 30 minutes, and rate-limits repeated requests from the same IP.

Current HasData documentation lists Google Maps Search at 10 credits per successful request. With 100 monthly credits, plan for roughly 10 successful searches. The first MyPI search uses one request. A Maps listing does not prove that a company has no website or whether it runs ads: missing website evidence remains Unknown, and ad evidence always remains Unknown until separately researched.

Never put API keys in React code, committed files, CSV exports, or browser storage. Meta Ad Library research is a separate evidence source; Google search ads are not a substitute for Meta ad records.

Instagram outreach is not automated in this MVP. Prepare and review messages first; use official, permitted messaging methods and honor opt-outs. No messages, ad spend, contracts, or payments are initiated by this application.

## Next build milestones

1. Secure server-side HasData connector and Phoenix HVAC discovery.
2. Persist prospects and source evidence in a database.
3. Website/review/advertising audit pipeline with confidence and timestamps.
4. MyPI scoring, review queue, outreach drafts, and CRM pipeline.
5. Compliant messaging integrations and appointment reminders.
6. Client onboarding, campaign approval, reporting, and operations orchestration.

Human approval remains required for outreach, campaign launches, budget changes, payments, and contractual commitments.
