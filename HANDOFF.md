# PlusOne Roll Analytics / Raid Archive — Handoff

Website version: `v0.4.0` (GitHub Pages). Based on working `v0.3.0` GitHub website. New `rolls` navigator; existing navigation, loot history, session panels, raiders, statistics, SoftRes and item links retained. Site requires no backend beyond GitHub Actions.

## Implementation

- `assets/parser.js`: `collectRollEvents()` pulls from `session.rollEvents` and `award.rollResults` / `award.rolls` plus alias fields. `rollSummary()` computes numeric-only metrics. All original JSON retained in raw source.
- `assets/parser-browser.js`: browser-compatible regenerated parser; must regenerate via `node scripts/build-browser-parser.mjs` whenever parser source changes.
- `assets/app.js`: Roll Analytics page, individual filters, distribution, trend SVG, player details, item details.
- `scripts/build-archive.mjs`: existing build reads `raid-exports/*.json`, outputs `dist/data/archive.json` and website assets. Existing `.github/workflows/deploy.yml` deploys `dist/`. No workflow changes.
- `samples/` has 20 raiders / 60 awards / 158 participant record demo, labeled SYNTHETIC. Not published by default.
- `tests/rolls.test.js` covers roll data, passes, SoftRes without numeric outcomes, unknown wins, dedup, rerolls and legacy exports.

## Important: master-addon status

`PlusOne_RollRecorder_IntegrationKit_v0.1.zip` contains an isolated Lua 5.1-compatible module + integration contract. It is **not integrated into the latest PlusOneMaster addon** because the only accessible addon ZIP is the older `PlusOne1.5g.zip` prototype. The current alpha master source must be supplied or made accessible before an accurate complete addon build can be made. Do not substitute the historical 1.5g code for the current master or invent WoW Forever APIs. Hook real master vote, roll result, finalize and export handlers as documented.

Whenever integration is complete, package master easy install + full source ZIP + handoff ZIP; preserve existing alpha behavior including SoftRes consumption, UI, master-raider protocol and GitHub-compatible export schema. Do not implement alpha/beta backwards migration.

## Future improvements

- Player-level charts by individual raid, overall and category; split percentages and range-adjusted averages.
- Show tie-break attempts as subrows, with round-specific outcomes and eligibility tracking.
- Add class/spec and attendance breakdown after data provenance and export fields are agreed.
- Preserve `roundId` and `sessionId` uniqueness across exports to avoid duplicate statistics from overlapping full-history snapshots.
