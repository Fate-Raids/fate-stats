# PlusOne Raid Archive 0.4.0 — Roll Analytics

- Added a dedicated Roll Analytics page with raider, session, and category filters.
- Added total participations, numeric dice rolls, average, best, wins and resolved win rate.
- Added roll distribution and chronological trend charts (by percentile for varying dice ranges).
- Added individual roll history and item-specific roll detail views within Loot History and raid session details.
- Raider profiles now include a personal roll-history table and summary.
- Accepts `rollResults` stored alongside an award and new `session.rollEvents` arrays. Handles Main Spec, Off Spec, Transmog, Soft Res, Pass, multiple attempts and multiple drops of the same item.
- Preserves older JSON without inventing missing dice results; ignored passes and unrolled automatic SoftRes eligibility when calculating numeric averages.
- Enhanced synthetic Molten Core data for 20 raiders and 60 awards with individual numeric rolls, passes, and unrolled SoftRes selections.
- No PHP; GitHub Pages + existing GitHub Actions workflow still work unchanged.

**Addon status:** The bundled standalone Lua recorder module and wiring guide are provided separately. Integration into the current PlusOneMaster alpha is **not complete**; the master source code was not available for editing in this environment. Do not install the kit as a fully functional addon.
