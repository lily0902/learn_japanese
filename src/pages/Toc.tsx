import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Jp } from '../components/Jp';
import { Hanko } from '../components/Misc';
import { EXAMS, examRange, LESSONS, PREP } from '../data';
import type { Exam, Unit } from '../data/types';
import { plain } from '../lib/ruby';
import { examMinutes, examTotal } from '../quiz/exam';
import { examProgress, isUnitDone, nextUnit, unitProgress } from '../state/selectors';
import { useAppState } from '../state/store';
import { STEPS, type AppState } from '../state/types';

const PARTS = [
  { key: 'prep', part: '開始之前', name: '預備課', list: PREP },
  { key: 'N5', part: '第一部', name: 'N5 基礎', list: LESSONS.filter((u) => u.level === 'N5') },
  { key: 'N4', part: '第二部', name: 'N4 進階', list: LESSONS.filter((u) => u.level === 'N4') },
];

function TocItem({ unit, s, isNext }: { unit: Unit; s: AppState; isNext: boolean }) {
  const p = unitProgress(s, unit.id);
  const done = isUnitDone(s, unit.id);
  const count = STEPS.filter(({ key }) => p[key]).length;
  return (
    <li>
      <Link className="toc-item" to={`/unit/${unit.id}`}>
        {unit.prep ? (
          <span className="toc-no"><small>預備</small><b>{unit.prep}</b></span>
        ) : (
          <span className="toc-no"><small>第</small><b>{unit.id}</b><small>課</small></span>
        )}
        <span className="toc-title">
          <Jp text={unit.title} className="jp" />
          <span className="zh">{unit.zh}</span>
          <span className="tags">
            {unit.grammar.map((g) => <span className="tag" lang="ja" key={g.t}>{plain(g.t)}</span>)}
          </span>
        </span>
        <span className="toc-status">
          {done ? (
            <Hanko size="sm" label="已完成">済</Hanko>
          ) : (
            <>
              <span className="dots" role="img" aria-label={`已完成 ${count} / 4 步驟`}>
                {STEPS.map(({ key }) => <span key={key} className={`dot ${p[key] ? 'on' : ''}`} />)}
              </span>
              {isNext && <span className="toc-next">下一課</span>}
            </>
          )}
        </span>
      </Link>
    </li>
  );
}

function TocExam({ exam, s }: { exam: Exam; s: AppState }) {
  const p = examProgress(s, exam.id);
  return (
    <li>
      <Link className="toc-item toc-exam" to={`/exam/${exam.id}`}>
        <span className="toc-no"><span className="exam-tag">測驗</span></span>
        <span className="toc-title">
          <span className="exam-name">綜合測驗 {exam.id}<span lang="ja">まとめテスト</span></span>
          <span className="zh">{examRange(exam)}・{examTotal(exam)} 題・約 {examMinutes(exam)} 分鐘</span>
        </span>
        <span className="toc-status">
          {p.passed ? (
            <Hanko size="sm" label="已合格">合格</Hanko>
          ) : p.best !== undefined && (
            <span className="exam-best">最佳 {p.best}/{p.total}</span>
          )}
        </span>
      </Link>
    </li>
  );
}

/** 每份測驗接在它最後一課的後面 */
const examAfter = (unitId: number) => EXAMS.find((e) => e.units[e.units.length - 1].id === unitId);

export default function Toc() {
  const s = useAppState();
  const nu = nextUnit(s);
  return (
    <>
      <h1 className="page-title">目錄</h1>
      <p className="page-sub">
        共 {LESSONS.length} 課＋{PREP.length} 堂預備課，每 5 課有一份綜合測驗。建議依順序每天學一課，也可以自由跳著看。
      </p>
      {PARTS.map(({ key, part, name, list }) => {
        const doneN = list.filter((u) => isUnitDone(s, u.id)).length;
        return (
          <section className="toc-part" key={key}>
            <h2>
              <span className="part">{part}</span>
              {name}
              <span className="part-count">{doneN} / {list.length}</span>
            </h2>
            <ol className="toc">
              {list.map((u) => {
                const exam = examAfter(u.id);
                return (
                  <Fragment key={u.id}>
                    <TocItem unit={u} s={s} isNext={nu?.id === u.id} />
                    {exam && <TocExam exam={exam} s={s} />}
                  </Fragment>
                );
              })}
            </ol>
          </section>
        );
      })}
    </>
  );
}
