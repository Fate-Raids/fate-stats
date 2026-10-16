# FATE v1.2.0 — Upgrade instructions

1. Download `FATE_GuildArmory_v1.2.0_GitHubUpload.zip` and extract it.
2. In the GitHub repository root, upload the package's files and preserve their directory paths (especially `assets/`, `tests/`, `.github/workflows/`). Commit the changes to `main`.
3. **Do not delete or replace any JSON already in `raid-exports/`.** The upload package contains no synthetic raid sessions.
4. Run **Actions → Publish PlusOne Raid Archive → Run workflow**, choose `main`, then wait until build and deploy succeed.
5. Open the live site. Use **Aa / TEXT SIZE** in the upper toolbar; choose a preset or adjust the slider. This preference is local to the current browser/device.
6. On a character profile, select **TRY 3D** to attempt the third-party renderer. If it fails, expand "Why is my model not loading?", then use "Copy diagnostics" when reporting the problem. **2D** remains the stable default.

### Important

The 3D renderer is still **experimental and may be blocked by Wowhead CORS policy**. The updated integration fixes known data mapping and improves diagnostics but does **not** include a license to host Wowhead assets or a CORS bypass proxy. No addon change is needed for the typography setting.
