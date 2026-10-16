# FATE Guild Armory v1.2.0

## Readability settings

- Added **TEXT SIZE** control (Aa) in the top toolbar, on desktop and mobile.
- Scales headings, labels, tables, navigation text, item lines, and detail rows globally between **100–160%** in 5% steps.
- Preset buttons: 100%, 115%, 130%, 150%; reset-to-default control.
- Updates immediately without reloading, remains in effect when navigating between characters/sessions, and is saved in the current browser using localStorage (when permitted).
- Does not change raw session or character JSON, icon image dimensions, or hosting requirements.

## Experimental 3D viewer

- Corrected a real **gender-enum inversion**: WoW exports typically use 0=male/1=female; the Miorey viewer documents 1=male/0=female. Added tests for both sex IDs.
- Initializes the Classic content path *before* loading the third-party viewer script.
- Added asset loading and renderer timeouts, an explicit failure state, **Retry 3D** and **Copy diagnostics** controls.
- Prevents indefinite loading messages when dependencies hang. Preserves the authoritative equipment panel and 2D alternative.
- **NOT a promise of working 3D**: the Miorey integration still relies on external Wowhead viewer assets and may fail due to CORS/browser restrictions on static GitHub Pages. Current exports also lack equipment display IDs. Exact 3D rendering remains blocked until a permitted asset solution is established.

## Compatibility

- Original `raid-exports/` and generated per-character JSON schema are unchanged.
- Updated test suite and documentation; Node 22/GitHub Actions pipeline preserved.
