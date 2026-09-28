import { useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { Hanko } from '../components/Misc';
import type { QuestionWithId } from '../data/types';
import { recordAnswer } from '../state/actions';
import { ChoiceQuestion, InputQuestion, ListenQuestion, OrderQuestion } from './questions';

interface QuizProps {
  questions: QuestionWithId[];
  /** 第一輪做完時呼叫（「只練錯的」不會再呼叫） */
  onFinish?: (score: number, total: number) => void;
  /** 結果頁下方的按鈕 */
  footer?: ReactNode;
  /** 顯示題目出自第幾課（錯題本用） */
  showUnit?: boolean;
}

function resultCopy(score: number, total: number) {
  const pct = total ? score / total : 0;
  if (pct === 1) return { stamp: <>満点</>, msg: '全對！太厲害了！' };
  if (pct >= 0.8) return { stamp: <>よく<br />できました</>, msg: '很棒！這課已經掌握得不錯了。' };
  if (pct >= 0.5) return { stamp: <>がんばり<br />ました</>, msg: '不錯喔！把錯的題目再看一次會更穩。' };
  return { stamp: <>もう<br />すこし</>, msg: '沒關係，回去看看文法說明，再挑戰一次吧！' };
}

export function Quiz({ questions, onFinish, footer, showUnit }: QuizProps) {
  const [round, setRound] = useState({ list: questions, n: 0, retry: false });
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongs, setWrongs] = useState<QuestionWithId[]>([]);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);

  const { list } = round;
  const q = list[idx];

  const start = (next: QuestionWithId[], retry: boolean) => {
    setRound((r) => ({ list: next, n: r.n + 1, retry }));
    setIdx(0); setScore(0); setWrongs([]); setAnswered(false); setFinished(false);
  };

  const onAnswer = (ok: boolean) => {
    setAnswered(true);
    recordAnswer(q.id, ok);
    if (ok) setScore((s) => s + 1);
    else setWrongs((w) => [...w, q]);
  };

  const goNext = () => {
    if (idx + 1 < list.length) {
      setIdx(idx + 1);
      setAnswered(false);
    } else {
      if (!round.retry) onFinish?.(score, list.length);
      setFinished(true);
    }
  };

  if (!list.length) {
    return <div className="card empty">目前沒有題目。</div>;
  }

  if (finished) {
    const { stamp, msg } = resultCopy(score, list.length);
    return (
      <div className="card result">
        <Hanko size="big" animate>{stamp}</Hanko>
        <p className="score">{score}<small> / {list.length}</small></p>
        <p>{msg}</p>
        <div className="btn-row">
          {wrongs.length > 0 && (
            <button type="button" className="btn" onClick={() => start(wrongs, true)}>
              只練錯的 {wrongs.length} 題
            </button>
          )}
          <button type="button" className="btn" onClick={() => start(questions, false)}>
            <Icon name="rotate" />再做一次
          </button>
        </div>
        {footer && <div className="btn-row">{footer}</div>}
      </div>
    );
  }

  const nextButton = (
    <button type="button" className="btn primary" onClick={goNext} autoFocus>
      {idx + 1 < list.length ? '下一題' : '看結果'}
      <Icon name="arrowRight" />
    </button>
  );
  const key = `${round.n}-${idx}`;
  const common = { onAnswer, nextButton };

  return (
    <div className="quiz">
      <div className="quiz-top">
        <span className="count">第 {idx + 1} / {list.length} 題</span>
        <div className="bar" role="progressbar" aria-label="作答進度" aria-valuemin={0} aria-valuemax={list.length} aria-valuenow={idx + (answered ? 1 : 0)}>
          <span style={{ width: `${((idx + (answered ? 1 : 0)) / list.length) * 100}%` }} />
        </div>
      </div>
      <div className="q-card">
        {showUnit && <span className="q-unit">第 {q.unitId} 課</span>}
        {q.t === 'c' && <ChoiceQuestion key={key} q={q} {...common} />}
        {q.t === 'l' && <ListenQuestion key={key} q={q} {...common} />}
        {q.t === 'o' && <OrderQuestion key={key} q={q} {...common} />}
        {q.t === 'i' && <InputQuestion key={key} q={q} {...common} />}
      </div>
    </div>
  );
}
