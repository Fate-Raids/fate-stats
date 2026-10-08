# Raid JSON uploads

Upload raw PlusOne JSON export files **into this folder** through GitHub's Add file > Upload files menu, then click **Commit changes**.

- One file per raid/session is easiest to manage. Multiple files can be uploaded together.
- Keep original `.json` extension. Any subfolder of `raid-exports` is also scanned.
- Identical JSON payloads are deduplicated even if the filename differs.
- To remove an export, delete its file and commit the deletion. A new deployment removes it from the archive.
- Never upload passwords, account information, private contact information, or other data that should not be public.
- The `samples/` folder contains synthetic test data but **is not automatically imported**.
- The GitHub Actions workflow publishes only `dist/`, not the original folder; nevertheless the repository is public, so committed raw files are also readable on GitHub.

You can watch each publication under the repository's **Actions** tab.
