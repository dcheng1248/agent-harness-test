# content

Owns Traditional Chinese text and event data. `src/schema.ts` defines the shapes other modules rely on.

Data flow: content is plain data and text formatting, read by `web`. Text for `core` registries is keyed by the `core` IDs (`StatId`, `PalaceId`, `ActionId`, `ActionPointId`, `HalfSeasonId`), with `Record<Id, …>` types, so a new registry entry without text fails the type check.

```mermaid
flowchart LR
  core -->|IDs and types| content
  content -->|uiText, gameText, format functions| web
```

## UiText
Screen labels and fixed lines:

| Key | Text |
|---|---|
| `gameTitle`, `titleImageAlt`, `startButton` | unchanged (`startButton` is 登基) |
| `eraHeading` | 擬定年號 |
| `eraPrompt` | 請擇一年號，或自擬兩字年號。 |
| `eraInputLabel` | 自擬年號 |
| `eraConfirm` | 定年號 |
| `eraError` | 年號須為兩個漢字。 |
| `mapHeading` | 宮城 |
| `backToMap` | 返回 |
| `continueButton` | 繼續 |
| `summarySuffix` | 總結 (the summary heading is the half-season plus this, such as 春上總結) |
| `nextTurnPrefix` | 進入 (the button reads 進入春下) |
| `noChange` | 諸項無變化 |
| `endingHeading` | 駕崩 |
| `eraLabel` | 年號 |
| `restartButton` | 再開新局 |

`placeholderHeading` and `placeholderBody` are removed with the placeholder game screen.

## GameText
`gameText` holds text for `core` registries and the 年號 pool:
- `statLabels`: 健康, 學識, 才藝, 魄力
- `actionPointLabels`: 朝, 午, 夕, 夜
- `halfSeasonLabels`: 春上, 春下, 夏上, 夏下, 秋上, 秋下, 冬上, 冬下
- `palaces`: a `name` and a one-line `description` for 崇文館, 翰墨軒, 演武場 and 寢宮
- `actions`: a `name` for 讀經史, 習書畫琴棋, 騎射 and 靜養
- `eraNamePool`: 20 original two-character 年號, each passing `isValidEraName`

## Format functions
`src/format.ts`, pure:
- `formatChineseNumber(n)` for 1 to 199: 一, 十, 十六, 二十, 六十八, 一百, 一百零五, 一百一十.
- `formatDate(eraName, reignYear, halfSeason)`: 「承平元年 春上」, 「承平二年 夏下」. Year 1 is 元.
- `formatAge(age)`: 「十六歲」.
- `formatChanges(changes)`: 「學識 +3，健康 −1」. Uses the stat labels, `+` and `−` (U+2212), and `，` between items, in the given order. An empty list gives `noChange`.
- `formatReign(years)`: 「在位十二年」. `formatLifespan(age)`: 「享年五十八歲」.
