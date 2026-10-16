# FATE Guild Armory v1.1 — Experimental character doll

**Status: code-integrated trial, not verified as a production model renderer.**

The character Armory now offers **2D** (default) and **TRY 3D** next to the equipment header. The 3D option requests the external [Miorey/wow-model-viewer](https://github.com/Miorey/wow-model-viewer) JavaScript library (ISC) and the Classic ZamModelViewer resources. The library is loaded only on demand, not for every website visitor. The existing 19-slot gear panel, item links/tooltips, roll data and raid history still work if 3D cannot load.

**This package does not include the third-party model viewer or Wowhead/Blizzard art assets.** The third-party README documents a server/proxy and CORS restrictions. We have not bypassed those restrictions. A free static GitHub Pages site cannot automatically operate that server. We have not confirmed that the direct asset endpoint supports the needed cross-origin browser requests or that Forever uses exactly the same appearance definitions. We cannot guarantee the viewer will render on the live website. The fallback explains the error; the actual gear panel is unaffected.

## How to try

1. Publish these files with your existing `.github/workflows/deploy.yml` and preserve your `raid-exports/` folder. The upload package contains no synthetic raid records.
2. Open **The Armory**, choose a character with captured gear and an identified race and sex, then click **TRY 3D** above the equipment panel.
3. The page attempts to load the Classic model viewer; the status area reports whether loading succeeded, or which dependency is unavailable.
4. Use the existing equipment timeline to switch raid nights. The 3D view is recreated for the selected snapshot; the icon and tooltip equipment positions always represent the authoritative stored items.
5. Use **2D** at any point to restore the stable illustration. Switching to another page also returns to 2D.

## Required metadata for visible equipment

The viewer accepts **visual display IDs**, which are not the same as game item IDs. Current PlusOne v7 exports supply item IDs but typically no visual display IDs. This build preserves an `itemDisplayID` or `displayId` on gear items if present; it also accepts a verified central `displayId` in `data/item-overrides.json`. **Never populate displayId with an ordinary itemId** just to make the 3D viewer show something. Without verified visual IDs, a successfully loaded viewer may display only a basic race/sex model, not the actual equipped armor.

Example optional metadata for **one** gear slot (numbers illustrative only, not real display IDs):

```json
{"slot":1,"empty":false,"itemID":12345,"itemName":"Example Helm","itemIconName":"inv_helmet_01","itemDisplayID":67890}
```

Example verified central registry entry (illustrative numeric values, not a real game mapping):

```json
{"12345":{"name":"Example Helm","icon":"inv_helmet_01","displayId":67890}}
```

The adapter intentionally draws only slots with validated visual display IDs. We don't currently model rings, trinkets, necklaces, shirt, ranged/relic or tabard in 3D. Their actual inventory icons and tooltips still appear normally.

## Model source, dependencies and browser testing

- Adapter: `assets/model-viewer.js` (FATE source, not a copied third-party library).
- Runtime JS package: `https://cdn.jsdelivr.net/npm/wow-model-viewer@1.5.3/+esm`
- External scripts: jQuery 3.5.1 and `https://wow.zamimg.com/modelviewer/classic/viewer/viewer.min.js`
- Asset base: `https://wow.zamimg.com/modelviewer/classic/`
- Generated static bundle includes the adapter (`scripts/build-archive.mjs`).
- No npm packages or server/proxy are installed. External origin connectivity and CORS must be checked in a normal browser.

### Limitations

1. **3D live-rendering not verified.** Automated tests verify the data mappings and that packaging includes the adapter, but do not guarantee third-party assets load from GitHub Pages. Treat TRY 3D as experimental.
2. **Not necessarily an exact character.** Skin, face, hairstyle and other customization settings must be exported before exact appearance is possible. This integration uses generic defaults if absent and explicitly avoids claiming it's the exact live character.
3. **Visual IDs.** The existing synthetic fixtures have item IDs and icons but not real visual display IDs, so even if the model loads it may be undressed.
4. **Resource rights.** The model viewer wrapper is ISC-licensed; its underlying 3D models and Wowhead/Zam assets are separate. Hosting/redistributing third-party models is outside the scope of this release.
5. The viewer library's published npm package targets older Node versions but runs here only in browsers via an optional CDN import; the site build still uses Node 22 with no runtime package install.

To fully satisfy an accurate 3D equipped character for WoW: Forever, the separate addon project must export visual metadata where verified and we must establish a permitted, browser-accessible Forever asset source. See `PLUSONE_3D_MODEL_EXPORT_HANDOFF.md`.
