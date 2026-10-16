# Handoff to PlusOne Master / Raider agent — optional 3D character doll support

**Request from FATE Guild Armory v1.1.0. This is NOT a request to replace working equipment capture.**

## Current website behavior

The website now has a lazy experimental Classic 3D model panel. It can reconstruct character race and sex from existing exports and retains the accurate 2D equipment UI. Current PlusOne gear exports reliably carry the 19 slot item IDs, links, icons, and item names. Those are **not** visual model display IDs. Miorey's viewer requires actual visual display IDs to render individual items. Without those, the 3D character can at most show a generic base race/sex model.

## Requested addon research/change, subject to verified Forever APIs

1. **Do not regress** the existing 19-slot capture, character GUID, class, race, sex, role, item ID/link/name, icon and session JSON exporter. Master collection and Raider companion communications must remain stable.
2. Check which **World of Warcraft: Forever** APIs actually expose a reliable **ItemDisplayID / visual display ID** for an equipped item. Do **not** use Retail-only APIs; do not guess numeric mappings or pass itemID as displayID. If no usable API is available, document that and leave the field absent.
3. If supported, add a nullable `itemDisplayID` to each nonempty `gearSnapshots[name].slots[]` item entry. Keep `itemID` unchanged, and verify with a known equipped weapon, helm and chest. Both identifiers are different concepts.
4. Where the Forever API allows, capture `raceID` and `characterSexID` as numeric enumerations in addition to current human-readable fields. Existing field names are acceptable. Character ID matching must continue to use character GUID where available.
5. OPTIONAL ONLY if confirmed safe and accessible: appearance preferences/customization data (skin, face, hairstyle/color, facial hair, show/hide helmet and cloak). Do not invent values, and avoid protected/restricted or invasive lookups. Existing role and equipment capture are higher priority.
6. Version export format additively (optional fields); do not strip/rename current keys. Test all 19 slots, empty slots, zero sex enum for male, earlier fixture compatibility, and raid session export/import after new fields are introduced.

### Proposed optional JSON shape

```json
{
  "gearSnapshots": {
    "helos": {
      "player": "Helos",
      "race": "Human",
      "raceID": 1,
      "characterSex": "Male",
      "characterSexID": 0,
      "slots": [
        {
          "slot": 1,
          "empty": false,
          "itemID": 12345,
          "itemName": "Example Helm",
          "itemIconName": "inv_helmet_01",
          "itemDisplayID": 67890
        }
      ]
    }
  }
}
```

The item/display numbers above are illustrative placeholders, not verified Forever data.

## Website handling already implemented

- Import/parser accepts `itemDisplayID` / `itemDisplayId` / `displayID` / `displayId` in slot item data.
- Catalog keeps optional `displayId` in historical 19-slot gear snapshots and item index.
- UI forwards only known visual IDs into Miorey's Classic viewer; it NEVER maps itemID directly to displayID.
- If no visual ID is available, its 3D representation remains partial and honest, while the icons and original recorded loot/equipment continue to work.

**No immediate addon modification is mandatory for the site to keep working.** This is a follow-up capability request after validating actual game APIs and whether a permitted model asset source can be used by a GitHub Pages site.
