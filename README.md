# AgencyOS

AI-assisted operating system for a local-business marketing agency. Initial pilot: HVAC contractors in the Phoenix metropolitan area, Arizona.

## Current MVP

- MyPI prospect workspace with search and lane filters.
- Four-lane sales decision framework (A/B/C/D/Unknown).
- Evidence-first classification rules.
- CSV prospect import and export.
- Prospect detail drawer with evidence status and recommended next step.
- HasData integration setup placeholder. No API key is exposed in the browser.
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

HasData is planned as the discovery/enrichment provider. Its API key must be stored server-side as an environment secret. Never put API keys in React code, committed files, CSV exports, or browser storage.

Live discovery is intentionally disabled until the exact HasData endpoint, authentication format, permitted data fields, and server deployment are configured and tested. Meta Ad Library research is a separate evidence source; Google search ads are not a substitute for Meta ad records.

Instagram outreach is not automated in this MVP. Prepare and review messages first; use official, permitted messaging methods and honor opt-outs. No messages, ad spend, contracts, or payments are initiated by this application.

## Next build milestones

1. Secure server-side HasData connector and Phoenix HVAC discovery.
2. Persist prospects and source evidence in a database.
3. Website/review/advertising audit pipeline with confidence and timestamps.
4. MyPI scoring, review queue, outreach drafts, and CRM pipeline.
5. Compliant messaging integrations and appointment reminders.
6. Client onboarding, campaign approval, reporting, and operations orchestration.

Human approval remains required for outreach, campaign launches, budget changes, payments, and contractual commitments.
