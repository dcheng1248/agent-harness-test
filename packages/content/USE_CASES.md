# content use cases

Status is `planned` or `implemented`. An `implemented` use case must be referenced by a test. Structure is in `ARCHITECTURE.md`. The text and data values live in `src/`.

| ID | Use case | Status |
|---|---|---|
| UC-CONTENT-001 | 九州地域資料：名稱、相鄰地域、歸屬與初始數值 | implemented |
| UC-CONTENT-002 | 官員姓名庫與官位名稱 | implemented |
| UC-CONTENT-003 | 名臣名錄：歷代名臣的文武類型、四項屬性與登場門檻 | implemented |

## UC-CONTENT-001 Regions
- The nine home regions of 九州, each with a Chinese name, its adjacent regions, owner `PLAYER_OWNER`, and starting 民心, 人口 and 富庶. 關中 is the capital. Later slices add foreign regions with other owners.
- Adjacency follows real geography and is symmetric: if A lists B, B lists A. Every adjacent ID is a region in the list, and no region lists itself.

## UC-CONTENT-002 Official names and post names
- `officialNames` holds a large pool of surnames and of male given names, each a short run of Han characters with no repeats. A full name is surname + given name. The pool is far larger than the number of officials a game needs.
- `officialNames.reserved` lists full names that must never be generated: exactly the names in the 名臣 list (UC-CONTENT-003).
- Region IDs never equal a 部 ID or a central post ID, so post IDs stay unique.
- `formatPostName(post)` gives a post's full name: a central post's own name (such as 丞相); a 部 post as the 部's full name plus its rank (such as 吏部尚書); a region post as the region's name plus its office (such as 關中知州).

## UC-CONTENT-003 名臣
- `notables` lists about sixty famous ministers and generals from across Chinese history, in historical order, one per line. Each has a unique ID, a unique name, a type (文, 武 or 文武), four official stats, and an entry gate on one emperor stat.
- Stats follow each person's historical reputation: 文 名臣 are strong in 文治, 武 名臣 in 武功, and 文武 名臣 in both. A few who are remembered for seizing or abusing power have high 野心 and lower 忠誠. Every stat is within its `STAT_REGISTRY` bounds.
- Gates are a minimum on one emperor stat, mostly 學識 for 文 and 魄力 for 武. Some gates are low enough that a 名臣 can appear early in a reign.
- No 名臣 name can be generated as an ordinary official's name.

## Text rules
- Every `core` registry entry has text, enforced by the types.
- Every palace has a description except 宣政殿, which has no panel to show one.
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
