# GitHub Pages setup

GitHub Actions deployment: `.github/workflows/deploy.yml` → `npm test` → `npm run build` → upload `dist` → deploy Pages. Select repository **Settings → Pages → Build and deployment: GitHub Actions**. No Node packages or secrets are needed. Original session JSON is kept in `raid-exports/`; output JSON profiles are generated at build time and not committed.

**Important:** A public GitHub repository makes export files public. Only upload session and game-character data you are authorized to share. The site is a community fan project, not an official Blizzard website.
