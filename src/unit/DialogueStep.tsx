import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Jp } from '../components/Jp';
import { CoverToggle, cx, shuffle, useKey, wait, Zh } from '../components/Misc';
import { SpeakButton } from '../components/SpeakButton';
import type { Choice, Line } from '../data/types';
import { speak, speechSupported } from '../lib/speech';
import type { StepProps } from '../pages/UnitPage';
import { getState, useAppState } from '../state/store';

type ChoiceLine = [speaker: string, choices: Choice[]];
const isChoice = (l: Line): l is ChoiceLine => Array.isArray(l[1]);

interface Bubble { sp: string; jp: string; zh: string }
type Phase = 'playing' | 'choice' | 'busy' | 'done';

/*
 * 會話角色扮演：對方的台詞一句一句出現（可自動朗讀），
 * 輪到你時從選項中挑出最自然的回應，選錯會看到說明、可以再選。
 */
export function DialogueStep({ unit, done, complete, next }: StepProps) {
  const d = unit.dialogue;
  const { settings } = useAppState();
  const [run, setRun] = useState(0);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('playing');
  const [shown, setShown] = useState<Bubble[]>([]);
  const [typing, setTyping] = useState(false);
  const [wrong, setWrong] = useState<number[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const say = async (jp: string, me: boolean) => {
    if (getState().settings.autoplay && speechSupported) await speak(jp);
    else await wait(me ? 300 : 800);
  };

  // 自動播放對方的台詞，直到輪到你選擇
  useEffect(() => {
    if (phase !== 'playing') return;
    if (idx >= d.lines.length) {
      setPhase('done');
      if (!done) complete();
      return;
    }
    const line = d.lines[idx];
    if (isChoice(line)) { setPhase('choice'); return; }
    let cancelled = false;
    (async () => {
      const me = line[0] === d.you;
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
  const choices = phase === 'choice' && line && isChoice(line) ? line[1] : null;
  const order = useMemo(() => (choices ? shuffle(choices.map((_, i) => i)) : []), [choices]);

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

  useKey((e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= order.length) void choose(order[n - 1]);
  }, phase === 'choice');

  const restart = () => {
    setShown([]); setIdx(0); setWrong([]); setPhase('playing'); setRun((r) => r + 1);
  };

  const name = (sp: string) => (sp === d.you ? `你（${d.roles[sp]}）` : d.roles[sp]);
  const lastWrong = wrong[wrong.length - 1];

  return (
    <>
      <div className="sec-head">
        <h2><span className="sec-no">3</span>會話</h2>
        <CoverToggle />
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

      <div className={cx('chat', settings.hideZh && 'zh-cover')} aria-live="polite">
        {shown.map((b, i) => (
          <div key={i} className={cx('bubble', b.sp === d.you && 'me')}>
            <div className="who"><Jp text={name(b.sp)} /></div>
            <Jp as="p" className="b-jp" text={b.jp} />
            <Zh className="b-zh">{b.zh}</Zh>
            <SpeakButton text={b.jp} />
          </div>
        ))}
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
        {phase === 'done' && (
          <div className="card done-card">
            <p className="done-title"><Icon name="check" />會話完成！</p>
            <p className="card-sub">試著把每一句都跟著唸一次，或關掉中文再挑戰一遍。</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={restart}><Icon name="rotate" />再練一次</button>
              <button type="button" className="btn primary" onClick={next}>下一步：練習<Icon name="arrowRight" /></button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
