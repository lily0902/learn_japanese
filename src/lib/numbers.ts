/**
 * 數字的讀音（預備課的規則）：數字練習用來出題、朗讀和比對答案
 * 每個函式都回傳「所有可接受的念法」，第一個是最常用的（朗讀用它）。
 */

type Readings = string[];

/** 把幾段念法接起來：[['じゅう'], ['なな', 'しち']] → ['じゅうなな', 'じゅうしち'] */
const join = (...parts: Readings[]): Readings =>
  parts.reduce<Readings>((acc, p) => acc.flatMap((a) => p.map((b) => a + b)), ['']);

const DIGIT = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];

/** 個位數接在別的數字後面（14、27、99） */
const ONES: Readings[] = DIGIT.map((d) => [d]);
ONES[7] = ['なな', 'しち'];
ONES[9] = ['きゅう', 'く'];

/** 十位數：40 よんじゅう、70 ななじゅう */
const TENS: Readings[] = DIGIT.map((d) => [d]);
TENS[1] = [''];
TENS[7] = ['なな', 'しち'];

/** 百、千的音變：300 さんびゃく、600 ろっぴゃく、800 はっぴゃく、3000 さんぜん、8000 はっせん */
const HUNDREDS: Readings[] = DIGIT.map((d) => [`${d}ひゃく`]);
HUNDREDS[0] = [''];
HUNDREDS[1] = ['ひゃく'];
HUNDREDS[3] = ['さんびゃく'];
HUNDREDS[6] = ['ろっぴゃく'];
HUNDREDS[8] = ['はっぴゃく'];

const THOUSANDS: Readings[] = DIGIT.map((d) => [`${d}せん`]);
THOUSANDS[0] = [''];
THOUSANDS[1] = ['せん'];
THOUSANDS[3] = ['さんぜん'];
THOUSANDS[8] = ['はっせん'];

/** 0–9999（0 的位數不念） */
function under10k(n: number): Readings {
  const t = Math.floor(n / 1000);
  const h = Math.floor(n / 100) % 10;
  const x = Math.floor(n / 10) % 10;
  const d = n % 10;
  return join(THOUSANDS[t], HUNDREDS[h], x ? join(TENS[x], ['じゅう']) : [''], ONES[d]);
}

/** 數字本身：0 ゼロ、4 よん／し、3600 さんぜんろっぴゃく、12000 いちまんにせん（到 9999 萬） */
export function readNumber(n: number): Readings {
  if (n === 0) return ['ゼロ', 'れい'];
  if (n === 4) return ['よん', 'し'];
  const man = Math.floor(n / 10000);
  // 「萬」前面的 1 一定要念：いちまん；1000 萬是いっせんまん
  let manPart = [''];
  if (man === 1) manPart = ['いちまん'];
  else if (man >= 1000 && man < 2000) manPart = join(['いっせん'], under10k(man % 1000), ['まん']);
  else if (man) manPart = join(under10k(man), ['まん']);
  return join(manPart, under10k(n % 10000));
}

/**
 * 數字＋量詞：個位數（或結尾的 10）跟量詞連在一起會變音
 * - last：結尾是 1–9 時，那個數字＋量詞的念法（沒寫的就是照念）
 * - ten：結尾是 10、20…90 時，「じゅう＋量詞」的念法
 * - only：整個數字的特殊念法（20 歳 はたち）
 */
interface Counter { s: string; last?: Partial<Record<number, Readings>>; ten?: Readings; only?: Record<number, Readings> }

export function readCounted(n: number, c: Counter): Readings {
  if (c.only?.[n]) return c.only[n];
  const d = n % 10;
  if (d) return join(n - d ? readNumber(n - d) : [''], c.last?.[d] ?? [DIGIT[d] + c.s]);
  if (n % 100) {
    const above = n - (n % 100);
    return join(above ? readNumber(above) : [''], TENS[Math.floor(n / 10) % 10], c.ten ?? [`じゅう${c.s}`]);
  }
  return join(readNumber(n), [c.s]);
}

/** 量詞前面的 4、7、9：用よん・なな・きゅう */
const plainLast = (s: string): Counter['last'] => ({ 4: [`よん${s}`], 7: [`なな${s}`], 9: [`きゅう${s}`] });

/** 4 円是「よえん」 */
export const YEN: Counter = { s: 'えん', last: { 4: ['よえん'], 7: ['ななえん', 'しちえん'], 9: ['きゅうえん'] } };

/** 1、8、10 歳變促音；20 歳是はたち */
export const AGE: Counter = {
  s: 'さい',
  last: { ...plainLast('さい'), 1: ['いっさい'], 8: ['はっさい'] },
  ten: ['じゅっさい', 'じっさい'],
  only: { 20: ['はたち', 'にじゅっさい', 'にじっさい'] },
};

/** 1、6、8、10 階變促音；3 階是さんがい */
export const FLOOR: Counter = {
  s: 'かい',
  last: { ...plainLast('かい'), 1: ['いっかい'], 3: ['さんがい', 'さんかい'], 6: ['ろっかい'], 8: ['はっかい', 'はちかい'] },
  ten: ['じゅっかい', 'じっかい'],
};

/** 分：1、3、4、6、8、10 念ぷん */
export const MINUTE: Counter = {
  s: 'ふん',
  last: {
    1: ['いっぷん'], 3: ['さんぷん'], 4: ['よんぷん'], 6: ['ろっぷん'],
    7: ['ななふん', 'しちふん'], 8: ['はっぷん', 'はちふん'], 9: ['きゅうふん'],
  },
  ten: ['じゅっぷん', 'じっぷん'],
};

export const ROOM: Counter = { s: 'ごうしつ', last: plainLast('ごうしつ') };
export const PLATFORM: Counter = { s: 'ばんせん', last: plainLast('ばんせん') };

const HOURS: Readings[] = [
  [], ['いちじ'], ['にじ'], ['さんじ'], ['よじ'], ['ごじ'], ['ろくじ'], ['しちじ', 'ななじ'],
  ['はちじ'], ['くじ'], ['じゅうじ'], ['じゅういちじ'], ['じゅうにじ'],
];

/** 9:30 → くじはん／くじさんじゅっぷん */
export function readTime(h: number, m: number): Readings {
  if (!m) return HOURS[h];
  return join(HOURS[h], m === 30 ? ['はん', ...readCounted(30, MINUTE)] : readCounted(m, MINUTE));
}

const MONTHS: Readings[] = [
  [], ['いちがつ'], ['にがつ'], ['さんがつ'], ['しがつ'], ['ごがつ'], ['ろくがつ'], ['しちがつ'],
  ['はちがつ'], ['くがつ'], ['じゅうがつ'], ['じゅういちがつ'], ['じゅうにがつ'],
];

/** 1–10 日、14 日、20 日、24 日是特殊念法；17、19 日習慣唸しち、く */
const DAYS: Readings[] = [
  [], ['ついたち'], ['ふつか'], ['みっか'], ['よっか'], ['いつか'], ['むいか'], ['なのか'], ['ようか'], ['ここのか'], ['とおか'],
];
const DAY_ONES: Readings[] = [...ONES];
DAY_ONES[7] = ['しち', 'なな'];
DAY_ONES[9] = ['く', 'きゅう'];
for (let d = 11; d <= 31; d++) {
  if (d === 14 || d === 24) DAYS[d] = [`${d === 24 ? 'に' : ''}じゅうよっか`];
  else if (d === 20) DAYS[d] = ['はつか'];
  else DAYS[d] = join(TENS[Math.floor(d / 10)], ['じゅう'], DAY_ONES[d % 10], ['にち']);
}

export const readMonth = (m: number) => MONTHS[m];
export const readDay = (d: number) => DAYS[d];
/** 10 月 17 日 → じゅうがつじゅうしちにち */
export const readDate = (m: number, d: number) => join(MONTHS[m], DAYS[d]);

/** 依 Date.getDay() 的順序：日、月、火、水、木、金、土 */
export const WEEKDAYS = [
  { jp: '日曜日[にちようび]', zh: '星期日' },
  { jp: '月曜日[げつようび]', zh: '星期一' },
  { jp: '火曜日[かようび]', zh: '星期二' },
  { jp: '水曜日[すいようび]', zh: '星期三' },
  { jp: '木曜日[もくようび]', zh: '星期四' },
  { jp: '金曜日[きんようび]', zh: '星期五' },
  { jp: '土曜日[どようび]', zh: '星期六' },
];
