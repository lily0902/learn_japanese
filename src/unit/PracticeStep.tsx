import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { QUESTIONS } from '../data';
import type { StepProps } from '../pages/UnitPage';
import { Quiz } from '../quiz/Quiz';

export function PracticeStep({ unit, complete, nextUnitId }: StepProps & { nextUnitId?: number }) {
  const questions = unit.practice.map((_, i) => QUESTIONS.get(`${unit.id}-${i}`)!);
  return (
    <>
      <div className="sec-head">
        <h2><span className="sec-no">4</span>練習</h2>
        <span className="hint">{questions.length} 題・選擇／重組／打字／聽力</span>
      </div>
      <Quiz
        questions={questions}
        onFinish={(score, total) => complete({ best: score, total })}
        footer={
          nextUnitId ? (
            <>
              <Link className="btn" to="/">回到今日任務</Link>
              <Link className="btn primary" to={`/unit/${nextUnitId}`}>前往第 {nextUnitId} 課<Icon name="arrowRight" /></Link>
            </>
          ) : (
            <Link className="btn primary" to="/">回到今日任務</Link>
          )
        }
      />
    </>
  );
}
