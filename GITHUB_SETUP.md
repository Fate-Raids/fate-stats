# GitHub Pages setup — step by step

## 1. Create repository

Sign in to GitHub as your guild account and create a **Public** repository. If your account is `fate-raids`, name the repository `fate-raids.github.io` to get `https://fate-raids.github.io/` (provided that username is available and actually chosen). Any other repository name also works at `https://USERNAME.github.io/REPOSITORY/`.

## 2. Add the website

Download the *GitHubReady* ZIP and extract it on your computer. Upload **its contents** to the repository root, preserving directory names exactly, especially `.github/workflows/deploy.yml`. If your repository already contains a temporary `index.html`, replace it. Uploading only the ZIP file will not make a website.

Important: GitHub's browser uploader might not preserve your intended directory layout if you only drag in selected files. Drag the extracted folders and files together if supported; alternatively use GitHub Desktop to commit the extracted repository contents. The `.github` directory must exist in the repository after your commit.

## 3. Enable GitHub Pages

Go to **Settings → Pages → Build and deployment**, and set **Source = GitHub Actions**. This GitHub edition does *not* use branch-based Pages publishing. You don't need to configure a domain or create any API token.

Go to **Actions → Publish PlusOne Raid Archive**, ensure the latest run is green, then open the URL on **Settings → Pages**. The first launch correctly shows an empty archive.

If a workflow is not visible, verify `.github/workflows/deploy.yml` exists, is committed to `main`, and repository Actions are enabled.

## 4. Upload raid sessions

1. Open your repository's `raid-exports` directory.
2. Select **Add file → Upload files**.
3. Drag a `.json` PlusOne export (or many files) into the page.
4. Select **Commit changes** directly to the `main` branch.
5. The GitHub Action validates each JSON, rebuilds the archive, and deploys the site.
6. After the Actions run is green, refresh the public website to view your raids.

To remove sessions, delete the corresponding file and commit. Replacing a file with a newer export is supported (but take care to avoid overlapping full-history snapshots, which may describe the same sessions).

## 5. What gets published

The Pages deployment includes `index.html`, `assets/`, and `data/archive.json`. It does **not** deploy the `scripts/`, `samples/`, `tests/`, or the upload folder as website paths, but the **source repository is public**. Therefore raw JSON files are readable by anyone using GitHub.

The original JSON payloads are preserved inside the public archive for future statistics. Do not commit secrets or confidential content. Deleting a file later does not erase the earlier Git commit history.

## 6. Troubleshooting

- **Actions fails with invalid JSON**: click the failed build step to see the offending filename and parsing error. Fix/delete that file and commit again. The last successful website remains published.
- **Site still shows no raids**: verify you uploaded files under `raid-exports/`, not under `samples/`, and the new Actions run is green. Refresh after deployment.
- **Site 404**: check Settings → Pages, Source = GitHub Actions, and the Pages URL. For a project repo, use `/REPOSITORY/` in the address.
- **Buttons are inert**: ensure the `assets` folder was uploaded and that the newest Action succeeded. Open the browser console for errors.
- **A duplicate raid appears**: uploading distinct overlapping history snapshots can result in duplicate sessions. Prefer one export per session, or replace the older export rather than keeping both.
- **Want to preview locally**: run `npm test`, `npm run build`, and `python -m http.server 8000 --directory dist`. Opening `index.html` with a `file://` URL will not load the archive reliably.
- **Want the synthetic raid**: upload the file from `samples/` into `raid-exports/`; it will appear publicly and is labeled SYNTHETIC.

## Hosting requirements

GitHub Pages with public repositories is supported on the free plan. Static HTML, CSS, JavaScript, and JSON are supported; PHP is not supported. The standard GitHub Pages workflow requires `pages: write` and `id-token: write` permissions; these are scoped to the deployment job. No personal access token is stored in the website.
