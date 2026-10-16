> **v1.1 experimental 3D viewer:** See [START_V1.1.md](START_V1.1.md), [3D_VIEWER_README.md](3D_VIEWER_README.md) and [PLUSONE_3D_MODEL_EXPORT_HANDOFF.md](PLUSONE_3D_MODEL_EXPORT_HANDOFF.md). Default 2D remains fully functional.

# FATE Guild Armory & Raid Chronicles — v1.0.0

Standalone, read-only, GitHub Pages website for World of Warcraft: Forever guild session JSON exports from PlusOne Master. **Original session JSON remains the source of truth.** The GitHub Actions build generates one small character profile per raider, independent session records, a searchable item registry, and precomputed guild/roll summaries. No backend, login, paid DB, or npm dependencies.

## What's new since v0.5.2

- New original dark Warcraft-inspired editorial theme: stone, bronze, antique gold, heraldic crest, custom armor illustration, class/rarity colors, responsive navigation.
- Pages: Guild Overview, The Armory, Raid Chronicles, Loot Treasury, Roll Analyzer, Guild Statistics, character details, individual session details, item details.
- Characters persist across sessions. Uses real character GUID when recorded; if no GUID, name-based tracking with ambiguous identity safeguards. Synthetic placeholder GUIDs intentionally ignored.
- Character page shows current gear from **newest successful gear capture**, 19 slots, date-selector for historical snapshots, per-slot changes, class/race/character sex (in-game field), role, loot, SoftRes, +1, roll results, attendance and years of category statistics.
- Item Ledger shows distinct winners, multiple awards to same raider, individual rolls/attempts, SoftRes and session references. Uses Forever Wowhead item links and official tooltip script; **exact artwork depends on icon names or provider iconization.**
- Global sort, search, class filter, pages of 50, metadata rebuild from GitHub Actions.
- Roll analytics uses precomputed all-time totals and histogram, keeps latest 500 global roll rows. Selecting a specific character loads that character's full history, without 500 simultaneous profile requests.
- Local temporary preview of any PlusOne session JSON (click PREVIEW EXPORT). Preview does not publish or modify GitHub.

## GitHub install / upgrade

1. **Back up your existing GitHub repository** and keep `raid-exports/` intact. Do not delete or overwrite real session JSON files.
2. Unzip the **FullSource** or **GitHubUpload** archive and upload these files into the root of the existing `fate-stats` repository. Preserve the `.github/workflows/deploy.yml` file, and allow replacing root `index.html`, `assets/` code, `scripts/`, and project docs. The new `index.html` is modular and loads `assets/site.js` and `assets/site.css` (v0.5.2's embedded UI is deliberately retired).
3. On GitHub, Pages > Build and deployment must use **GitHub Actions**. The included workflow runs `npm test`, `npm run build`, and deploys only `dist/`.
4. Add each future export as an individual `.json` file under `raid-exports/` and commit. GitHub rebuilds every derived profile automatically. Inactive characters are never automatically purged.
5. Re-run **Actions > Publish PlusOne Raid Archive > Run workflow** to rebuild indexes after updating `data/item-overrides.json` or code. This does **not** scrape Wowhead for new metadata.

## Local commands

Node.js 22+; no `npm install` needed.

```bash
npm test
npm run build
npm run preview
```

Visit http://localhost:8090/. You cannot reliably view the site by double-clicking `index.html`; browsers block JSON module/fetch access on `file://`.

To test without uploading real guild exports, copy the two files from `reference-fixtures/` to `raid-exports/`, run `npm run build`, preview, then **remove those copies before production deployment**. The separate demo-site ZIP has this already built without modifying your real archive.

## Where data lives

```
raid-exports/                  original immutable session exports (git-tracked)
data/item-overrides.json       optional manually verified corrections (git-tracked)
assets/parser.js               unchanged broad v4–v7 importer, enhanced for item quality
assets/catalog.js              deterministic per-character/index projection
assets/site.js                 actual active frontend (no duplicate inline JS)
assets/site.css                actual active stylesheet
scripts/build-archive.mjs      one-step static publication pipeline
dist/                          generated deployment (git-ignored)
  index.html
  assets/*
  data/manifest.json
  data/overview.json
  data/characters/index.json
  data/characters/char-*.json
  data/sessions/index.json
  data/sessions/session-*.json
  data/items/index.json
  data/items/item-*.json
  data/rolls/overview.json
  data/diagnostics.json
```

The v0.5.2 `dist/data/archive.json` published a second full copy of every raw export. **That file is intentionally not published anymore.** The raw data stays safely in your `raid-exports` repository; the visitor downloads only the specific record they are viewing.

## Metadata and exact item icons

- When PlusOne exports a real icon name such as `INV_Sword_01` in `itemIconName`, the site displays `https://wow.zamimg.com/images/wow/icons/large/inv_sword_01.jpg`.
- If no icon name exists, Wowhead's supported external tooltip script is asked to iconize the Forever item link; this may depend on Forever being indexed by Wowhead and loading successfully in that browser. **This is not a verified 100%-coverage solution.** A visibly generic fallback is used, never an unrelated icon.
- When the current official Forever item's known metadata needs correcting, edit `data/item-overrides.json`:

```json
{"12345":{"name":"Updated Item Name","icon":"inv_sword_01","quality":3}}
```

- Re-run the deploy workflow. Every linked view then resolves metadata from the updated item index; original awarded item IDs and histories remain unchanged.
- `dist/data/diagnostics.json` lists unverified or missing icon-name cases. In the bundled synthetic test data **67/67 distinct items lack exported icon names**. The accompanying `PLUSONE_MASTER_EXPORTER_HANDOFF.md` contains the minimal addon-side optional additions needed to make art reliable.
- Do not attempt to bulk-scrape Wowhead; a legal supported data source or client-exported resolved texture name is preferred.

## Data integrity rules

- Equipment captures only update the current Armory when a newer valid capture exists; a missed capture never erases previous gear.
- A character's class/race/character-sex are in-game character attributes. Role can vary every session.
- Awards and rolls are separate. Pass/timeout records count as responses, not numeric die results; ties/rerolls are preserved as distinct rounds and aren't duplicate awards.
- All sources from different weeks are rebuilt deterministically, so a newly uploaded older/corrected session will be merged with the rest of history.
- Source files should remain permanently. GitHub is not a guaranteed forever backup: create an external backup of `raid-exports/` periodically.
- Do not place sensitive or private information in a publicly accessible GitHub repository or Pages website.

## Known limitations

1. Accurate item icons for every Forever item are **not guaranteed** until the Master/Raider exporter provides verified icon names or a permitted item-icon registry is populated. Official external Wowhead tooltips can update themselves when their data changes, but Forever domain support must be checked against live items.
2. The central armored figure is **decorative**. A fully dressed 3D model cannot be reconstructed exactly from the current 19 slots without additional character appearance data and a supported model asset provider.
3. Without a stable GUID, unrelated historical characters who share an identical full name cannot be distinguished with certainty. Ambiguous real GUID conflicts are not silently merged.
4. In v0.5.2 group-loot Need and Greed were normalized to Main Spec/Off Spec. New sessions can specify `lootSystem: "GROUP_LOOT"` to keep those choices distinct; see addon handoff.
5. This is a redesigned v1.0 frontend, not a pixel-for-pixel v0.5.2 compatibility theme. Deploy only after reviewing the local demo and retaining the v0.5.2 rollback ZIP.

## Copyright and affiliation

This is an original, unofficial guild fan site. Warcraft trademarks, item names, and icons remain the property of their respective rights holders. WoW item links/tooltips rely on Wowhead's public embedding functionality; their service is external and may change. No downloaded WoW client art is included.
