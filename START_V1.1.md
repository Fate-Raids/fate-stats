# START HERE — v1.1 experimental 3D character doll

1. Download `FATE_GuildArmory_v1.1_GitHubUpload.zip` and upload/replace its contents at the repository root, preserving folders and the entire existing `raid-exports` directory. There are **no synthetic exports** inside this package.
2. Commit to `main`. GitHub Actions should run `npm test` (44 pass in our tests), `npm run build`, and deploy.
3. Open a raider page → **TRY 3D** beside Equipment. Switch back with **2D** at any time.
4. The 3D view is **experimental**, not a promised fully dressed doll. It requires browser-accessible third-party assets and separate *visual display IDs* for each worn item. Read `3D_VIEWER_README.md`.
5. For addon improvements, give the agent `PLUSONE_3D_MODEL_EXPORT_HANDOFF.md`. Do not modify current addon until its data source has been verified.

If an external script fails, the 2D equipment and all guild data remain functional. No changes are made to the live repo until you upload the package.
