/**
 * 檢查課程資料與核心邏輯：npm run check:data
 * - 振假名標記格式、讀音只能是假名
 * - 題目答案、選項、會話角色是否完整
 * - 羅馬拼音轉換、答案比對、同步合併
 */
import { UNITS } from '../src/data';
import type { Unit } from '../src/data/types';
import { matchAnswer, normalize, romaToKana } from '../src/lib/kana';
import { KANJI_CLASS, kana, plain, rubyRe } from '../src/lib/ruby';
import { newCard } from '../src/lib/srs';
import { emptyState, mergeStates } from '../src/state/merge';

const errors: string[] = [];
const warnings: string[] = [];
const err = (where: string, msg: string) => errors.push(`✗ ${where}: ${msg}`);

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
  const at = (x: string) => `第${u.id}課 ${x}`;
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
const ids = UNITS.map((u) => u.id);
if (ids.join() !== Array.from({ length: 30 }, (_, i) => i + 1).join()) err('課程', `課號不連續：${ids.join()}`);
UNITS.forEach(walkUnit);

const seen = new Map<string, number>();
for (const u of UNITS) {
  for (const w of u.vocab) {
    const k = w[0];
    if (seen.has(k)) warnings.push(`單字重複：${k}（第${seen.get(k)}課、第${u.id}課）`);
    else seen.set(k, u.id);
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

// ---- 報告 ----
const stats = {
  課數: UNITS.length,
  單字: UNITS.reduce((n, u) => n + u.vocab.length, 0),
  文法: UNITS.reduce((n, u) => n + u.grammar.length, 0),
  例句: UNITS.reduce((n, u) => n + u.grammar.reduce((k, g) => k + g.ex.length, 0), 0),
  練習題: UNITS.reduce((n, u) => n + u.practice.length, 0),
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
