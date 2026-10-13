# Update the existing live FATE website

1. Keep a copy of the current `fate-stats` GitHub repository and v0.5.2 ZIP.
2. In GitHub, **do not delete** the `raid-exports/` directory or its historical JSON files.
3. Upload the contents of `GitHubUpload` ZIP into the existing repository root, replacing site source files. Do not nest them inside an extra folder; the repository must contain root `index.html`, `assets/`, `scripts/`, `.github/workflows/deploy.yml`, and `package.json`.
4. Keep GitHub Pages set to **GitHub Actions**. A push triggers the included test/build/deploy workflow.
5. On completion open https://fate-raids.github.io/fate-stats/ and check navigation, character cards, raid sessions, and item/roll views. Use the synthetic fixture first if real exports haven't been uploaded.
6. If rollout has issues, restore your previous v0.5.2 files and rerun the Pages workflow. Historical JSON files should remain untouched through either change.

A static demo-site ZIP is included for preview, but **must not** be uploaded to GitHub as real sessions. It contains explicitly synthetic data.

## New export procedure

Commit each raw session JSON under `raid-exports/`. Build regenerates profiles and indexes. Never edit generated files inside `dist/` directly. The generated site is public and read-only.

## Refresh item presentation

Update a verified item entry in `data/item-overrides.json`, then rerun the Pages deployment. Tooltips loaded by Wowhead update independently when their Forever database changes. No paid server or bulk item scraping is used.
