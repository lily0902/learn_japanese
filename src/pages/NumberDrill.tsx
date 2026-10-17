import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { DRILL_DIRS, DRILL_KINDS, DRILL_SIZE, drawDrill, type DrillDir, type DrillKind } from '../quiz/numberDrill';
import { Quiz } from '../quiz/Quiz';

/* 數字練習：選情境和方向，每次隨機出 10 題。不進錯題本、不算連續天數 */

const PREF_KEY = 'nihongo-drill';

function loadPref(): { kind: DrillKind; dir: DrillDir } {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}');
    return {
      kind: DRILL_KINDS.some((k) => k.key === p.kind) ? p.kind : 'number',
      dir: DRILL_DIRS.some((d) => d.key === p.dir) ? p.dir : 'listen',
    };
  } catch {
    return { kind: 'number', dir: 'listen' };
  }
}

function savePref(kind: DrillKind, dir: DrillDir) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ kind, dir })); } catch { /* ignore */ }
}

const noRecord = () => {};

export default function NumberDrill() {
  const [pref] = useState(loadPref);
  const [kind, setKind] = useState<DrillKind>(pref.kind);
  const [dir, setDir] = useState<DrillDir>(pref.dir);
  const [round, setRound] = useState<{ n: number; questions: ReturnType<typeof drawDrill> } | null>(null);

  const start = () => {
    savePref(kind, dir);
    setRound((r) => ({ n: (r?.n ?? 0) + 1, questions: drawDrill(kind, dir) }));
  };

  const crumbs = (
    <nav className="crumbs" aria-label="路徑">
      {round ? (
        <button type="button" className="link-btn crumb-btn" onClick={() => setRound(null)}>
          <Icon name="arrowLeft" className="ic-sm" />數字練習
        </button>
      ) : (
        <Link to="/review"><Icon name="arrowLeft" className="ic-sm" />複習</Link>
      )}
    </nav>
  );

  if (round) {
    const k = DRILL_KINDS.find((x) => x.key === kind)!;
    const d = DRILL_DIRS.find((x) => x.key === dir)!;
    return (
      <>
        {crumbs}
        <h1 className="page-title">數字練習</h1>
        <p className="page-sub">{k.label}・{d.label}</p>
        <Quiz
          key={round.n}
          questions={round.questions}
          record={noRecord}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setRound(null)}>換情境</button>
              <button type="button" className="btn primary" onClick={start}>
                再來 {DRILL_SIZE} 題<Icon name="arrowRight" />
              </button>
            </>
          }
        />
      </>
    );
  }

  return (
    <>
      {crumbs}
      <h1 className="page-title">數字練習</h1>
      <p className="page-sub">
        每次隨機出 {DRILL_SIZE} 題，想練多少次都可以。這裡答錯不會進錯題本，規則忘了就回去看預備課。
      </p>
      <section className="card drill-setup">
        <h2 id="drill-kind">情境</h2>
        <div className="drill-kinds" role="group" aria-labelledby="drill-kind">
          {DRILL_KINDS.map((x) => (
            <button
              key={x.key}
              type="button"
              className="drill-kind"
              aria-pressed={kind === x.key}
              onClick={() => setKind(x.key)}
            >
              <span className="drill-sample" lang="ja">{x.sample}</span>
              <span className="drill-label">{x.label}</span>
              {kind === x.key && <Icon name="check" className="ic-sm drill-check" />}
            </button>
          ))}
        </div>

        <h2 id="drill-dir">方向</h2>
        <div className="drill-dirs" role="group" aria-labelledby="drill-dir">
          {DRILL_DIRS.map((x) => (
            <button
              key={x.key}
              type="button"
              className="drill-dir"
              aria-pressed={dir === x.key}
              onClick={() => setDir(x.key)}
            >
              <Icon name={x.key === 'listen' ? 'headphones' : 'keyboard'} className="drill-dir-ic" />
              <span>
                <b>{x.label}</b>
                <small>{x.desc}</small>
              </span>
              {dir === x.key && <Icon name="check" className="ic-sm drill-check" />}
            </button>
          ))}
        </div>

        <div className="btn-row drill-start">
          <button type="button" className="btn primary" onClick={start}>
            開始 {DRILL_SIZE} 題<Icon name="arrowRight" />
          </button>
        </div>
      </section>
    </>
  );
}
