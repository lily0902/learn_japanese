import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Jp } from '../components/Jp';
import { SpeakButton } from '../components/SpeakButton';
import { UNITS } from '../data';
import { normalize } from '../lib/kana';
import { kana, plain } from '../lib/ruby';

interface Entry { unitId: number; jp: string; zh: string; pos?: string; keys: string[] }

const I_TO_U: Record<string, string> = { い: 'う', き: 'く', ぎ: 'ぐ', し: 'す', ち: 'つ', に: 'ぬ', び: 'ぶ', み: 'む', り: 'る' };

/** 單字以ます形收錄，另外算出辭書形，讓「taberu／たべる」也查得到「食べます」 */
function dictionaryForm(masu: string, pos = ''): string | null {
  if (!pos.startsWith('動詞') || !masu.endsWith('ます')) return null;
  const stem = masu.slice(0, -2);
  if (pos.startsWith('動詞Ⅲ')) {
    if (stem.endsWith('し')) return `${stem.slice(0, -1)}する`;
    if (stem.endsWith('き')) return `${stem.slice(0, -1)}くる`;
    return null;
  }
  if (pos.startsWith('動詞Ⅱ')) return `${stem}る`;
  if (/(しゃ|さ)い$/.test(stem)) return `${stem.slice(0, -1)}る`; // いらっしゃる、なさる
  const u = I_TO_U[stem.slice(-1)];
  return u ? stem.slice(0, -1) + u : null;
}

const entry = (unitId: number, jp: string, zh: string, pos?: string): Entry => {
  const reading = normalize(kana(jp));
  const dict = dictionaryForm(reading, pos);
  return { unitId, jp, zh, pos, keys: dict ? [reading, dict] : [reading] };
};

const GRAMMAR: Entry[] = UNITS.flatMap((u) => u.grammar.map((g) => entry(u.id, g.t, g.m)));
const VOCAB: Entry[] = UNITS.flatMap((u) => u.vocab.map((w) => entry(u.id, w[0], w[1], w[2])));

function matches(e: Entry, q: string, nq: string) {
  if (!q) return true;
  return plain(e.jp).includes(q) || e.zh.includes(q) || (!!nq && e.keys.some((k) => k.includes(nq)));
}

export default function IndexPage() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const current = tab === 'vocab' ? 'vocab' : 'grammar';
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query.trim());

  const list = useMemo(() => {
    const nq = q ? normalize(q) : '';
    return (current === 'vocab' ? VOCAB : GRAMMAR).filter((e) => matches(e, q, nq));
  }, [current, q]);

  return (
    <>
      <h1 className="page-title">索引</h1>
      <p className="page-sub">像參考書最後面的索引，可以用日文、假名、羅馬拼音或中文查。</p>
      <div className="search">
        <Icon name="search" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例如：たべる、taberu、吃、〜ています"
          aria-label="搜尋文法或單字"
        />
      </div>
      <div className="seg" role="group" aria-label="類別">
        <button type="button" aria-pressed={current === 'grammar'} onClick={() => navigate('/index/grammar', { replace: true })}>
          文法 {GRAMMAR.length}
        </button>
        <button type="button" aria-pressed={current === 'vocab'} onClick={() => navigate('/index/vocab', { replace: true })}>
          單字 {VOCAB.length}
        </button>
      </div>
      <p className="hint" aria-live="polite">找到 {list.length} 筆</p>
      {list.length === 0 ? (
        <div className="card empty">找不到符合的{current === 'vocab' ? '單字' : '文法'}，換個關鍵字試試看。</div>
      ) : (
        <ul className="idx-list">
          {list.map((e) => (
            <li key={`${e.unitId}-${e.jp}`}>
              <div className="idx-main">
                <Jp as="p" className="idx-jp" text={e.jp} />
                <p className="idx-zh">{e.zh}{e.pos && <span className="muted">・{e.pos}</span>}</p>
              </div>
              <div className="idx-side">
                {current === 'vocab' && <SpeakButton text={e.jp} useKana />}
                <Link className="idx-unit" to={`/unit/${e.unitId}/${current === 'vocab' ? 'vocab' : 'grammar'}`}>
                  第 {e.unitId} 課
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
