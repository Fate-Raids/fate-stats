# FATE Guild Armory v1.1.0 — Experimental character doll

- Added lazy opt-in **TRY 3D** / **2D** toggle in the character Armory equipment panel.
- Added adapter for Miorey/wow-model-viewer Classic characters (runtime external dependency, no bundled art/model assets).
- Added race/sex mapping, documented viewer equipment slot mapping and snapshot-specific 3D data preparation.
- Safely preserved optional visual display IDs from exports through the historical gear catalog; central item overrides may supply verified visual IDs.
- Cleanly disposes 3D viewer on redraw/navigation and handles third-party failures without affecting equipment icons, history or roll records.
- Adds five targeted integration/data tests; **44 tests passed** in the development environment.
- No original session exports, synthetic upload data or addon code changed. Does not claim live rendering verified or precise item appearance from current exports.

Compatibility: built on v1.0.1 corrected full source and GitHub Actions workflow.
