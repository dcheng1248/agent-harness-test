# Glossary

Domain terms used in code, docs and issues. Player-facing text is Traditional Chinese; code uses the English IDs in brackets.

| Term | Meaning |
|---|---|
| 早朝 (morning court) | The emperor's visit to 宣政殿. Open only at 朝, the first action point of a half-season, and spends that action point. At most one per half-season. |
| 官員 (official, `Official`) | A person in the emperor's service, with a name and four stats: 文治, 武功, 野心, 忠誠. Holds one 官位 or is 賦閑. |
| 官位 (post, `PostId`) | A position an official can hold: 中樞 (丞相, 大將軍, 太傅), 六部 (each 部's 尚書 and 侍郎), and 地方 (each player-owned region's 知州 and 總兵). Held by at most one official. |
| 賦閑 (idle) | An official who holds no 官位. Only 賦閑 officials can be appointed. |
| 名臣 (notable official, `NotableData`) | A famous minister or general from history, hand-written in `content` with a type (文, 武 or 文武), fixed stats and an entry gate on one emperor stat. Joins only through 舉薦, at most once per game. Their names are reserved so generated officials never take them. |
| 舉薦 (recommendation, `recommend`) | 吏部's 舉薦人選: once per 早朝, one candidate is put forward, sometimes a 名臣, otherwise an ordinary official. Accepted, the candidate joins as 賦閑. A declined 名臣 can come again; a declined ordinary candidate cannot. |
