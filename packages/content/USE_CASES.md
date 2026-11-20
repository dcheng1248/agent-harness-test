# content use cases

Status is `planned` or `implemented`. An `implemented` use case must be referenced by a test. Structure is in `ARCHITECTURE.md`. The text and data values live in `src/`.

| ID | Use case | Status |
|---|---|---|
| UC-CONTENT-001 | 九州地域資料：名稱、相鄰地域、歸屬與初始數值 | implemented |

## UC-CONTENT-001 Regions
- The nine home regions of 九州, each with a Chinese name, its adjacent regions, owner `PLAYER_OWNER`, and starting 民心, 人口 and 富庶. 關中 is the capital. Later slices add foreign regions with other owners.
- Adjacency follows real geography and is symmetric: if A lists B, B lists A. Every adjacent ID is a region in the list, and no region lists itself.

## Text rules
- Every `core` registry entry has text, enforced by the types.
- `eraNamePool` entries are original, and each passes `isValidEraName`.

## Formatting
Format functions in `src/format.ts` turn numbers and changes into player-facing text:
- `formatChineseNumber(n)` writes 1 to 199 in Chinese numerals, such as 十六 and 一百零五.
- `formatDate(eraName, reignYear, halfSeason)`, such as 「承平元年 春上」. Year 1 is 元.
- `formatAge(age)`, such as 「十六歲」.
- `formatAmount(n)` uses Arabic digits with `,` every three digits, and `−` (U+2212) for negatives.
- `formatChanges(changes)` lists stat changes with their labels and signs, in the given order, such as 「學識 +3，健康 −1」. An empty list gives the `noChange` text.
- `formatTaels(n)` is `formatAmount(n)` followed by the tael unit.
- `formatEconomy(report)` gives the tax income and the upkeep. The tax part appears only when `taxIncome` is above 0.
- `formatReign(years)`, such as 「在位十二年」. `formatLifespan(age)`, such as 「享年五十八歲」.
