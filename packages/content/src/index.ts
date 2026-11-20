import type { GameText, UiText } from './schema';

export type { GameText, UiText } from './schema';
export {
  formatAge,
  formatChanges,
  formatChineseNumber,
  formatDate,
  formatLifespan,
  formatReign,
} from './format';

export const uiText: UiText = {
  gameTitle: '九重天子',
  titleImageAlt: '暮色中的紫禁城大殿',
  startButton: '登基',
  eraHeading: '擬定年號',
  eraPrompt: '請擇一年號，或自擬兩字年號。',
  eraInputLabel: '自擬年號',
  eraConfirm: '定年號',
  eraError: '年號須為兩個漢字。',
  mapHeading: '宮城',
  backToMap: '返回',
  continueButton: '繼續',
  summarySuffix: '總結',
  nextTurnPrefix: '進入',
  noChange: '諸項無變化',
  endingHeading: '駕崩',
  eraLabel: '年號',
  restartButton: '再開新局',
};

export const gameText: GameText = {
  statLabels: { health: '健康', learning: '學識', arts: '才藝', resolve: '魄力' },
  actionPointLabels: { dawn: '朝', noon: '午', dusk: '夕', night: '夜' },
  halfSeasonLabels: {
    'spring-early': '春上',
    'spring-late': '春下',
    'summer-early': '夏上',
    'summer-late': '夏下',
    'autumn-early': '秋上',
    'autumn-late': '秋下',
    'winter-early': '冬上',
    'winter-late': '冬下',
  },
  palaces: {
    chongwen: { name: '崇文館', description: '藏經史典籍之所，學士在此侍講。' },
    hanmo: { name: '翰墨軒', description: '筆墨丹青、琴韻棋聲，皆可在此修習。' },
    yanwu: { name: '演武場', description: '校場開闊，可馳馬挽弓，砥礪筋骨。' },
    qingong: { name: '寢宮', description: '天子起居之處，可閉目調息，養護龍體。' },
  },
  actions: {
    study: { name: '讀經史' },
    arts: { name: '習書畫琴棋' },
    riding: { name: '騎射' },
    rest: { name: '靜養' },
  },
  eraNamePool: [
    '承平', '景和', '永綏', '昭寧', '嘉穗', '鴻熙', '安瀾', '崇禧', '德輝', '清晏',
    '隆祚', '熙載', '紹元', '康衢', '泰寧', '明昶', '天祿', '文昭', '靖和', '瑞曦',
  ],
};
