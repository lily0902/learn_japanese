import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Jp } from '../components/Jp';
import { Hanko, shuffle, useKey } from '../components/Misc';
import { SpeakButton } from '../components/SpeakButton';
import { QUESTIONS, WORDS } from '../data';
import { speak } from '../lib/speech';
import { intervalLabel, nextInterval, newCard, type Grade } from '../lib/srs';
import { gradeWord, markReviewDone } from '../state/actions';
import { dueKeys, learnedCount, wrongIds } from '../state/selectors';
import { getState, useAppState } from '../state/store';
import { Quiz } from '../quiz/Quiz';

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

/** 單字卡：free=true 是隨機練習（不影響複習排程） */
function Flashcards({ free }: { free: boolean }) {
  const [queue, setQueue] = useState<string[]>(() => {
    const s = getState();
    return free ? shuffle(Object.keys(s.srs).filter((k) => WORDS.has(k))).slice(0, 20) : shuffle(dueKeys(s));
  });
  const [total] = useState(queue.length);
  const [doneN, setDoneN] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);

  const key = queue[0];
  const entry = key ? WORDS.get(key) : undefined;
  const card = key ? (getState().srs[key] ?? newCard()) : newCard();

  const flip = () => {
    if (flipped || !entry) return;
    setFlipped(true);
    void speak(entry.w[0], true);
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
    return (
      <>
        <Crumbs />
        <div className="card empty">
          <p>{free ? '還沒有學過的單字。先完成一課的「單字」步驟吧！' : '目前沒有到期的單字卡，明天再來看看！'}</p>
          <div className="btn-row center"><Link className="btn primary" to="/">回到今日任務</Link></div>
        </div>
      </>
    );
  }

  if (finished || !entry) {
    return (
      <>
        <Crumbs />
        <div className="card result">
          <Hanko size="big" animate>おつかれ<br />さま</Hanko>
          <p className="score">{doneN}<small> 張</small></p>
          <p>{free ? '隨機練習完成！' : '今天的單字卡複習完成了，記憶又更牢了。'}</p>
          <div className="btn-row">
            <Link className="btn" to="/review">回到複習</Link>
            <Link className="btn primary" to="/">回到今日任務</Link>
          </div>
        </div>
      </>
    );
  }

  const { w, unit } = entry;
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
        <button type="button" className={`fc ${flipped ? 'flipped' : ''}`} onClick={flip} aria-label={flipped ? '單字卡背面' : '翻面看答案'}>
          <Jp className="fc-jp" text={w[0]} as="div" />
          {flipped ? (
            <div className="fc-back">
              <div className="fc-zh">{w[1]}</div>
              <div className="fc-meta">{w[2] ? `${w[2]}・` : ''}第 {unit.id} 課</div>
            </div>
          ) : (
            <p className="fc-tap">想一想意思，再點卡片或按空白鍵翻面</p>
          )}
        </button>
        <div className="btn-row center fc-speak">
          <SpeakButton text={w[0]} useKana />
        </div>
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
      <p className="page-sub">答對的題目會從錯題本移除。</p>
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
  const wrongN = wrongIds(s).length;
  return (
    <>
      <h1 className="page-title">複習</h1>
      <p className="page-sub">間隔複習會在你快忘記的時候再出題：記得越熟，下次出現的間隔就越長。</p>
      <div className="review-cards">
        <section className="card">
          <h2><Icon name="layers" />單字卡</h2>
          <p className="big-num">{due}<small>張到期</small></p>
          <p className="card-sub">已學過 {learned} 個單字</p>
          {!learned && <p className="card-sub">完成任何一課的「單字」步驟後，單字就會加入這裡。</p>}
          <div className="btn-row">
            {due > 0 && <Link className="btn primary" to="/review/cards">開始複習</Link>}
            {learned > 0 && <Link className="btn" to="/review/free">隨機練習 20 張</Link>}
          </div>
        </section>
        <section className="card">
          <h2><Icon name="pencil" />錯題本</h2>
          <p className="big-num">{wrongN}<small>題</small></p>
          <p className="card-sub">練習時答錯的題目會收集在這裡，答對就會移除。</p>
          <div className="btn-row">
            {wrongN > 0 && <Link className="btn primary" to="/review/wrong">開始練習</Link>}
          </div>
        </section>
      </div>
    </>
  );
}

export default function Review() {
  const { mode } = useParams();
  if (mode === 'cards') return <Flashcards key="cards" free={false} />;
  if (mode === 'free') return <Flashcards key="free" free />;
  if (mode === 'wrong') return <WrongBook />;
  return <Overview />;
}
