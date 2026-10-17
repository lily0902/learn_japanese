import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Jp } from '../components/Jp';
import { Hanko } from '../components/Misc';
import { examRange, getExam } from '../data';
import type { Exam, QuestionWithId } from '../data/types';
import { formatMonthDay } from '../lib/date';
import {
  drawExam, examMinutes, examTotal, GRAMMAR_PER_UNIT, isWeak, passMark, scoreByKind, scoreByUnit, VOCAB_PER_UNIT,
} from '../quiz/exam';
import { Quiz } from '../quiz/Quiz';
import { finishExam, recordAnswer, resurfaceWord } from '../state/actions';
import { examProgress, isUnitDone } from '../state/selectors';
import { useAppState } from '../state/store';

/** 文法題照常進錯題本；單字題答錯就把那張單字卡排回今天 */
function recordExam(q: QuestionWithId, ok: boolean) {
  if (!q.word) recordAnswer(q.id, ok);
  else if (!ok) resurfaceWord(q.word);
}

interface Attempt { qs: QuestionWithId[]; start: number; n: number }
interface Outcome { qs: QuestionWithId[]; wrongs: QuestionWithId[]; ms: number; prevBest?: number; n: number }
type Phase =
  | { k: 'intro' }
  | ({ k: 'test' } & Attempt)
  | ({ k: 'result' } & Outcome)
  | { k: 'retry'; result: Outcome };

/** 「第 3 課 場所與購物」：取課名冒號後面的主題 */
const topic = (zh: string) => zh.split('：').pop();

function ExamBar({ exam, note }: { exam: Exam; note?: string }) {
  return (
    <header className="exam-bar">
      <h1>綜合測驗 {exam.id}</h1>
      <span>{note ?? examRange(exam)}</span>
    </header>
  );
}

/* ---------- 開始前的說明 ---------- */
function ExamIntro({ exam, onStart }: { exam: Exam; onStart: () => void }) {
  const s = useAppState();
  const p = examProgress(s, exam.id);
  const total = examTotal(exam);
  const undone = exam.units.filter((u) => !isUnitDone(s, u.id));

  let record: ReactNode = '還沒考過';
  if (p.best !== undefined) {
    record = (
      <>
        最佳 <b>{p.best}</b> / {p.total}・
        {p.passed ? `${formatMonthDay(p.passed)}合格` : `還差 ${passMark(p.total ?? total) - p.best} 題合格`}
      </>
    );
  }

  return (
    <div className="stack">
      <header className="unit-head exam-head">
        <Jp as="h1" text={`まとめテスト ${exam.id}`} />
        <p className="unit-zh">綜合測驗・{examRange(exam)}</p>
        <p className="goal">
          <Icon name="target" />
          <span>把 {exam.units.length} 課的文法和單字混在一起出題，找出哪一課還不熟。</span>
        </p>
        {p.passed && <Hanko label="已合格">合格</Hanko>}
      </header>

      <section className="card exam-rules">
        <h2>考試說明</h2>
        <dl className="exam-sheet">
          <div>
            <dt>題數</dt>
            <dd>{total} 題・每課 {GRAMMAR_PER_UNIT + VOCAB_PER_UNIT} 題（文法 {GRAMMAR_PER_UNIT}＋單字 {VOCAB_PER_UNIT}），打散出題</dd>
          </div>
          <div><dt>時間</dt><dd>約 {examMinutes(exam)} 分鐘・不計時</dd></div>
          <div><dt>合格</dt><dd>答對 {passMark(total)} 題以上（80%）</dd></div>
          <div><dt>紀錄</dt><dd>{record}</dd></div>
        </dl>
        {undone.length > 0 && (
          <div className="note">
            <Icon name="alert" />
            <p>第 {undone.map((u) => u.id).join('、')} 課還沒學完，會考到還沒看過的內容。想先試試看也沒問題。</p>
          </div>
        )}
        <div className="btn-row">
          <button type="button" className="btn primary" onClick={onStart}>
            {p.best === undefined ? '開始測驗' : '再考一次'}<Icon name="arrowRight" />
          </button>
        </div>
        <p className="card-sub">每題作答後馬上會看到對錯和解說。中途離開不會保存，下次重新抽題。</p>
      </section>

      <section className="card">
        <h2>考試範圍</h2>
        <ol className="exam-range">
          {exam.units.map((u) => (
            <li key={u.id}>
              <Link to={`/unit/${u.id}`}>
                <span className="er-no">第 {u.id} 課</span>
                <span className="er-title">
                  <Jp text={u.title} className="jp" />
                  <small>{u.zh}</small>
                </span>
                {isUnitDone(s, u.id) ? <Hanko size="sm" label="已完成">済</Hanko> : <span className="muted er-todo">未完成</span>}
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/* ---------- 結果 ---------- */
function verdict(score: number, total: number, hasWeak: boolean) {
  const need = passMark(total) - score;
  if (score === total) return { stamp: <>満点</>, msg: '全對！這幾課已經完全掌握了。' };
  if (need <= 0) return { stamp: <>合格</>, msg: '合格了！把錯的題目再看一次，就更穩了。' };
  return {
    stamp: <>もう<br />すこし</>,
    msg: `還差 ${need} 題就合格。${hasWeak ? '先複習下面標出來的課' : '先把錯的題目再練一次'}，再挑戰看看吧！`,
  };
}

function ExamResult({ exam, r, onRetry, onRestart }: {
  exam: Exam;
  r: Outcome;
  onRetry: () => void;
  onRestart: () => void;
}) {
  const total = r.qs.length;
  const wrong = new Set(r.wrongs.map((q) => q.id));
  const score = total - wrong.size;
  const units = scoreByUnit(exam, r.qs, wrong);
  const kinds = scoreByKind(r.qs, wrong);
  const { stamp, msg } = verdict(score, total, units.some(isWeak));

  const mins = Math.round(r.ms / 60000);
  let best: ReactNode = null;
  if (r.prevBest !== undefined) {
    best = score > r.prevBest
      ? <>・<b>新紀錄！</b>之前最佳 {r.prevBest} / {total}</>
      : <>・最佳成績 {r.prevBest} / {total}</>;
  }

  return (
    <div className="card result exam-result">
      <Hanko size="big" animate>{stamp}</Hanko>
      <p className="score">{score}<small> / {total}</small></p>
      <p className="exam-meta">用時 {mins < 1 ? '不到 1 分鐘' : `${mins} 分鐘`}{best}</p>
      <p>{msg}</p>

      <section className="exam-breakdown" aria-labelledby="exam-breakdown-title">
        <h2 id="exam-breakdown-title">各課表現</h2>
        <ul className="unit-scores">
          {units.map((x) => {
            const weak = isWeak(x);
            return (
              <li key={x.unit.id} className={weak ? 'weak' : undefined}>
                <span className="us-name">第 {x.unit.id} 課<small>{topic(x.unit.zh)}</small></span>
                <span className="cells" role="img" aria-label={`答對 ${x.ok} / ${x.total} 題`}>
                  {Array.from({ length: x.total }, (_, i) => <span key={i} className={i < x.ok ? 'on' : undefined} />)}
                </span>
                <span className="us-score">{x.ok}/{x.total}</span>
                {weak && (
                  <Link className="us-review" to={`/unit/${x.unit.id}/grammar`}>
                    建議複習：回去看第 {x.unit.id} 課的文法<Icon name="arrowRight" className="ic-sm" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        <p className="kind-split">
          文法 {kinds.grammar.ok} / {kinds.grammar.total}・單字 {kinds.vocab.ok} / {kinds.vocab.total}
        </p>
      </section>

      <div className="btn-row">
        {r.wrongs.length > 0 && (
          <button type="button" className="btn" onClick={onRetry}>只練錯的 {r.wrongs.length} 題</button>
        )}
        <button type="button" className="btn" onClick={onRestart}><Icon name="rotate" />再考一次</button>
      </div>
      <div className="btn-row">
        <Link className="btn primary" to="/">回到今日任務</Link>
      </div>
    </div>
  );
}

/* ---------- 整個流程：說明 → 作答 → 結果（→ 只練錯的） ---------- */
function ExamRun({ exam }: { exam: Exam }) {
  const [phase, setPhase] = useState<Phase>({ k: 'intro' });
  useEffect(() => { window.scrollTo(0, 0); }, [phase.k]);

  const start = (n: number) => setPhase({ k: 'test', qs: drawExam(exam), start: Date.now(), n });
  const finish = (a: Attempt) => (score: number, total: number, wrongs: QuestionWithId[]) => {
    const prevBest = finishExam(exam.id, score, total);
    setPhase({ k: 'result', qs: a.qs, wrongs, ms: Date.now() - a.start, prevBest, n: a.n });
  };

  let body: ReactNode;
  if (phase.k === 'intro') {
    body = <ExamIntro exam={exam} onStart={() => start(1)} />;
  } else if (phase.k === 'test') {
    body = (
      <>
        <ExamBar exam={exam} />
        <Quiz key={phase.n} questions={phase.qs} record={recordExam} onFinish={finish(phase)} />
      </>
    );
  } else if (phase.k === 'result') {
    body = (
      <>
        <ExamBar exam={exam} />
        <ExamResult
          exam={exam}
          r={phase}
          onRetry={() => setPhase({ k: 'retry', result: phase })}
          onRestart={() => start(phase.n + 1)}
        />
      </>
    );
  } else {
    const back = phase.result;
    body = (
      <>
        <ExamBar exam={exam} note="只練錯的題目・不計分" />
        <Quiz
          questions={back.wrongs}
          record={recordExam}
          showUnit
          footer={
            <>
              <button type="button" className="btn" onClick={() => setPhase({ k: 'result', ...back })}>回到測驗結果</button>
              <Link className="btn primary" to="/">回到今日任務</Link>
            </>
          }
        />
      </>
    );
  }

  return (
    <>
      <nav className="crumbs" aria-label="路徑">
        <Link to="/toc"><Icon name="arrowLeft" className="ic-sm" />目錄</Link>
        <span aria-hidden="true">/</span>
        <span>綜合測驗 {exam.id}</span>
      </nav>
      {body}
    </>
  );
}

export default function ExamPage() {
  const { id } = useParams();
  const exam = getExam(Number(id));
  if (!exam) return <Navigate to="/toc" replace />;
  return <ExamRun key={exam.id} exam={exam} />;
}
