import {
  AGE, FLOOR, HOUR_SPAN, MINUTE, MONTH_SPAN, PEOPLE, readCounted, readDay, readMonth, readNumber, readTime, readTsu,
  STICK, TIMES, WEEK_SPAN, YEAR, YEN,
} from '../lib/numbers';
import type { Contrast, NumberCard } from './types';

/*
 * 數字卡：日期、年齡、量詞這些要硬記的念法，一張一個數字。
 * 陣列的順序就是加入的順序：日期 → 年齡 → 其他。念法盡量由 lib/numbers 算出來，不重複維護。
 */

const P2 = 102;
const P3 = 103;
const P4 = 104;
const L3 = 3;
const L4 = 4;
const L12 = 12;

/** [數字, 對照, 補充說明] */
type Row = [n: number, vs?: Contrast[], note?: string];

const group = (
  kind: string,
  unitId: number,
  show: (n: number) => string,
  zh: (n: number) => string,
  read: (n: number) => string[],
  rows: Row[],
): NumberCard[] => rows.map(([n, vs, note]) => ({ show: show(n), zh: zh(n), kind, readings: read(n), unitId, vs, note }));

const dates = group('日期', P3, (n) => `${n}日`, (n) => `${n} 號`, readDay, [
  [1, [['いちにち', '1 天', P3]], '「ついたち」只能當日期。'],
  [2, ['20日', '2つ']],
  [3, ['3つ']],
  [4, ['8日', '4つ']],
  [5, ['5つ']],
  [6, ['6つ']],
  [7, ['7つ']],
  [8, ['4日', '8つ']],
  [9, ['9つ']],
  [10, ['10']],
  [14, [], '不念じゅうよんにち，跟 4 號一樣是よっか。'],
  [17, [], '17 號習慣用「しち」。'],
  [19, [], '19 號習慣用「く」。'],
  [20, ['2日', '20歳']],
  [24, [], '不念にじゅうよんにち，跟 4 號一樣是よっか。'],
]);

const ages = group('年齡', P4, (n) => `${n}歳`, (n) => `${n} 歲`, (n) => readCounted(n, AGE), [
  [1, ['1階']],
  [8, ['8階']],
  [10, ['10階', '10日', '10']],
  [20, ['20日', '2日', '2つ']],
]);

const floors = group(
  '樓層',
  P4,
  (n) => `${n}階`,
  (n) => `${n} 樓`,
  // 3 階也有人念さんかい，但卡片只教さんがい，才分得出 3 次
  (n) => (n === 3 ? readCounted(n, FLOOR).slice(0, 1) : readCounted(n, FLOOR)),
  [
    [1, ['1歳']],
    [3, [['さんかい', '3 次', L12]], '也有人念さんかい，但先記さんがい。'],
    [6, [['ろくさい', '6 歲', P4]]],
    [8, ['8歳']],
    [10, ['10歳']],
  ],
);

const months = group('月份與年', P3, (n) => `${n}月`, (n) => `${n} 月`, readMonth, [
  [4, ['4日', '4時']],
  [7, ['7日', '7時']],
  [9, ['9日', '9時']],
]);

const years = group('月份與年', P3, (n) => `${n}年`, (n) => `${n} 年`, (n) => readCounted(n, YEAR), [
  [4, ['4月'], '不念よんねん。'],
]);

const BIG_ZH: Record<number, string> = { 300: '三百', 600: '六百', 800: '八百', 3000: '三千', 8000: '八千', 10000: '一萬' };

const bigNumbers = group('百千萬與日圓', P2, (n) => n.toLocaleString('en-US'), (n) => BIG_ZH[n], readNumber, [
  [300, ['3,000']],
  [600, [['ろくせん', '六千', P2]]],
  [800, ['8,000']],
  [3000, ['300']],
  [8000, ['800']],
  [10000, [['せん', '一千', P2], ['ひゃく', '一百', P2]], '一百、一千不加いち，一萬一定要加。'],
]);

const yen = group('百千萬與日圓', L3, (n) => `${n}円`, (n) => `${n} 日圓`, (n) => readCounted(n, YEN), [
  [4, [], '結尾的 4 念よ，不念よんえん；14 円也是じゅうよえん。'],
]);

const hours = group('幾點幾分', L4, (n) => `${n}時`, (n) => `${n} 點`, (n) => readTime(n, 0), [
  [4, ['4時間', '4月']],
  [7, ['7時間']],
  [9, ['9時間']],
]);

const minutes = group('幾點幾分', L4, (n) => `${n}分`, (n) => `${n} 分鐘`, (n) => readCounted(n, MINUTE), [
  [1, ['1本']],
  [3, ['3本']],
  [4, ['4時']],
  [6, ['6本']],
  [8, ['8本']],
  [10, ['10本']],
]);

const things = group('幾個（つ）', L12, (n) => (n === 10 ? '10' : `${n}つ`), (n) => `${n} 個`, readTsu, [
  [1, ['1人', '1日']],
  [2, ['2人', '2日']],
  [3, ['3日']],
  [4, ['8つ', '4日']],
  [5, ['5日']],
  [6, ['6日']],
  [7, ['7日']],
  [8, ['4つ', '8日']],
  [9, ['9日']],
  [10, ['10日'], '10 個沒有「つ」。'],
]);

const people = group('幾個人', L12, (n) => `${n}人`, (n) => `${n} 個人`, (n) => readCounted(n, PEOPLE), [
  [1, ['1つ']],
  [2, ['2つ']],
  [4, ['4つ'], '不念よんにん，也不念しにん。'],
]);

const sticks = group('幾支（本）', L12, (n) => `${n}本`, (n) => `${n} 支`, (n) => readCounted(n, STICK), [
  [1, ['1分']],
  [3, ['3分']],
  [6, ['6分']],
  [8, ['8分']],
  [10, ['10分']],
]);

const SAME_AS_FLOOR = '跟樓層同音，要靠前後文分辨。';

const times = group('幾次（回）', L12, (n) => `${n}回`, (n) => `${n} 次`, (n) => readCounted(n, TIMES), [
  [1, ['1階'], SAME_AS_FLOOR],
  [6, ['6階'], SAME_AS_FLOOR],
  [8, ['8階'], SAME_AS_FLOOR],
  [10, ['10階'], SAME_AS_FLOOR],
]);

const hourSpans = group('時間長度', L12, (n) => `${n}時間`, (n) => `${n} 小時`, (n) => readCounted(n, HOUR_SPAN), [
  [4, ['4時']],
  [7, ['7時']],
  [9, ['9時']],
]);

const weekSpans = group('時間長度', L12, (n) => `${n}週間`, (n) => `${n} 週`, (n) => readCounted(n, WEEK_SPAN), [
  [1],
  [8],
  [10],
]);

const monthSpans = group('時間長度', L12, (n) => `${n}か月`, (n) => `${n} 個月`, (n) => readCounted(n, MONTH_SPAN), [
  [1, [['いちがつ', '1 月', P3]]],
  [6, [['ろくがつ', '6 月', P3]]],
  [8, [['はちがつ', '8 月', P3]]],
  [10, [['じゅうがつ', '10 月', P3]]],
]);

export const numberCards: NumberCard[] = [
  ...dates, ...ages, ...floors, ...months, ...years, ...bigNumbers, ...yen, ...hours, ...minutes,
  ...things, ...people, ...sticks, ...times, ...hourSpans, ...weekSpans, ...monthSpans,
];
