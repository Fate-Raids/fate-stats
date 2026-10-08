# PlusOne Raid Archive v0.4.0 — GitHub Pages

Public, read-only website for browsing PlusOne raid sessions, loot awards, SoftRes, and **individual rolls**.

## Update existing website

Copy these updated files to the root of your existing GitHub Pages repository, preserving paths, and commit:

- `index.html`
- `assets/app.js`
- `assets/styles.css`
- `assets/parser.js` (source used by GitHub Actions)
- `assets/parser-browser.js` (prebuilt browser equivalent)
- `package.json`
- `tests/` (optional for publication, included for verification)
- `samples/` (optional demonstration)

The existing `.github/workflows/deploy.yml` does **not** need changing. Nothing needs PHP. The GitHub Action automatically processes all JSON files in `raid-exports/` and republishes after commit.

If you already uploaded the synthetic 0.3.0 JSON under `raid-exports`, your archive should already have rollResults on many awards. The new site will display those figures. Existing real exports that lack rollResults still work, but roll analytics will be unknown for them.

### First roll analytics demo

The new `samples/PlusOne_Synthetic_FATE_MoltenCore_20Raiders_60Items.json` contains a 20-person, 60-award test raid with 158 participant roll/choice records, including Passes and unrolled SoftRes entries. To see the expanded test cases, **replace** the earlier synthetic file under `raid-exports/`, rather than adding a second overlapping history export. Data in `samples/` never publishes automatically.

## Output semantics

Every actual round has a unique `roundId` and `rolls` participants:

```json
{
  "rollEvents": [{
    "roundId": "raid42-drop9",
    "itemId": 17063,
    "itemName": "Example",
    "winner": "Player A",
    "resolved": true,
    "rolls": [
      {"player": "Player A", "category": "Main Spec", "value": 79, "max": 100, "won": true},
      {"player": "Player B", "category": "Off Spec", "value": 30, "max": 100, "won": false},
      {"player": "Player C", "category": "Pass", "value": null, "max": 100, "won": false}
    ]
  }]
}
```

The website also recognizes legacy `award.rollResults` arrays. A missing numeric result is **not zero**. The average and distribution exclude passes and choice-only entries; win rate counts resolved numeric attempts only. A single loot round may include multiple attempts by one player (e.g. tie re-roll).

## Local verification

Run `npm test`, `npm run build`, and optionally `python tests/browser_smoke.py` with Playwright and Chromium installed. Source files require Node.js 22 in the GitHub Actions workflow.

## Privacy and limitations

GitHub repositories are public if you use public GitHub Pages on GitHub Free. Exported player names, items, numbers, and raw session fields will be publicly readable. Historic real roll values cannot be recovered from award-only exports. The new Lua recorder needs wiring into the master addon before future official exports can contain the full data.
