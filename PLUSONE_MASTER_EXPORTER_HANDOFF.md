# PlusOne Master / Raider Companion — Optional Exporter Changes for FATE Armory

**Recipient:** The agent maintaining PlusOne Master and PlusOne Raider for World of Warcraft: Forever.
**Context:** The guild website was rebuilt as FATE Guild Armory v1.0.0. This handoff documents additional **optional export fields** that would materially improve accuracy. Preserve existing stable addon functionality; do not implement unverified Retail-only WoW APIs. The website accepts existing v7 exports even without these additions.

## Priority 1 — Real item icon identification (main blocking issue)

The 20-player synthetic Forever v7 tests contain valid item IDs, names and colored hyperlinks, but no usable string `itemIconName`. **67 of 67 distinct item IDs lack exported icon slugs.** The website may use the official external Wowhead tooltip library for provider-supplied icons, but cannot guarantee this for Forever custom items.

For every occupied gear slot, awarded item, soft-reserved item, and roll contest item, export these if and only if the Forever client can verify them:

```json
{
  "itemID": 7721,
  "itemName": "Hand of Righteousness",
  "itemLink": "|cff0070dd|Hitem:7721:0:0:0|h[Hand of Righteousness]|h|r",
  "quality": 3,
  "itemIconName": "INV_Hammer_02",
  "iconFileDataID": 123456
}
```

The values in the example are **illustrative only**; do not copy an unverified mapping. `itemIconName` must be the real texture basename/path resolved by a Forever-compatible API or verified local map, not an invented guess. If the only available result is a numeric FileDataID, export it under a **separate** field (`iconFileDataID`), not `itemIconName`. Wowhead icon JPG paths cannot be inferred directly from numeric IDs. Keep `itemID`, `itemName` and `itemLink` unchanged and never break an award to add artwork.

If no supported API exposes icon filenames, report that clearly and keep the numeric ID. The website can still resolve it later via an independently verified registry. No network requests or scraping are needed in the addon.

## Priority 2 — Stable per-raider identity

Include the same stable Forever character GUID (if securely available) in both the session's roster and gear snapshot, and optionally in award/roll/SoftRes participant records:

```json
"roster": {
  "healos": {"name":"Healos Animosity","playerGUID":"<verified-real-guid>","class":"PALADIN","race":"Human","characterSexID":0,"role":"Healer"}
}
```

The website already reads `gearSnapshots[*].playerGUID` or `roster[*].playerGUID`. It merges genuine identical GUIDs even after a name change; if GUID isn't available, it uses exact full display names with ambiguous-name protections. Forever's two-part name should be exported in full as displayed; don't truncate to first name or treat the internal lowercase roster key as the actual display name. Do not fabricate persistent GUIDs.

## Priority 3 — Explicit dungeon group-loot semantics

Current v7 synthetic exports use normal PlusOne Main Spec / Off Spec / Transmog votes. For Dungeon Mode, add optional session-level `lootSystem` = `GROUP_LOOT` (or `PLUSONE` in managed guild raids). Preserve the original Need/Greed/Pass choice in `response` or participant `category` rather than recoding it as MS/OS; record the game-reported winner and numeric rolls when the Forever client exposes them. Example:

```json
{
  "session": {
    "sessionId":"stable-session-id",
    "sessionName":"The Deadmines",
    "lootSystem":"GROUP_LOOT",
    "awards":[{"entryId":"award-001","itemID":123,"recipient":"Raider Name","response":"NEED"}],
    "rollEvents":[{"contestId":"contest-001","itemID":123,"rolls":[{"player":"Raider Name","category":"NEED","value":71,"max":100,"won":true}]}]
  }
}
```

The updated website preserves `Need` and `Greed` distinctly **when** `GROUP_LOOT` is exported; otherwise the legacy parser maps their older equivalents to Main Spec/Off Spec for backward compatibility. If Blizzard's APIs only expose a partial group-loot outcome, export truthful partial data and do not invent missing rolls or winners.

## Priority 4 — Accurate session corrections and metadata

- Keep a unique stable `sessionId` across repeated exports of the same raid night, and stable nonnumeric `entryId`, `contestId` and `roundId` identifiers. The website deduplicates and updates corrected awards by `entryId`.
- Preserve `startedAt`, `endedAt`, `capturedAt`, class/race/character sex, observed per-session role, plusOnes, SoftRes consumption and original item hyperlink.
- If possible, include `instanceID` and `sessionKind: "DUNGEON" | "RAID"` in the future. They are useful for explicit filtering but not required to run the rebuilt site.
- Do not use an inspect-based fallback for raiders without the Raider Companion; the agreed architecture uses Raider data only.

## Handoff action

This is a **request for review and implementation by the separate addon agent**, not a claim that the addon has been modified. First validate each proposed source field against actual Forever APIs and the current stable Master/Raider code. Keep additive schema-compatible changes, avoid breaking existing client/server addon communication, and return a fixture JSON containing both a 20/40-person raid and a Dungeon Mode group-loot session for website regression testing.
