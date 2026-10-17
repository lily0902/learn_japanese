import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Jp } from '../components/Jp';
import { CoverToggle } from '../components/Misc';
import { SpeakButton } from '../components/SpeakButton';
import { getUnit, taughtIn, TOPICS, unitLabel, UNITS } from '../data';
import type { Topic, Unit } from '../data/types';
import { normalize } from '../lib/kana';
import { kana, plain } from '../lib/ruby';
import { useAppState } from '../state/store';
import { VocabCard } from '../unit/VocabStep';

/** 一筆索引：出自哪一課（unitId）或哪個主題單字表（topic） */
interface Entry { unitId?: number; topic?: Topic; jp: string; zh: string; pos?: string; keys: string[] }
type Tab = 'grammar' | 'vocab' | 'topics';

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

const entry = (from: Pick<Entry, 'unitId' | 'topic'>, jp: string, zh: string, pos?: string): Entry => {
  const reading = normalize(kana(jp));
  const dict = dictionaryForm(reading, pos);
  return { ...from, jp, zh, pos, keys: dict ? [reading, dict] : [reading] };
};

const GRAMMAR: Entry[] = UNITS.flatMap((u) => u.grammar.map((g) => entry({ unitId: u.id }, g.t, g.m)));
const VOCAB: Entry[] = UNITS.flatMap((u) => u.vocab.map((w) => entry({ unitId: u.id }, w[0], w[1], w[2])));
const TOPIC_WORDS: Entry[] = TOPICS.flatMap((t) => t.words.map((w) => entry({ topic: t }, w[0], w[1], w[2])));
const ENTRIES: Record<Tab, Entry[]> = { grammar: GRAMMAR, vocab: VOCAB, topics: TOPIC_WORDS };
const TAB_NAME: Record<Tab, string> = { grammar: '文法', vocab: '單字', topics: '主題單字' };

function matches(e: Entry, q: string, nq: string) {
  if (!q) return true;
  return plain(e.jp).includes(q) || e.zh.includes(q) || (!!nq && e.keys.some((k) => k.includes(nq)));
}

/** 單字出自第幾課：連到那一課的單字步驟 */
function UnitLink({ u }: { u: Unit }) {
  return (
    <Link className="v-unit" to={`/unit/${u.id}/vocab`} onClick={(e) => e.stopPropagation()}>
      {unitLabel(u)}
    </Link>
  );
}

/** 一個主題的單字表 */
function TopicPage({ topic }: { topic: Topic }) {
  const { settings } = useAppState();
  const i = TOPICS.indexOf(topic);
  const prev = TOPICS[i - 1];
  const next = TOPICS[i + 1];
  return (
    <>
      <nav className="crumbs" aria-label="路徑">
        <Link to="/index/topics"><Icon name="arrowLeft" className="ic-sm" />主題單字</Link>
      </nav>
      <h1 className="page-title">{topic.name}</h1>
      <Jp as="p" ja={false} className="page-sub" text={topic.desc} />
      <div className="sec-head">
        <p className="hint">
          <span>{topic.words.length} 個字・點 <Icon name="volume" className="ic-sm" /> 聽發音。標著「第 N 課」的字，課程裡有教。</span>
        </p>
        <CoverToggle />
      </div>
      <ul className={`vocab-grid ${settings.hideZh ? 'zh-cover' : ''}`}>
        {topic.words.map((w) => {
          const u = taughtIn(w[0]);
          return <VocabCard key={w[0]} w={w} extra={u && <UnitLink u={u} />} />;
        })}
      </ul>
      <nav className="unit-pager" aria-label="上一個與下一個主題">
        {prev ? <Link className="btn ghost" to={`/index/topics/${prev.id}`}><Icon name="arrowLeft" />{prev.name}</Link> : <span />}
        {next && <Link className="btn ghost" to={`/index/topics/${next.id}`}>{next.name}<Icon name="arrowRight" /></Link>}
      </nav>
    </>
  );
}

function TopicGrid() {
  return (
    <ul className="topic-grid">
      {TOPICS.map((t) => (
        <li key={t.id}>
          <Link className="topic-tile" to={`/index/topics/${t.id}`}>
            <span className="topic-name">{t.name}</span>
            <span className="topic-sample" lang="ja">{t.words.slice(0, 3).map((w) => plain(w[0])).join('・')}</span>
            <span className="topic-count">{t.words.length} 個字</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function IndexPage() {
  const { tab, topic: topicId } = useParams();
  const navigate = useNavigate();
  const current: Tab = tab === 'vocab' || tab === 'topics' ? tab : 'grammar';
  const [query, setQuery] = useState('');
  const q = useDeferredValue(query.trim());

  const list = useMemo(() => {
    const nq = q ? normalize(q) : '';
    return ENTRIES[current].filter((e) => matches(e, q, nq));
  }, [current, q]);

  const topic = current === 'topics' ? TOPICS.find((t) => t.id === topicId) : undefined;
  if (topic) return <TopicPage topic={topic} />;
  const browsingTopics = current === 'topics' && !q;

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
        <button type="button" aria-pressed={current === 'topics'} onClick={() => navigate('/index/topics', { replace: true })}>
          主題 {TOPICS.length}
        </button>
      </div>
      <p className="hint" aria-live="polite">
        {browsingTopics
          ? `旅遊和日常的主題單字，共 ${TOPIC_WORDS.length} 個字。需要的時候查，不會加進單字卡。`
          : `找到 ${list.length} 筆`}
      </p>
      {browsingTopics ? (
        <TopicGrid />
      ) : list.length === 0 ? (
        <div className="card empty">找不到符合的{TAB_NAME[current]}，換個關鍵字試試看。</div>
      ) : (
        <ul className="idx-list">
          {list.map((e) => (
            <li key={`${e.unitId ?? e.topic!.id}-${e.jp}`}>
              <div className="idx-main">
                <Jp as="p" className="idx-jp" text={e.jp} />
                <p className="idx-zh">{e.zh}{e.pos && <span className="muted">・{e.pos}</span>}</p>
              </div>
              <div className="idx-side">
                {current !== 'grammar' && <SpeakButton text={e.jp} useKana />}
                {e.topic ? (
                  <Link className="idx-unit" to={`/index/topics/${e.topic.id}`}>{e.topic.name}</Link>
                ) : (
                  <Link className="idx-unit" to={`/unit/${e.unitId}/${current === 'vocab' ? 'vocab' : 'grammar'}`}>
                    {unitLabel(getUnit(e.unitId!)!)}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
