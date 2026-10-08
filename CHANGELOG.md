# v0.3.0 Alpha — GitHub Pages Edition

- Replaced the PHP admin portal with a GitHub repository upload workflow.
- Added GitHub Actions validation, build, and automatic GitHub Pages deployment.
- Added public-site-only deployment isolation; raw JSON uploads, tests, and scripts aren't published as site paths.
- Added deterministic same-payload deduplication and readable build errors for malformed JSON.
- Preserved the familiar v0.1.2 layout, navigation, item links, loot/raider search, SoftRes data, and statistics.
- Kept synthetic test exports optional, so a new guild website starts empty rather than displaying fake raids.
- Preserved all source JSON fields in the published archive for future statistics.
