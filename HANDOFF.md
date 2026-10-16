> **v1.1 ADDENDUM:** The existing architecture remains; see [3D_VIEWER_README.md](3D_VIEWER_README.md) for optional 3D viewer, status and limitations. All prior claims of 39 automated tests refer to v1.0.1; current v1.1 has 44 passing tests.

# DEVELOPMENT HANDOFF — FATE Guild Armory v1.0.0

**October 13, 2026.** This ZIP is a complete replacement source for the v0.5.2 website; it is **not deployed** to the live GitHub Pages repository. The original user-supplied v0.5.2 ZIP is the known working rollback baseline.

## Project direction

The owner approves feature scope; ChatGPT builds, implements, tests and supplies downloadable source. Do not assign implementation tasks to the owner. The website is a long-lived guild record, not just a statistics viewer. Non-active raiders must stay in the Armory. Keep zero monthly infrastructure costs for ordinary use and preserve GitHub Pages with GitHub Actions.

## Implementation choices

- ES modules, vanilla HTML/CSS/JS, Node 22, zero npm runtime packages.
- `assets/parser.js`: adapts PlusOne older and v7 JSON into normalized sessions and rolls.
- `assets/catalog.js`: pure `createCatalog(assemble(sources), options)` builds immutable projections. This is the single projection implementation for both deployment and local JSON previews.
- `scripts/build-archive.mjs`: reads all `raid-exports/*.json` recursively, checks files, dedups identical payloads, normalizes/merges sessions, generates index/profiles and diagnostics to `dist-next`, then replaces `dist/` only after success.
- `assets/site.js`: only active browser frontend, deep links via hashes and lazy fetch of specific character/session/item; loaded from root index. All user- and export-provided strings are escaped before HTML insertion.
- `assets/site.css`: original design system. `fate-crest.svg` and `character-silhouette.svg` are original decorative assets.
- Local preview uses the same createCatalog() logic but generated results exist only in memory, not on GitHub.
- `reference-fixtures/`: two synthetic 20-raider v7 fixtures and their different GUID placeholders. Fixtures should never be committed into production `raid-exports/`.

## Tests

`npm test` includes legacy parser and publisher tests plus new history, index, quality, rollout and override tests. 39 pass as of this handoff. `npm run build` is tested with zero exports and with both provided synthetic fixtures; fixture build yields 2 sessions, 50 awards, 346 roll responses, 20 continuous characters, and 67 unique items. Full live Chromium visual verification in this environment was restricted by browser administration policy; visually review the local demo before replacing live Pages.

## Important work still pending

- Verify Wowhead Forever iconization and tooltips with real Forever item IDs. Current synthetic inputs contain no icon filenames. Do not promise 100% item icon coverage yet. See `PLUSONE_MASTER_EXPORTER_HANDOFF.md` for the separate addon developer.
- Consider a real dressed model viewer after character appearance info and asset compatibility have been proved. Decorative silhouette is intentionally not presented as the actual character.
- Validate future real Dungeon Mode JSON. The generic v7 fixtures are raid-style and do not conclusively test group Need/Greed parsing. A per-session lootSystem is preserved if exported.
- If more than hundreds of thousands of roll rows arrive, partition detail JSON by period or player as needed. Current roll analyzer loads one compact summary + latest 500 global responses; a selected raider loads their one full profile.
- GitHub Pages total-site/output size and timeouts should be monitored; the build uses an item/character index rather than downloading every source session in the browser. No purge logic exists.

## Non-negotiables

- Do not erase or rewrite original raid export files. Do not reset history for inactive or renamed raiders.
- Never treat SoftRes reserve consumption as a guaranteed loot award; count verified awards separately.
- Preserve numeric roll attempts, range, tie rounds, and explicit Pass/timeout.
- Preserve item IDs and verified lore data even when item name/icon presentation is refreshed centrally.
- Prefer append-only session exports and deterministic projection rebuilds; avoid hidden incremental state updates that cannot be recovered from original sessions.
- Never write code assuming Retail or Midnight APIs; addon changes must be verified for World of Warcraft: Forever.
