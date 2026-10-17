import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { QUESTIONS, unitLabel } from '../data';
import type { Unit } from '../data/types';
import type { StepProps } from '../pages/UnitPage';
import { Quiz } from '../quiz/Quiz';

export function PracticeStep({ unit, complete, nextUnit }: StepProps & { nextUnit?: Unit }) {
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
