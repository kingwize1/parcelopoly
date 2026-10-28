# Parcelopoly — powered by Grand Scale Renovations

Pre-construction intelligence from public records. Parcelopoly reads permits, plan-review filings and zoning/land-use applications from government open-data portals every day and surfaces jobs **6 months to 2 years before groundbreaking** — including jobs where **a contractor is named but no electrician is on file** (call first: work typically starts ~1 week after a contractor is named).

* **Directory**: States → Counties → Cities (`#/directory`)
* **Natural-language rules**: "New commercial builds over $1M in Travis County TX with no electrician" is parsed client-side (no API keys) into filters you can edit as chips and save.
* **One-click intro email**: composer with To / Subject / Body, Copy, and *Open in email app* (mailto). Sender signature is editable and stored in the browser.
* **Talk to Sales**: one config constant — see `src/config.ts` (`SALES`).

## Data (all real; nothing is fabricated)
`scripts/fetch-data.mjs` pulls from Socrata open-data portals and writes `public/data/jobs.json` + `meta.json`. See the in-app **Coverage & data** page for what each source provides.

| Source | Area | Signal |
|---|---|---|
| Chicago Building Permits (`ydr8-5enu`) | Cook County, IL | issued permits with trade contacts (GC / electrical) |
| Austin Issued Construction Permits (`3syk-w9eu`) | Travis County, TX | building permits + electrical permits (EP) |
| NYC DOB NOW Approved Permits (`rbx6-tga4`) + Electrical Permit Applications (`dm9a-ab7w`) | NYC (5 counties) | GC permits, electrical filing by BIN |
| NYC DOB NOW Job Filings (`w9ak-ipjd`) | NYC | plan-review filings |
| NYC ZAP project data (`hgx4-8ukb`) | NYC | rezonings / land-use applications |
| Seattle Building Permits (`76t5-zqzr`) | King County, WA | applications in review |
| SF Building Permits (`i98e-djp9`) | San Francisco | applications filed / in review |
| LADBS Permits Submitted (`gwh9-jnip`) | Los Angeles County, CA | plan check |

Caveats: public records rarely include emails (add the recipient's email in the composer); "electrician missing" means none was found on the same record/project — confirm before calling; timing windows are stage-based estimates.

## Daily refresh
`.github/workflows/daily.yml` runs every day, refreshes the JSON, commits it, builds and deploys to GitHub Pages.

## Develop
```
npm install
npm run fetch   # refresh data
npm run dev
npm run build
```
Add a source: write one async function in `scripts/fetch-data.mjs` returning job objects and register it in `SOURCES`.
