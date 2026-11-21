# Glossary

Domain terms used in code, docs and issues. Player-facing text is Traditional Chinese; code uses the English IDs in brackets.

| Term | Meaning |
|---|---|
| 早朝 (morning court) | The emperor's visit to 宣政殿. Open only at 朝, the first action point of a half-season, and spends that action point; holding 祭祀 there spends 午 too. At most one per half-season. |
| 官員 (official, `Official`) | A person in the emperor's service, with a name and four stats: 文治, 武功, 野心, 忠誠. Holds one 官位 or is 賦閑. |
| 官位 (post, `PostId`) | A position an official can hold: 中樞 (丞相, 大將軍, 太傅), 六部 (each 部's 尚書 and 侍郎), and 地方 (each player-owned region's 知州 and 總兵). Held by at most one official. |
| 賦閑 (idle) | An official who holds no 官位. Only 賦閑 officials can be appointed. |
| 名臣 (notable official, `NotableData`) | A famous minister or general from history, hand-written in `content` with a type (文, 武 or 文武), fixed stats and an entry gate on one emperor stat. Joins only through 舉薦 or 科舉, and can be at court only once at a time. Their names are reserved so generated officials never take them. |
| 舉薦 (recommendation, `recommend`) | 吏部's 舉薦人選: once per 早朝, one candidate is put forward, sometimes a 名臣, otherwise an ordinary official. Accepted, the candidate joins as 賦閑. A declined 名臣 can come again; a declined ordinary candidate cannot. |
| 科舉 (civil exam, `holdExam`) | 吏部's 開科取士: in every exam year (元年, then every few years), at one 早朝, a batch of candidates sits the exam. They lean civil and may include 文 or 文武 名臣. The emperor ticks the ones to accept, who join as 賦閑. The rest are discarded, and a declined 名臣 can come again. |
| 工匠 (artisan, `works.artisans`) | A worker the nation employs through 工部. Recruited by 徵召 (once per 早朝) and released by 遣散, always in steps of `BALANCE.works.step`. Each is idle or assigned to one building, and 國庫 pays every one a wage each half-season. Taken out of the free population. |
| 士兵 (soldier, `army.soldiers`) | The nation's one soldier count, not split by region, kept through 兵部. Added by 徵召士兵 (once per 早朝) and released by 解甲歸田, always in steps of `BALANCE.army.step`. 國庫 pays every one a wage (兵餉) each half-season. Taken out of the free population, like 工匠. |
| 訓練 (training, `army.training`) | How well drilled the army is, a whole number up to a cap. 操練軍隊 (`startDrill`) pays once and raises it each half-season for one year; new recruits lower it to the soldier-weighted average. It never decays. |
| 工匠·半季 (artisan half-season) | The unit of building work: one 工匠 working for one half-season. A building's required manpower is given in it: the number of 工匠 assigned times the half-seasons they work. |
| 稅率 (tax level, `revenue.taxLevel`) | 戶部's 調整賦稅: one national tax rate in five levels, 極輕, 輕, 平, 重, 極重. At each collection it scales every region's tax, and at the end of every half-season it changes every region's 民心: lighter levels collect less and raise 民心, heavier levels collect more and lower it. A new game starts at 平. |
| 額外徵稅 (extra levy, `levy`) | 戶部's one-off levy, once per 早朝: about half of one collection at the current tax rate goes into 國庫 at once, and every player region loses a large amount of 民心. |
| 營建 (construction, `assignArtisans`) | 工部's 營建工程: assigning 工匠 to a national building. Each half-season a building's progress grows by the 工匠 assigned to it, and it is 已落成 (completed) once progress reaches its required manpower. Its statuses are 未動工, 營建中 and 已落成. |
| 祭祀 (state sacrifice, `holdSacrifice`) | 禮部's rite, at most once per reign year, at any 早朝. It costs 國庫 and also spends 午, so leaving 早朝 puts the emperor at 夕. It is recorded for the rest of that reign year (`rites.sacrificeTurn`), for a later disaster system to read. |
