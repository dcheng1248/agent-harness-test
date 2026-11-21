# content use cases

Status is `planned` or `implemented`. An `implemented` use case must be referenced by a test. Structure is in `ARCHITECTURE.md`. The text and data values live in `src/`.

| ID | Use case | Status |
|---|---|---|
| UC-CONTENT-001 | 地域資料：本朝九州與外國地域的名稱、輿圖格位、歸屬與初始數值 | implemented |
| UC-CONTENT-002 | 官員姓名庫與官位名稱 | implemented |
| UC-CONTENT-003 | 名臣名錄：歷代名臣的文武類型、四項屬性與登場門檻 | implemented |
| UC-CONTENT-004 | 營建工程名錄：歷代全國性工程的名稱、簡介、類別與所需工匠·半季 | implemented |
| UC-CONTENT-005 | 諸國名錄：本朝與契丹、吐蕃、高麗、南詔的名稱與輿圖顏色 | implemented |

## UC-CONTENT-001 Regions
- The list starts with the nine home regions of 九州, in their existing order, each with owner `PLAYER_OWNER`. 關中 is the capital, and it is the only region marked as a capital.
- Foreign regions follow, grouped by nation in the order of the nations list (UC-CONTENT-005): 契丹 has 8, 吐蕃 6, 高麗 3 and 南詔 2. Their owner is that nation's ID. Their names are historical place names that suit each power.
- Every region has a unique ID, a unique Chinese name, a grid cell, and starting 民心, 人口 and 富庶. Foreign regions use the same stats as home regions: 民心 and 富庶 fall within the range the home regions span, and their average 人口 is below the home regions' average.
- No two regions share a grid cell. Cells are whole numbers from 0 up. Empty cells between regions are allowed and stand for sea or wasteland.
- The layout follows rough real geography: the home regions sit in the middle and east, 契丹 north and northeast of them, 高麗 east of 契丹, 吐蕃 west, and 南詔 southwest. Each nation's regions form one connected block, connected through shared edges. 高麗 shares no edge with any home region.
- The starting home regions' total tax per collection is unchanged by the foreign regions, since foreign regions pay none.

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

## UC-CONTENT-004 營建工程
- `buildings` lists about twenty-five real historical national works, central to the capital or the whole realm and tied to no region, one per line, grouped by category. Each has a unique ID, a unique Chinese name, a one-line description, a category tag (a `BuildingCategory`), and its required manpower in 工匠·半季.
- Required manpower is a positive whole multiple of `BALANCE.works.step` and follows each work's scale: the largest, such as 長城, need about ten half-seasons of a large workforce, and the smallest can be finished in one half-season by one 徵召's worth of 工匠.
- There are no prerequisites between buildings.

## UC-CONTENT-005 Nations
- `nations` lists every owner a region can have, in legend order: the player's own realm first (ID `PLAYER_OWNER`, named 本朝), then 契丹, 吐蕃, 高麗 and 南詔.
- Each nation has a unique ID, a Chinese name and a map colour. Colours are distinct from each other, so each owner reads apart on the map.
- Every region's owner is the ID of a nation in this list, and every nation owns at least one region.
- Nations are data only. Nothing about them is in the game state, and they have no behaviour yet.

## Text rules
- Every `core` registry entry has text, enforced by the types.
- Every tax level in `TAX_LEVEL_IDS` has a name: 極輕, 輕, 平, 重, 極重.
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
- `formatEconomy(report)` gives the tax income and the upkeep. The tax part appears only when `taxIncome` is above 0. It leaves out the 工匠 and soldier wages, which have their own line.
- `formatWages(artisanWages, soldierWages)` gives the wages line: the 工匠 wages part (its label and the amount in taels, shown as a loss), then the soldier wages part (its own label, the same way), joined like the other lists. Each part appears only when it is above 0.
- `formatTrainingChange(amount)` gives the training line of the turn summary: the training label and the change with its sign, such as 「訓練 +2」. 0 is written with `+`.
- `formatArtisans(n)` is `formatAmount(n)` followed by the unit for persons.
- `formatReign(years)`, such as 「在位十二年」. `formatLifespan(age)`, such as 「享年五十八歲」.
