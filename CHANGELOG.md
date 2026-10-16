# v1.0.1 — 2026-10-13

- Fix GitHub upgrade packaging: include the new publisher tests and all fixture data, overwriting v0.5.2 tests that still referenced retired `dist/data/archive.json`.
- Update GitHub Actions to supported Node 24-based action runtimes while keeping the application on Node.js 22; pin Ubuntu 24.04.
- Leave the site builder, raw raid exports and archive schema unchanged.

# Change Log

## v1.0.0 — FATE Guild Armory redesign (2026-10-13)

- Completely new user interface: original heraldry, dark stone and bronze styling, responsive layout, 6 primary guild areas.
- Original JSON authoritative; character/item/session derived JSON indexes built during GitHub Actions deployment.
- Character identity, 19-slot snapshot history, equipment deltas, raid attendance, awarded loot, SoftRes and roll records.
- Historical gear selector and two-way navigation between character, item, and session pages.
- Search, clickable-sort headers, filters and pagination; all-time roll totals and per-raider full roll records.
- Corrected inferred gear item-quality from Warcraft colored links where explicit quality is missing.
- Item icon pipeline supports verified texture slugs, optional central overrides, provider iconization and honest fallback.
- Retired monolithic v0.5.2 inline frontend and published full raw archive copy.
- Preserves backward input compatibility with older PlusOne exports and web archive v1 files.
- No 500-file/50-MB arbitrary build cutoff; publication safeguards remain for unexpected oversized inputs.
- Zero npm packages, GitHub Pages Actions-compatible.
- Added addon-exporter handoff for icons, GUIDs and dungeon group loot semantics.

## v0.5.2 — Previous known-working rollback

Original full ZIP supplied by the project owner. Keep for rollback; not included as a source copy in this release.
