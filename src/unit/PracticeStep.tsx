import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { getUnit, QUESTIONS, unitLabel } from '../data';
import type { Unit } from '../data/types';
import type { StepProps } from '../pages/UnitPage';
import { Quiz } from '../quiz/Quiz';
import { drawReview } from '../quiz/review';
import { getState } from '../state/store';

export function PracticeStep({ unit, complete, nextUnit }: StepProps & { nextUnit?: Unit }) {
  const own = unit.practice.map((_, i) => QUESTIONS.get(`${unit.id}-${i}`)!);
  // 最後加幾題前面的課；進來時抽一次，「再做一次」也是同一組
  const [questions] = useState(() => [...own, ...drawReview(getState(), unit)]);
  const reviewN = questions.length - own.length;
  return (
    <>
      <div className="sec-head">
        <h2><span className="sec-no">4</span>練習</h2>
        <span className="hint">
          {own.length} 題{reviewN > 0 && `＋複習前面的課 ${reviewN} 題`}・選擇／重組／打字／聽力
        </span>
      </div>
      <Quiz
        questions={questions}
        tag={(q) => (q.unitId !== unit.id ? `複習・${unitLabel(getUnit(q.unitId)!)}` : null)}
        // 這課的成績只算這課的題目，複習題不算進去
        onFinish={(_, __, wrongs) => complete({ best: own.length - wrongs.filter((q) => q.unitId === unit.id).length, total: own.length })}
        footer={
          nextUnit ? (
            <>
              <Link className="btn" to="/">回到今日任務</Link>
              <Link className="btn primary" to={`/unit/${nextUnit.id}`}>前往{unitLabel(nextUnit)}<Icon name="arrowRight" /></Link>
            </>
          ) : (
            <Link className="btn primary" to="/">回到今日任務</Link>
          )
        }
      />
    </>
  );
}
