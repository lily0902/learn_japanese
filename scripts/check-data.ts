/**
 * 檢查課程資料與核心邏輯：npm run check:data
 * - 振假名標記格式、讀音只能是假名
 * - 題目答案、選項、會話角色是否完整
 * - 羅馬拼音轉換、答案比對、同步合併
 * - 綜合測驗：每份都抽得出完整題數、單字題的選項與答案合理
 * - 數字讀音與數字練習：音變規則、隨機出的題目答案都對得上
 */
import { EXAMS, LESSONS, PREP, TOPICS, unitLabel, UNITS, WORDS } from '../src/data';
import type { Unit } from '../src/data/types';
import { matchAnswer, matchDigits, normalize, romaToKana } from '../src/lib/kana';
import {
  AGE, FLOOR, MINUTE, PLATFORM, readCounted, readDate, readNumber, readTime, ROOM, YEN,
} from '../src/lib/numbers';
import { KANJI_CLASS, kana, plain, rubyRe } from '../src/lib/ruby';
import { newCard } from '../src/lib/srs';
import { drawExam, examTotal, grammarPool, GRAMMAR_PER_UNIT, VOCAB_PER_UNIT } from '../src/quiz/exam';
import { DRILL_DIRS, DRILL_KINDS, DRILL_SIZE, drawDrill } from '../src/quiz/numberDrill';
import { emptyState, mergeStates, normalizeState } from '../src/state/merge';

const errors: string[] = [];
const warnings: string[] = [];
const err = (where: string, msg: string) => {
  const line = `✗ ${where}: ${msg}`;
  if (!errors.includes(line)) errors.push(line);
};

const KANJI = new RegExp(KANJI_CLASS);
const KANA_ONLY = /^[぀-ゟ゠-ヿー]+$/;

function checkText(where: string, s: string) {
  // 每個 [ 前面都要是漢字，且讀音只能是假名
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '[') {
      if (!KANJI.test(s[i - 1] ?? '')) err(where, `「[」前面不是漢字：…${s.slice(Math.max(0, i - 6), i + 6)}…`);
      const close = s.indexOf(']', i);
      if (close < 0) { err(where, `缺少「]」：${s}`); continue; }
      const reading = s.slice(i + 1, close);
      if (!KANA_ONLY.test(reading)) err(where, `讀音不是假名：[${reading}]`);
    }
  }
  if ((s.match(/\*\*/g) ?? []).length % 2) err(where, `**螢光筆** 沒有成對：${s}`);
}

/** 中文句子裡的振假名：列出來人工確認沒有把中文字吃進去 */
const zhRubyBases = new Map<string, string>();
function collectZhRuby(where: string, s: string) {
  for (const m of s.matchAll(rubyRe())) {
    if (m[1].length >= 3) zhRubyBases.set(`${m[1]}[${m[2]}]`, where);
  }
}

function walkUnit(u: Unit) {
  const at = (x: string) => `${unitLabel(u)} ${x}`;
  [u.title].forEach((t) => checkText(at('標題'), t));
  if (u.vocab.length < 10) warnings.push(`第${u.id}課 單字只有 ${u.vocab.length} 個`);
  u.vocab.forEach((w, i) => { checkText(at(`單字${i + 1}`), w[0]); if (!w[1]) err(at(`單字${i + 1}`), '缺中文'); });

  u.grammar.forEach((g, gi) => {
    const w = at(`文法${gi + 1}`);
    [g.t, g.f, ...g.d, ...g.ex.map((e) => e[0]), g.n ?? '', g.c?.q ?? '', ...(g.c?.o ?? [])].forEach((s) => checkText(w, s));
    [g.f, ...g.d, g.n ?? '', g.c?.q ?? ''].forEach((s) => collectZhRuby(w, s));
    if (g.ex.length < 2) warnings.push(`${w} 例句少於 2 句`);
    if (g.c && g.c.o.length < 2) err(w, '小試身手選項不足');
    if (g.c && new Set(g.c.o).size !== g.c.o.length) err(w, '小試身手有重複選項');
  });

  const d = u.dialogue;
  if (!d.roles[d.you]) err(at('會話'), `找不到你扮演的角色 ${d.you}`);
  d.lines.forEach((line, li) => {
    const w = at(`會話第${li + 1}句`);
    if (!d.roles[line[0]]) err(w, `未知角色 ${line[0]}`);
    if (Array.isArray(line[1])) {
      if (line[0] !== d.you) err(w, '選項台詞應該屬於你扮演的角色');
      if (line[1].length < 2) err(w, '選項不足');
      line[1].forEach((c, ci) => {
        checkText(w, c[0]);
        if (ci === 0 && !c[1]) err(w, '正確選項缺中文');
        if (ci > 0 && !c[2]) err(w, `錯誤選項 ${ci} 缺說明`);
      });
    } else {
      checkText(w, line[1]);
      if (!line[2]) err(w, '缺中文');
    }
  });

  u.practice.forEach((q, qi) => {
    const w = at(`練習${qi + 1}`);
    switch (q.t) {
      case 'c':
        checkText(w, q.q); q.o.forEach((o) => checkText(w, o));
        if (q.o.length < 2 || new Set(q.o).size !== q.o.length) err(w, '選項不足或重複');
        if (!q.q.includes('（　）') && !q.q.includes('？')) warnings.push(`${w} 題目沒有空格也不是問句`);
        break;
      case 'l':
        checkText(w, q.say);
        if (q.o.length < 2 || new Set(q.o).size !== q.o.length) err(w, '選項不足或重複');
        break;
      case 'o': {
        q.w.forEach((t) => checkText(w, t));
        if (q.w.length < 2) err(w, '詞塊太少');
        const key = (a: string[]) => [...a].sort().join('|');
        q.alt?.forEach((a) => { if (key(a) !== key(q.w)) err(w, '替代答案的詞塊跟正解不一樣'); });
        break;
      }
      case 'i':
        checkText(w, q.q); q.a.forEach((a) => checkText(w, a));
        if (!q.q.includes('（　）')) err(w, '打字題需要（　）空格');
        q.a.forEach((a) => {
          const k = normalize(kana(a));
          if (!/^[぀-ゟー]+$/.test(k)) err(w, `答案「${a}」無法用假名輸入（${k}）`);
          if (!matchAnswer(kana(a), q.a) || !matchAnswer(plain(a), q.a)) err(w, `答案自我比對失敗：${a}`);
        });
        break;
    }
  });
}

// ---- 課程結構 ----
const ids = LESSONS.map((u) => u.id);
if (ids.join() !== Array.from({ length: 30 }, (_, i) => i + 1).join()) err('課程', `課號不連續：${ids.join()}`);
if (PREP.map((u) => u.prep).join() !== '1,2,3,4,5') err('預備課', `編號應為 1–5：${PREP.map((u) => u.prep).join()}`);
if (PREP.some((u) => u.id !== 100 + u.prep!)) err('預備課', '預備課 N 的課號應為 100+N');
if (UNITS.slice(0, PREP.length).some((u) => !u.prep)) err('預備課', '預備課要排在第 1 課前面');
if (EXAMS.some((e) => e.units.some((u) => u.prep))) err('預備課', '預備課不應該出現在綜合測驗裡');
UNITS.forEach(walkUnit);

/** 刻意在兩課都教的單字（意思不同）：いただきます＝招呼語「我開動了」／敬語「吃、收下」 */
const TAUGHT_TWICE = new Set(['いただきます']);
const seen = new Map<string, string>();
for (const u of UNITS) {
  for (const w of u.vocab) {
    const k = w[0];
    if (seen.has(k) && !TAUGHT_TWICE.has(k)) warnings.push(`單字重複：${k}（${seen.get(k)}、${unitLabel(u)}）`);
    else seen.set(k, unitLabel(u));
  }
}

// ---- 主題單字表 ----
if (new Set(TOPICS.map((t) => t.id)).size !== TOPICS.length) err('主題', '主題代號重複');
const topicSeen = new Map<string, string>();
for (const t of TOPICS) {
  const at = `主題「${t.name}」`;
  if (!/^[a-z]+$/.test(t.id)) err(at, `代號只能用小寫英文：${t.id}`);
  if (!t.desc) err(at, '缺使用提示');
  checkText(at, t.desc);
  if (t.words.length < 10) warnings.push(`${at} 只有 ${t.words.length} 個字`);
  t.words.forEach((w, i) => {
    checkText(`${at} 第${i + 1}個`, w[0]);
    if (!w[1]) err(`${at} 第${i + 1}個`, '缺中文');
    if (topicSeen.has(w[0])) warnings.push(`主題單字重複：${w[0]}（${topicSeen.get(w[0])}、${t.name}）`);
    else topicSeen.set(w[0], t.name);
  });
}

// ---- 綜合測驗 ----
if (EXAMS.length !== 6) err('綜合測驗', `應該有 6 份，現在是 ${EXAMS.length} 份`);
for (const exam of EXAMS) {
  const where = `綜合測驗 ${exam.id}`;
  for (const u of exam.units) {
    if (grammarPool(u).length < GRAMMAR_PER_UNIT) err(where, `第${u.id}課的文法題不夠 ${GRAMMAR_PER_UNIT} 題`);
    if (u.vocab.length < VOCAB_PER_UNIT) err(where, `第${u.id}課的單字不夠 ${VOCAB_PER_UNIT} 個`);
  }
  // 隨機抽很多次，涵蓋各種題型組合
  for (let round = 0; round < 200; round++) {
    const qs = drawExam(exam);
    if (qs.length !== examTotal(exam)) err(where, `抽出 ${qs.length} 題，應為 ${examTotal(exam)} 題`);
    if (new Set(qs.map((q) => q.id)).size !== qs.length) err(where, '同一次抽到重複的題目');
    for (const u of exam.units) {
      const mine = qs.filter((q) => q.unitId === u.id);
      if (mine.filter((q) => !q.word).length !== GRAMMAR_PER_UNIT || mine.filter((q) => q.word).length !== VOCAB_PER_UNIT) {
        err(where, `第${u.id}課的題數分配不對`);
      }
    }
    for (const q of qs) {
      const at = `${where} ${q.id}`;
      if (q.word && !WORDS.has(q.word)) err(at, '單字題對應不到單字卡');
      if (q.word && (q.t === 'c' || q.t === 'l')) {
        if (q.o.length !== 4) err(at, `單字題選項只有 ${q.o.length} 個`);
        if (new Set(q.o).size !== q.o.length) err(at, `單字題選項重複：${q.o.join('／')}`);
      }
      if (q.t === 'i') {
        q.a.forEach((a) => {
          if (!/^[぀-ゟー]+$/.test(normalize(kana(a)))) err(at, `打字題答案無法用假名輸入：${a}`);
          if (!matchAnswer(kana(a), q.a) || !matchAnswer(plain(a), q.a)) err(at, `打字題答案自我比對失敗：${a}`);
        });
      }
    }
  }
}

// ---- 羅馬拼音 ----
const romaCases: [string, string][] = [
  ['konnichiha', 'こんにちは'], ['kitte', 'きって'], ['desu', 'です'], ['matte', 'まって'],
  ['kyou', 'きょう'], ['nannin', 'なんにん'], ['shinbun', 'しんぶん'], ['honn', 'ほん'],
  ['jaarimasen', 'じゃありません'], ['tsukue', 'つくえ'], ['gakkou', 'がっこう'], ['kon\'ya', 'こんや'],
  ['ko-hi-', 'こーひー'], ['matcha', 'まっちゃ'], ['sen\'en', 'せんえん'], ['benkyou', 'べんきょう'],
];
for (const [input, want] of romaCases) {
  const got = romaToKana(input, true);
  if (got !== want) err('羅馬拼音', `${input} → ${got}（應為 ${want}）`);
}
if (romaToKana('hon') !== 'ほn') err('羅馬拼音', '輸入中途的 n 不應該馬上變成ん');
if (!matchAnswer('コーヒー', ['こーひー'])) err('答案比對', '片假名應該等於平假名');
if (!matchAnswer(' desu。', ['です'])) err('答案比對', '應忽略空白與標點');
if (!matchAnswer('待って', ['待[ま]って'])) err('答案比對', '漢字答案應該可以通過');

// ---- 數字讀音 ----
const readingCases: [string, string[], string][] = [
  ['0', readNumber(0), 'ゼロ'], ['4', readNumber(4), 'よん'], ['14', readNumber(14), 'じゅうよん'],
  ['40', readNumber(40), 'よんじゅう'], ['99', readNumber(99), 'きゅうじゅうきゅう'],
  ['300', readNumber(300), 'さんびゃく'], ['600', readNumber(600), 'ろっぴゃく'], ['800', readNumber(800), 'はっぴゃく'],
  ['3000', readNumber(3000), 'さんぜん'], ['8000', readNumber(8000), 'はっせん'], ['1500', readNumber(1500), 'せんごひゃく'],
  ['10000', readNumber(10000), 'いちまん'], ['12000', readNumber(12000), 'いちまんにせん'],
  ['120000', readNumber(120000), 'じゅうにまん'], ['10000000', readNumber(10000000), 'いっせんまん'],
  ['4円', readCounted(4, YEN), 'よえん'], ['14円', readCounted(14, YEN), 'じゅうよえん'],
  ['150円', readCounted(150, YEN), 'ひゃくごじゅうえん'], ['3600円', readCounted(3600, YEN), 'さんぜんろっぴゃくえん'],
  ['1歳', readCounted(1, AGE), 'いっさい'], ['8歳', readCounted(8, AGE), 'はっさい'], ['10歳', readCounted(10, AGE), 'じゅっさい'],
  ['20歳', readCounted(20, AGE), 'はたち'], ['28歳', readCounted(28, AGE), 'にじゅうはっさい'], ['30歳', readCounted(30, AGE), 'さんじゅっさい'],
  ['1階', readCounted(1, FLOOR), 'いっかい'], ['3階', readCounted(3, FLOOR), 'さんがい'], ['6階', readCounted(6, FLOOR), 'ろっかい'],
  ['10階', readCounted(10, FLOOR), 'じゅっかい'], ['13階', readCounted(13, FLOOR), 'じゅうさんがい'],
  ['806号室', readCounted(806, ROOM), 'はっぴゃくろくごうしつ'], ['4番線', readCounted(4, PLATFORM), 'よんばんせん'],
  ['1分', readCounted(1, MINUTE), 'いっぷん'], ['20分', readCounted(20, MINUTE), 'にじゅっぷん'],
  ['9:30', readTime(9, 30), 'くじはん'], ['4:10', readTime(4, 10), 'よじじゅっぷん'], ['7:00', readTime(7, 0), 'しちじ'],
  ['4/1', readDate(4, 1), 'しがつついたち'], ['10/17', readDate(10, 17), 'じゅうがつじゅうしちにち'],
  ['5/20', readDate(5, 20), 'ごがつはつか'], ['7/24', readDate(7, 24), 'しちがつにじゅうよっか'],
  ['9/19', readDate(9, 19), 'くがつじゅうくにち'], ['12/31', readDate(12, 31), 'じゅうにがつさんじゅういちにち'],
];
for (const [label, got, want] of readingCases) {
  if (got[0] !== want) err('數字讀音', `${label} → ${got.join('／')}（應為 ${want}）`);
}
if (!readNumber(7).includes('しち') || !readCounted(20, AGE).includes('にじゅっさい')) err('數字讀音', '另一種念法也要算對');
if (readCounted(9, AGE).includes('くさい')) err('數字讀音', '9 歲不能念くさい');

const digitCases: [string, string, boolean][] = [
  ['3,600', '3600', true], ['３６００円', '3600', true], ['9時30分', '9:30', true], ['9時半', '9:30', true],
  ['09:05', '9:05', true], ['10月17日', '10/17', true], ['0', '0', true], ['', '0', false],
  ['36', '3600', false], ['9:03', '9:30', false], ['1017', '10/17', false],
];
for (const [input, answer, want] of digitCases) {
  if (matchDigits(input, [answer]) !== want) err('數字比對', `「${input}」對「${answer}」應該${want ? '算對' : '算錯'}`);
}

// ---- 數字練習 ----
for (const { key: kind } of DRILL_KINDS) {
  for (const { key: dir } of DRILL_DIRS) {
    const where = `數字練習 ${kind}/${dir}`;
    for (let round = 0; round < 300; round++) {
      const qs = drawDrill(kind, dir);
      if (qs.length !== DRILL_SIZE) err(where, `只出了 ${qs.length} 題`);
      if (new Set(qs.map((q) => q.id)).size !== qs.length) err(where, '題目 id 重複');
      for (const q of qs) {
        if (q.t === 'l') {
          checkText(where, q.say);
          if (q.o.length !== 4 || new Set(q.o).size !== 4) err(where, `聽力題選項不對：${q.o.join('／')}`);
        } else if (q.t === 'i' && q.num) {
          if (!q.say || !KANA_ONLY.test(q.say)) err(where, `朗讀的內容應該是假名：${q.say}`);
          if (!q.a.length || q.a.some((a) => !matchDigits(a, q.a))) err(where, `數字答案自我比對失敗：${q.a.join('／')}`);
        } else if (q.t === 'i') {
          q.a.forEach((a) => {
            checkText(where, a);
            if (!/^[぀-ゟー]+$/.test(normalize(kana(a)))) err(where, `答案無法用假名輸入：${a}`);
            if (!matchAnswer(kana(a), q.a)) err(where, `答案自我比對失敗：${a}`);
          });
        } else err(where, `不該出現的題型：${q.t}`);
      }
    }
  }
}

// ---- 同步合併 ----
{
  const a = emptyState();
  const b = emptyState();
  a.units['1'] = { vocab: 100, grammar: 200 };
  b.units['1'] = { vocab: 50, dialogue: 300, practice: { best: 6, total: 8, t: 400 }, done: '2026-09-01' };
  a.units['2'] = { vocab: 10 };
  a.srs['1|x'] = { ...newCard(), t: 1, i: 1 };
  b.srs['1|x'] = { ...newCard(), t: 2, i: 5 };
  a.wrong['1-0'] = { n: 1, t: 5 };
  b.wrong['1-0'] = { n: 1, t: 9, cleared: true };
  b.settings = { ...b.settings, furi: false, t: 10 };
  const m = mergeStates(a, b);
  if (m.units['1'].vocab !== 50) err('合併', '步驟時間應取最早');
  if (m.units['1'].grammar !== 200 || m.units['1'].dialogue !== 300) err('合併', '兩邊的步驟都要保留');
  if (m.units['1'].done !== '2026-09-01' || !m.units['2']) err('合併', '完成紀錄與課程要保留');
  if (m.srs['1|x'].i !== 5) err('合併', '單字卡應取較新的');
  if (!m.wrong['1-0'].cleared) err('合併', '錯題應取較新的狀態');
  if (m.settings.furi !== false) err('合併', '設定應取較新的');
  const again = mergeStates(m, a);
  if (JSON.stringify(again.units) !== JSON.stringify(m.units)) err('合併', '重複合併結果應該一致');
}
{
  const a = emptyState();
  const b = emptyState();
  a.exams['1'] = { best: 20, total: 30, skipped: 500 };
  b.exams['1'] = { best: 26, total: 30, passed: '2026-10-02' };
  a.exams['2'] = { best: 25, total: 30, passed: '2026-10-05' };
  b.exams['2'] = { best: 28, total: 30, passed: '2026-10-09' };
  a.days['2026-10-02'] = { rev: 1 };
  b.days['2026-10-02'] = { exam: 2 };
  const m = mergeStates(a, b);
  if (m.exams['1'].best !== 26 || m.exams['1'].passed !== '2026-10-02') err('合併', '測驗分數應取高的、合格日期要保留');
  if (m.exams['1'].skipped !== 500) err('合併', '任一邊按過跳過就算跳過');
  if (m.exams['2'].best !== 28 || m.exams['2'].passed !== '2026-10-05') err('合併', '測驗合格日期應取最早');
  if (m.days['2026-10-02'].rev !== 1 || m.days['2026-10-02'].exam !== 2) err('合併', '每日紀錄的複習與測驗都要保留');
  if (JSON.stringify(mergeStates(m, b).exams) !== JSON.stringify(m.exams)) err('合併', '測驗重複合併結果應該一致');
  if (!normalizeState({ units: {} }).exams) err('合併', '舊資料沒有 exams 也要能讀');
}

// ---- 報告 ----
const stats = {
  課數: LESSONS.length,
  預備課: PREP.length,
  主題單字: TOPICS.reduce((n, t) => n + t.words.length, 0),
  單字: UNITS.reduce((n, u) => n + u.vocab.length, 0),
  文法: UNITS.reduce((n, u) => n + u.grammar.length, 0),
  例句: UNITS.reduce((n, u) => n + u.grammar.reduce((k, g) => k + g.ex.length, 0), 0),
  練習題: UNITS.reduce((n, u) => n + u.practice.length, 0),
  綜合測驗: EXAMS.length,
  會話台詞: UNITS.reduce((n, u) => n + u.dialogue.lines.length, 0),
};
console.log('內容統計', stats);
if (zhRubyBases.size) {
  console.log('\n中文說明裡的長振假名（請確認沒有吃到中文字）：');
  for (const [k, w] of zhRubyBases) console.log(`  ${k}  ← ${w}`);
}
if (warnings.length) console.log(`\n提醒（${warnings.length}）：\n  ${warnings.join('\n  ')}`);
if (errors.length) {
  console.error(`\n錯誤（${errors.length}）：\n${errors.join('\n')}`);
  process.exit(1);
}
console.log('\n✓ 全部檢查通過');
