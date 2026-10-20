import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Jp } from '../components/Jp';
import { CoverToggle, cx, useKey, wait, Zh } from '../components/Misc';
import { SpeakButton } from '../components/SpeakButton';
import type { Choice, Line } from '../data/types';
import { shuffle } from '../lib/random';
import { speak, speechSupported } from '../lib/speech';
import type { StepProps } from '../pages/UnitPage';
import { setSetting } from '../state/actions';
import { getState, useAppState } from '../state/store';

type ChoiceLine = [speaker: string, choices: Choice[]];
const isChoice = (l: Line): l is ChoiceLine => Array.isArray(l[1]);

interface Bubble { sp: string; jp: string; zh: string }
/** choice：輪到你（選擇，或「自己說」的中文提示）；grade：自己說完、看過答案，等你自評 */
type Phase = 'playing' | 'choice' | 'grade' | 'busy' | 'done';

/** 輪到你說的這句：正確說法，加上選項模式裡的錯誤說法（附說明） */
const turnOf = (l: Line) =>
  isChoice(l)
    ? { jp: l[1][0][0], zh: l[1][0][1], pitfalls: l[1].slice(1) }
    : { jp: l[1], zh: l[2], pitfalls: [] as Choice[] };

/*
 * 會話角色扮演：對方的台詞一句一句出現（可自動朗讀），
 * 輪到你時從選項中挑出最自然的回應，選錯會看到說明、可以再選。
 * 另外有兩個可以疊加的模式：
 * - 只聽聲音：對方的台詞先遮住，聽不懂再點開字幕
 * - 自己說：不給選項，看中文提示自己說出日文，看答案後自評
 */
export function DialogueStep({ unit, done, complete, next }: StepProps) {
  const d = unit.dialogue;
  const { settings } = useAppState();
  const listen = settings.listen && speechSupported;
  const speakMode = settings.speak;
  const [run, setRun] = useState(0);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [shown, setShown] = useState<Bubble[]>([]);
  const [typing, setTyping] = useState(false);
  const [wrong, setWrong] = useState<number[]>([]);
  /** 只聽聲音時，點開過字幕的泡泡 */
  const [opened, setOpened] = useState<number[]>([]);
  /** 自己說：這一輪說得出來幾句／共幾句 */
  const [said, setSaid] = useState({ ok: 0, total: 0 });
  const endRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const say = async (jp: string, me: boolean) => {
    const st = getState().settings;
    // 只聽聲音時對方的台詞一定要唸；自己說完看答案時也唸一次，方便跟著唸
    const audio = speechSupported && (st.autoplay || (!me && st.listen) || (me && st.speak));
    if (audio) await speak(jp);
    else await wait(me ? 300 : 800);
  };

  // 自動播放對方的台詞，直到輪到你（選擇，或「自己說」時你的每一句）
  useEffect(() => {
    if (phase !== 'playing') return;
    if (idx >= d.lines.length) {
      setPhase('done');
      if (!done) complete();
      return;
    }
    const line = d.lines[idx];
    const me = line[0] === d.you;
    if (isChoice(line) || (me && getState().settings.speak)) { setPhase('choice'); return; }
    let cancelled = false;
    (async () => {
      if (!me) setTyping(true);
      await wait(me ? 200 : 600);
      if (cancelled) return;
      setTyping(false);
      setShown((sh) => [...sh, { sp: line[0], jp: line[1], zh: line[2] }]);
      await say(line[1], me);
      if (!cancelled) setIdx((i) => i + 1);
    })();
    return () => { cancelled = true; setTyping(false); };
  }, [phase, idx, run]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [shown.length, phase]);

  const line = d.lines[idx];

  // 停在「你的固定台詞」時關掉「自己說」：這句沒有選項，直接照原本的方式唸出來
  useEffect(() => {
    if (phase === 'choice' && line && !isChoice(line) && !speakMode) setPhase('playing');
  }, [phase, line, speakMode]);

  const choices = phase === 'choice' && !speakMode && line && isChoice(line) ? line[1] : null;
  const order = useMemo(() => (choices ? shuffle(choices.map((_, i) => i)) : []), [choices]);
  const turn = line && ((phase === 'choice' && speakMode) || phase === 'grade') ? turnOf(line) : null;

  const choose = async (k: number) => {
    if (!choices || phase !== 'choice') return;
    if (k !== 0) { setWrong((w) => (w.includes(k) ? w : [...w, k])); return; }
    const c = choices[0];
    setWrong([]);
    setPhase('busy');
    setShown((sh) => [...sh, { sp: d.you, jp: c[0], zh: c[1] }]);
    await say(c[0], true);
    if (!alive.current) return;
    setIdx((i) => i + 1);
    setPhase('playing');
  };

  const reveal = () => {
    if (!turn || phase !== 'choice') return;
    setPhase('grade');
    setShown((sh) => [...sh, { sp: d.you, jp: turn.jp, zh: turn.zh }]);
    void say(turn.jp, true);
  };

  const grade = (ok: boolean) => {
    if (phase !== 'grade') return;
    setSaid((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }));
    setIdx((i) => i + 1);
    setPhase('playing');
  };

  useKey((e) => {
    if (choices) {
      const n = Number(e.key);
      if (n >= 1 && n <= order.length) void choose(order[n - 1]);
    } else if (phase === 'choice') {
      // 焦點在按鈕上時，空白鍵／Enter 交給按鈕本身
      if ((e.key === ' ' || e.key === 'Enter') && !(e.target as HTMLElement | null)?.closest('button')) {
        e.preventDefault();
        reveal();
      }
    } else if (e.key === '1' || e.key === '2') {
      grade(e.key === '2');
    }
  }, phase === 'choice' || phase === 'grade');

  const restart = () => {
    setShown([]); setIdx(0); setWrong([]); setOpened([]); setSaid({ ok: 0, total: 0 });
    setPhase('playing'); setRun((r) => r + 1);
  };

  /** 完成後建議下一輪換個更難的方式 */
  const upgrade = !speakMode
    ? { key: 'speak' as const, icon: 'mic' as const, label: '開啟「自己說」再演一次', sub: '下一輪試試「自己說」：只看中文，自己用日文回話。' }
    : !listen && speechSupported
      ? { key: 'listen' as const, icon: 'headphones' as const, label: '開啟「只聽聲音」再演一次', sub: '下一輪試試「只聽聲音」：不看字幕，只靠耳朵聽懂對方。' }
      : null;
  const tryUpgrade = () => {
    if (!upgrade) return;
    setSetting(upgrade.key, true);
    restart();
  };

  const name = (sp: string) => (sp === d.you ? `你（${d.roles[sp]}）` : d.roles[sp]);
  const lastWrong = wrong[wrong.length - 1];

  return (
    <>
      <div className="sec-head">
        <h2><span className="sec-no">3</span>會話</h2>
        <div className="sec-tools">
          <button
            type="button"
            className="toggle-btn"
            aria-pressed={listen}
            disabled={!speechSupported}
            title={speechSupported ? undefined : '這個瀏覽器不支援語音朗讀'}
            onClick={() => setSetting('listen', !settings.listen)}
          >
            <Icon name="headphones" className="ic-sm" />
            只聽聲音
          </button>
          <button
            type="button"
            className="toggle-btn"
            aria-pressed={speakMode}
            onClick={() => setSetting('speak', !speakMode)}
          >
            <Icon name="mic" className="ic-sm" />
            自己說
          </button>
          <CoverToggle />
        </div>
      </div>
      <div className="scene">
        <Icon name="map" />
        <p><b>情境　</b>{d.scene}</p>
      </div>
      <div className="cast">
        {Object.keys(d.roles).map((k) => (
          <span key={k} className={k === d.you ? 'me' : ''}>
            {k === d.you ? <>你扮演：<Jp text={d.roles[k]} /></> : <Jp text={d.roles[k]} />}
          </span>
        ))}
      </div>
      {(listen || speakMode) && (
        <div className="mode-hint">
          {listen && (
            <p><Icon name="headphones" className="ic-sm" /><span><b>只聽聲音　</b>對方的台詞先遮住。聽不清楚可以按喇叭再聽一次，真的聽不懂再點「看字幕」。</span></p>
          )}
          {speakMode && (
            <p><Icon name="mic" className="ic-sm" /><span><b>自己說　</b>輪到你時只給中文，先大聲用日文說出來，再看答案。</span></p>
          )}
        </div>
      )}

      <div className={cx('chat', settings.hideZh && 'zh-cover')} aria-live="polite">
        {shown.map((b, i) => {
          const covered = listen && b.sp !== d.you && phase !== 'done' && !opened.includes(i);
          return (
            <div key={i} className={cx('bubble', b.sp === d.you && 'me', covered && 'covered')}>
              <div className="who"><Jp text={name(b.sp)} /></div>
              <div className="b-text">
                <Jp as="p" className="b-jp" text={b.jp} />
                <Zh className="b-zh">{b.zh}</Zh>
                {covered && (
                  <button type="button" className="b-peek" onClick={() => setOpened((o) => [...o, i])}>
                    <span><Icon name="eye" className="ic-sm" />看字幕</span>
                  </button>
                )}
              </div>
              <SpeakButton text={b.jp} label={covered ? '再聽一次' : undefined} />
            </div>
          );
        })}
        {typing && <div className="typing" aria-label="對方輸入中"><span /><span /><span /></div>}
        <div ref={endRef} />
      </div>

      <div className="chat-act">
        {choices && (
          <>
            <p className="prompt"><Icon name="chat" />輪到你了！選出最自然的回應：</p>
            <div className="choices">
              {order.map((k, n) => (
                <button
                  key={k}
                  type="button"
                  className={cx('opt', wrong.includes(k) && 'wrong')}
                  disabled={wrong.includes(k)}
                  onClick={() => void choose(k)}
                >
                  <span className="key">{n + 1}</span>
                  <Jp text={choices[k][0]} />
                </button>
              ))}
            </div>
            {lastWrong !== undefined && (
              <div className="fb bad" role="status">
                <Icon name="x" />
                <div>
                  <b>再想想看～</b>
                  {choices[lastWrong][2] && <Jp as="p" ja={false} text={choices[lastWrong][2]!} />}
                </div>
              </div>
            )}
          </>
        )}
        {turn && phase === 'choice' && (
          <div className="say">
            <p className="prompt"><Icon name="mic" />輪到你了！用日文說說看：</p>
            <p className="say-zh">{turn.zh}</p>
            <div className="say-foot">
              <span className="say-tip">先大聲說出來，再按「看答案」或空白鍵</span>
              <button type="button" className="btn primary" onClick={reveal} autoFocus>
                <Icon name="eye" />看答案
              </button>
            </div>
          </div>
        )}
        {turn && phase === 'grade' && (
          <div className="say">
            <p className="prompt"><Icon name="volume" />跟著唸一次，再評評看：</p>
            <p className="say-tip">意思對、說得出口就算，不用跟答案一字不差。</p>
            <div className="grades two">
              <button type="button" className="grade g0" onClick={() => grade(false)}>卡住了<small>1</small></button>
              <button type="button" className="grade g3" onClick={() => grade(true)}>說得出來<small>2</small></button>
            </div>
            {turn.pitfalls.length > 0 && (
              <details className="pitfalls">
                <summary>這樣說為什麼不對？（{turn.pitfalls.length} 句）</summary>
                <ul>
                  {turn.pitfalls.map(([jp, , why]) => (
                    <li key={jp}>
                      <Icon name="x" className="ic-sm" />
                      <div>
                        <Jp as="p" className="pf-jp" text={jp} />
                        {why && <Jp as="p" className="pf-why" ja={false} text={why} />}
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        {phase === 'done' && (
          <div className="card done-card">
            <p className="done-title"><Icon name="check" />會話完成！</p>
            {said.total > 0 && (
              <p className="said-score">
                {said.ok === said.total
                  ? <>自己說：<b>{said.total}</b> 句全部說出來了！</>
                  : <>自己說：<b>{said.total}</b> 句裡有 <b>{said.ok}</b> 句說得出來。卡住的句子多跟著唸幾次。</>}
              </p>
            )}
            <p className="card-sub">
              {upgrade ? upgrade.sub : '試著把每一句都跟著唸一次，或關掉中文再挑戰一遍。'}
            </p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={restart}><Icon name="rotate" />再練一次</button>
              {upgrade && (
                <button type="button" className="btn" onClick={tryUpgrade}><Icon name={upgrade.icon} />{upgrade.label}</button>
              )}
              <button type="button" className="btn primary" onClick={next}>下一步：練習<Icon name="arrowRight" /></button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
