# Character viewer — actual status as of v1.2.0

The v1.1 site can fall back to a 2D silhouette when its external 3D dependencies fail to load, and current exports do not provide the visual `displayId` required to dress a base 3D character.

## Corrected defects

1. The source library [Miorey/wow-model-viewer](https://github.com/Miorey/wow-model-viewer) describes gender 0=female, 1=male. PlusOne/Blizzard's commonly used sex enumerations are 0=male and 1=female. Our adapter previously passed them unchanged, which would render the opposite gender. v1.2 now explicitly translates the values.
2. The `CONTENT_PATH` is now initialized before the external classic viewer's script is loaded.
3. Missing scripts and stalled initialization now give errors, timeouts, a retry button and browser-copyable diagnostics instead of an endless loading state.

## Still required for an accurate equipped 3D model

- **Permitted model data delivery compatible with static hosting.** Miorey's README specifically mentions cross-origin restrictions and a proxy. GitHub Pages cannot run such a proxy. We are not bypassing CORS restrictions or mirroring third-party art without authorization. Direct cross-origin asset access has not been verified.
- **Verified visual display IDs** for equipped items. An item ID is not an appearance ID. The current synthetic sessions mainly provide item IDs/icons but no display IDs.
- **Appearance customization** for skin/face/hair etc., if an exact depiction is required. Absent these, a generic race/sex base is the most we can attempt.

Until those constraints are solved, the 2D equipment slots with item icons/tooltips remain authoritative. No synthetic gear art or made-up 3D model is shown as the character's actual equipment.

## Diagnostics

Select TRY 3D, expand "Why is my model not loading?", click "Copy diagnostics", and supply the text if further troubleshooting is requested. DevTools Console and Network may identify an additional external-provider or CSP failure.
