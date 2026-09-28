import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Jp } from '../components/Jp';
import { UNITS } from '../data';
import { addDays, formatLong, today, weekday } from '../lib/date';
import {
  activeDays, dueKeys, isUnitDone, learnedCount, nextUnit, stepsDone, streak, unitsDoneOn, wrongIds,
} from '../state/selectors';
import { useAppState } from '../state/store';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'こんばんは';
  if (h < 11) return 'おはようございます';
  if (h < 18) return 'こんにちは';
  return 'こんばんは';
}

function Task({ n, done, optional, title, sub, action }: {
  n: number | string;
  done?: boolean;
  optional?: boolean;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <li className={`task ${done ? 'done' : ''} ${optional ? 'optional' : ''}`}>
      <span className="task-check" aria-label={done ? '已完成' : '未完成'}>
        {done ? <Icon name="check" className="ic-sm" /> : n}
      </span>
      <div>
        <p className="task-title">{title}</p>
        {sub && <p className="task-sub">{sub}</p>}
      </div>
      {action}
    </li>
  );
}

function StampCalendar({ days }: { days: Set<string> }) {
  const t = today();
  const start = addDays(t, -(weekday(t) + 28));
  const cells = Array.from({ length: 35 }, (_, i) => addDays(start, i));
  return (
    <div className="calendar" role="grid" aria-label="最近五週的學習紀錄">
      {'日一二三四五六'.split('').map((w) => <span key={w} className="cal-head" aria-hidden="true">{w}</span>)}
      {cells.map((d) => {
        const active = days.has(d);
        const cls = ['cal-day', active && 'active', d === t && 'today', d > t && 'future'].filter(Boolean).join(' ');
        return (
          <span key={d} className={cls} role="gridcell" aria-label={`${d}${active ? '，有學習' : ''}`}>
            {Number(d.slice(8))}
          </span>
        );
      })}
    </div>
  );
}

export default function Home() {
  const s = useAppState();
  const nu = nextUnit(s);
  const due = dueKeys(s).length;
  const learned = learnedCount(s);
  const wrongN = wrongIds(s).length;
  const doneToday = unitsDoneOn(s, today());
  const doneCount = UNITS.filter((u) => isUnitDone(s, u.id)).length;
  const reviewedToday = !!s.days[today()]?.rev;

  const levels = (['N5', 'N4'] as const).map((lv) => {
    const list = UNITS.filter((u) => u.level === lv);
    return { lv, done: list.filter((u) => isUnitDone(s, u.id)).length, total: list.length };
  });

  let task1: ReactNode;
  if (!nu && doneToday.length === 0) {
    task1 = <Task n={1} done title="30 課全部完成了！" sub="おめでとう！接下來用單字卡和錯題本維持記憶。" />;
  } else if (doneToday.length > 0) {
    task1 = (
      <Task
        n={1}
        done
        title={`今天完成了第 ${doneToday.map((u) => u.id).join('、')} 課`}
        sub={nu ? `還想多學一點？下一課是第 ${nu.id} 課。` : '全部課程都完成了！'}
        action={nu && <Link className="btn small" to={`/unit/${nu.id}`}>繼續下一課</Link>}
      />
    );
  } else if (nu) {
    const steps = stepsDone(s, nu.id);
    task1 = (
      <Task
        n={1}
        title={<>學習第 {nu.id} 課「<Jp text={nu.title} />」</>}
        sub={`${nu.zh}・已完成 ${steps} / 4 步驟`}
        action={<Link className="btn primary" to={`/unit/${nu.id}`}>{steps ? '繼續學習' : '開始學習'}<Icon name="arrowRight" /></Link>}
      />
    );
  }

  let task2: ReactNode;
  if (learned === 0) {
    task2 = <Task n={2} title="複習單字卡" sub="完成第一課的「單字」步驟後，這裡就會出現要複習的卡片。" />;
  } else if (due > 0) {
    task2 = (
      <Task
        n={2}
        title={`複習 ${due} 張到期的單字卡`}
        sub={`大約 ${Math.max(1, Math.ceil((due * 8) / 60))} 分鐘`}
        action={<Link className="btn primary" to="/review/cards">開始複習<Icon name="arrowRight" /></Link>}
      />
    );
  } else {
    task2 = <Task n={2} done title="單字卡複習完成" sub={reviewedToday ? '今天的份已經複習完了！' : '今天沒有到期的卡片。'} />;
  }

  return (
    <div className="stack">
      <section className="hero">
        <p className="eyebrow">{formatLong()}</p>
        <h1 lang="ja" className="jp">{greeting()}</h1>
        <p className="greet">今天也前進一點點吧！一課大約 30 分鐘：單字 → 文法 → 會話 → 練習。</p>
        <div className="stats">
          <div className="stat">
            <b><Icon name="flame" />{streak(s)}</b>
            <span>連續天數</span>
          </div>
          <div className="stat">
            <b>{doneCount}<small className="muted">/{UNITS.length}</small></b>
            <span>完成課數</span>
          </div>
          <div className="stat">
            <b>{learned}</b>
            <span>已學單字</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>今日任務</h2>
        <ol className="tasks">
          {task1}
          {task2}
          {wrongN > 0 && (
            <Task
              n="＋"
              optional
              title={`錯題本還有 ${wrongN} 題`}
              sub="選做：把之前答錯的題目再練一次，答對就會移除。"
              action={<Link className="btn small" to="/review/wrong">練習錯題</Link>}
            />
          )}
        </ol>
      </section>

      <section className="card">
        <h2>學習印章</h2>
        <p className="card-sub" style={{ marginBottom: 12 }}>完成一課、或把到期的單字卡複習完，當天就會蓋上印章。</p>
        <StampCalendar days={activeDays(s)} />
      </section>

      <section className="card">
        <h2>進度</h2>
        <div className="level-bars">
          {levels.map(({ lv, done, total }) => (
            <div className="level-row" key={lv}>
              <span className="level-tag">{lv}</span>
              <div className="bar" role="progressbar" aria-label={`${lv} 進度`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
                <span style={{ width: `${(done / total) * 100}%` }} />
              </div>
              <span className="muted">{done} / {total} 課</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
