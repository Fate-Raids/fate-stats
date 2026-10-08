# PlusOne Raid Archive — GitHub Pages Edition (v0.3.0 Alpha)

A free static website for WoW Forever raid history, based on the existing PlusOne v0.1.2/v0.2.0 UI. No PHP, separate server, database, admin login, or secret API token required.

**What it does:** Repository owners upload `.json` exports into `raid-exports/` through GitHub's UI. On each commit to `main`, GitHub Actions validates the JSON, runs parser regression tests, builds a combined archive, and publishes the read-only public website on GitHub Pages. Visitors can browse sessions, loot, raiders, SoftRes, and statistics.

## Quick setup

1. Create a public repository on GitHub. For the shortest site URL, call it **`YOUR-USERNAME.github.io`**; replace `YOUR-USERNAME` with your exact GitHub username. Alternatively use any repository name to get `https://YOUR-USERNAME.github.io/REPOSITORY/`.
2. Extract the **GitHubReady ZIP**, preserving the `.github/workflows/deploy.yml` folder. Upload **the contents**, not the ZIP itself, to the repository root and commit. If you started with a temporary `index.html`, overwrite that one with this version.
3. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**, not **Deploy from a branch**.
4. Check the **Actions** tab for a green **Publish PlusOne Raid Archive** workflow. Open the Pages URL shown in Settings → Pages.
5. To add raids, open `raid-exports/` in GitHub, select **Add file → Upload files**, drag your `.json` files into the uploader, and **Commit changes** to `main`. After the workflow finishes, reload the live website.
6. To remove a test raid, delete its `.json` file in GitHub and commit. The next build removes that session from the public archive.

Your public URL needs no custom DNS. If you want to test with the included synthetic Molten Core raid, move or upload `samples/PlusOne_Synthetic_FATE_MoltenCore_20Raiders_60Items.json` to `raid-exports/`. Do not do this unless you want the synthetic results publicly visible.

**Detailed setup and troubleshooting:** [GITHUB_SETUP.md](GITHUB_SETUP.md)

## Structure

- `index.html`, `assets/`: the public read-only site and its parser.
- `raid-exports/`: upload JSON files here (source of truth).
- `.github/workflows/deploy.yml`: automated build, tests, and Pages publication.
- `scripts/build-archive.mjs`: validates, deduplicates, and assembles original JSON exports into `dist/data/archive.json`.
- `samples/`: optional 20-raider/60-award synthetic test data, not live by default.
- `tests/`: parser and publisher unit tests.
- `dist/`: generated public website, deliberately not committed. GitHub Pages deploys only this folder.

To test locally with Node.js 22+: `npm test && npm run build`, then `python -m http.server 8000 --directory dist` and browse `http://localhost:8000/`.

This website is public. Only people with write permissions on the repository can change its files, but anyone can read committed raw exports and published history. Review guild/player privacy before uploading.
