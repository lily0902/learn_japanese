import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Jp } from '../components/Jp';
import { Hanko, useKey } from '../components/Misc';
import { SpeakButton } from '../components/SpeakButton';
import { QUESTIONS, SENTENCES, unitLabel, WORDS } from '../data';
import { shuffle } from '../lib/random';
import { speak } from '../lib/speech';
import { intervalLabel, nextInterval, newCard, type Card, type Grade } from '../lib/srs';
import { gradeWord, markReviewDone } from '../state/actions';
import { dueKeys, dueSentenceKeys, learnedCount, sentenceCount, wrongIds } from '../state/selectors';
import { getState, useAppState } from '../state/store';
import { Quiz } from '../quiz/Quiz';
import NumberDrill from './NumberDrill';

const GRADES: { g: Grade; label: string }[] = [
  { g: 0, label: '忘記了' },
  { g: 1, label: '有點難' },
  { g: 2, label: '記得' },
  { g: 3, label: '太簡單' },
];

function Crumbs() {
  return (
    <nav className="crumbs" aria-label="路徑">
      <Link to="/review"><Icon name="arrowLeft" className="ic-sm" />複習</Link>
    </nav>
  );
}

type Deck = 'word' | 'sentence';

/** 記得幾次以上的單字改成看中文想日文：先認得，再說得出來（忘記了就退回看日文） */
export const REVERSE_AFTER = 2;

/** 一張卡的正面與背面；produce = 看中文說日文 */
interface Face { produce: boolean; front: ReactNode; back: ReactNode; say: string; useKana: boolean }

function faceOf(key: string, card: Card): Face | null {
  const word = WORDS.get(key);
  if (word) {
    const { w, unit } = word;
    const jp = <Jp className="fc-jp" text={w[0]} />;
    const meta = <span className="fc-meta">{w[2] ? `${w[2]}・` : ''}{unitLabel(unit)}</span>;
    return card.r >= REVERSE_AFTER
      ? { produce: true, say: w[0], useKana: true, front: <><span className="fc-zh big">{w[1]}</span>{meta}</>, back: jp }
      : { produce: false, say: w[0], useKana: true, front: jp, back: <><span className="fc-zh">{w[1]}</span>{meta}</> };
  }
  const sen = SENTENCES.get(key);
  if (!sen) return null;
  return {
    produce: true,
    say: sen.jp,
    useKana: false,
    front: (
      <>
        <span className="fc-prompt">{sen.zh}</span>
        <span className="fc-meta">文法 <Jp text={sen.g.t} />・{unitLabel(sen.unit)}</span>
      </>
    ),
    back: <Jp className="fc-sentence" text={sen.jp} />,
  };
}

const DECK_COPY = {
  word: {
    none: '還沒有學過的單字。先完成一課的「單字」步驟吧！',
    empty: '目前沒有到期的單字卡，明天再來看看！',
    finished: '今天的單字卡複習完成了，記憶又更牢了。',
  },
  sentence: {
    none: '還沒有例句卡。讀完一課的「文法」步驟後，例句就會加入這裡。',
    empty: '目前沒有到期的例句卡，明天再來看看！',
    finished: '今天的例句卡說完了，開口又更順了。',
  },
};

/** 單字卡、例句卡：free=true 是單字的隨機練習（不影響複習排程） */
function Flashcards({ deck, free = false }: { deck: Deck; free?: boolean }) {
  const [queue, setQueue] = useState<string[]>(() => {
    const s = getState();
    if (deck === 'sentence') return shuffle(dueSentenceKeys(s));
    return free ? shuffle(Object.keys(s.srs).filter((k) => WORDS.has(k))).slice(0, 20) : shuffle(dueKeys(s));
  });
  const [total] = useState(queue.length);
  const [doneN, setDoneN] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);

  const key = queue[0];
  const card = key ? (getState().srs[key] ?? newCard()) : newCard();
  const face = key ? faceOf(key, card) : null;
  const copy = DECK_COPY[deck];

  const flip = () => {
    if (flipped || !face) return;
    setFlipped(true);
    void speak(face.say, face.useKana);
  };

  const grade = (g: Grade) => {
    if (!flipped || !key) return;
    if (!free) gradeWord(key, g);
    const rest = queue.slice(1);
    const nextQueue = g === 0 ? [...rest, key] : rest;
    if (g !== 0) setDoneN((n) => n + 1);
    setQueue(nextQueue);
    setFlipped(false);
    if (!nextQueue.length) {
      if (!free) markReviewDone();
      setFinished(true);
    }
  };

  useKey((e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); return; }
    const n = Number(e.key);
    if (!flipped) return;
    if (free && (n === 1 || n === 2)) grade(n === 1 ? 0 : 2);
    if (!free && n >= 1 && n <= 4) grade((n - 1) as Grade);
  }, !finished);

  if (total === 0) {
    const s = getState();
    const hasAny = (deck === 'sentence' ? sentenceCount(s) : learnedCount(s)) > 0;
    return (
      <>
        <Crumbs />
        <div className="card empty">
          <p>{hasAny ? copy.empty : copy.none}</p>
          <div className="btn-row center"><Link className="btn primary" to="/">回到今日任務</Link></div>
        </div>
      </>
    );
  }

  if (finished || !face) {
    return (
      <>
        <Crumbs />
        <div className="card result">
          <Hanko size="big" animate>おつかれ<br />さま</Hanko>
          <p className="score">{doneN}<small> 張</small></p>
          <p>{free ? '隨機練習完成！' : copy.finished}</p>
          <div className="btn-row">
            <Link className="btn" to="/review">回到複習</Link>
            <Link className="btn primary" to="/">回到今日任務</Link>
          </div>
        </div>
      </>
    );
  }

  const progress = total ? (doneN / (doneN + queue.length)) * 100 : 0;

  return (
    <>
      <Crumbs />
      <div className="fc-wrap">
        <div className="quiz-top">
          <span className="count">{free ? '隨機練習' : `剩下 ${queue.length} 張`}</span>
          <div className="bar" role="progressbar" aria-label="複習進度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button type="button" className={`fc ${flipped ? 'flipped' : ''}`} onClick={flip} aria-label={flipped ? '卡片背面' : '翻面看答案'}>
          {face.produce && <span className="fc-mode"><Icon name="mic" className="ic-sm" />看中文說日文</span>}
          {face.front}
          {flipped ? (
            <span className={face.produce ? 'fc-back answer' : 'fc-back'}>{face.back}</span>
          ) : (
            <span className="fc-tap">
              {face.produce ? '先用日文說出來，再點卡片或按空白鍵翻面' : '想一想意思，再點卡片或按空白鍵翻面'}
            </span>
          )}
        </button>
        {/* 看中文說日文的卡，翻面前先不給聽（會洩漏答案） */}
        {(!face.produce || flipped) && (
          <div className="btn-row center fc-speak">
            <SpeakButton text={face.say} useKana={face.useKana} />
          </div>
        )}
        {flipped && (
          free ? (
            <div className="grades two">
              <button type="button" className="grade g0" onClick={() => grade(0)}>不記得<small>1</small></button>
              <button type="button" className="grade g3" onClick={() => grade(2)}>記得<small>2</small></button>
            </div>
          ) : (
            <div className="grades">
              {GRADES.map(({ g, label }) => (
                <button key={g} type="button" className={`grade g${g}`} onClick={() => grade(g)}>
                  {label}
                  <small>{intervalLabel(nextInterval(card, g))}</small>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </>
  );
}

function WrongBook() {
  const [questions] = useState(() => shuffle(wrongIds(getState()).map((id) => QUESTIONS.get(id)!)));
  return (
    <>
      <Crumbs />
      <h1 className="page-title">錯題本</h1>
      <p className="page-sub">隔天以後再答對，題目才會從錯題本移除；答錯當天就答對的，明天會再考一次。</p>
      {questions.length ? (
        <Quiz questions={questions} showUnit footer={<Link className="btn primary" to="/review">回到複習</Link>} />
      ) : (
        <div className="card empty">錯題本是空的，太棒了！</div>
      )}
    </>
  );
}

function Overview() {
  const s = useAppState();
  const due = dueKeys(s).length;
  const learned = learnedCount(s);
  const sDue = dueSentenceKeys(s).length;
  const sLearned = sentenceCount(s);
  const wrongN = wrongIds(s).length;
  return (
    <>
      <h1 className="page-title">複習</h1>
      <p className="page-sub">間隔複習會在你快忘記的時候再出題：記得越熟，下次出現的間隔就越長。</p>
      <div className="review-cards">
        <section className="card">
          <h2><Icon name="layers" />單字卡</h2>
          <p className="big-num">{due}<small>張到期</small></p>
          <p className="card-sub">已學過 {learned} 個單字。記得兩次以上的單字，會改成看中文想日文。</p>
          {!learned && <p className="card-sub">完成任何一課的「單字」步驟後，單字就會加入這裡。</p>}
          <div className="btn-row">
            {due > 0 && <Link className="btn primary" to="/review/cards">開始複習</Link>}
            {learned > 0 && <Link className="btn" to="/review/free">隨機練習 20 張</Link>}
          </div>
        </section>
        <section className="card">
          <h2><Icon name="mic" />例句卡</h2>
          <p className="big-num">{sDue}<small>句到期</small></p>
          <p className="card-sub">已加入 {sLearned} 句。看中文說出整句日文，同時複習文法和口說。</p>
          {!sLearned && <p className="card-sub">讀完任何一課的「文法」步驟後，每個文法點會挑一句例句加入這裡。</p>}
          <div className="btn-row">
            {sDue > 0 && <Link className="btn primary" to="/review/sentences">開始說說看</Link>}
          </div>
        </section>
        <section className="card">
          <h2><Icon name="pencil" />錯題本</h2>
          <p className="big-num">{wrongN}<small>題</small></p>
          <p className="card-sub">練習時答錯的題目會收集在這裡，隔天以後答對就會移除。</p>
          <div className="btn-row">
            {wrongN > 0 && <Link className="btn primary" to="/review/wrong">開始練習</Link>}
          </div>
        </section>
        <section className="card">
          <h2><Icon name="headphones" />數字練習</h2>
          <p className="drill-preview" lang="ja" aria-hidden="true">
            {['1,280円', '9:30', '10月17日', '8階'].map((x) => <span key={x}>{x}</span>)}
          </p>
          <p className="card-sub">價錢、時間、日期、年齡與樓層，每次隨機出 10 題。聽日文寫數字，或看數字打念法。</p>
          <div className="btn-row">
            <Link className="btn primary" to="/review/numbers">開始練習</Link>
          </div>
        </section>
      </div>
    </>
  );
}

export default function Review() {
  const { mode } = useParams();
  if (mode === 'cards') return <Flashcards key="cards" deck="word" />;
  if (mode === 'free') return <Flashcards key="free" deck="word" free />;
  if (mode === 'sentences') return <Flashcards key="sentences" deck="sentence" />;
  if (mode === 'wrong') return <WrongBook />;
  if (mode === 'numbers') return <NumberDrill />;
  return <Overview />;
}
