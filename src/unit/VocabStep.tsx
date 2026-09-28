import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Jp } from '../components/Jp';
import { CoverToggle, wait } from '../components/Misc';
import { SpeakButton } from '../components/SpeakButton';
import { toast } from '../components/Toast';
import type { Vocab } from '../data/types';
import { speak, speechSupported, stopSpeaking } from '../lib/speech';
import type { StepProps } from '../pages/UnitPage';
import { addUnitCards } from '../state/actions';
import { useAppState } from '../state/store';

function VocabCard({ w, active }: { w: Vocab; active: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <li className={`vcard ${show ? 'show' : ''} ${active ? 'active' : ''}`} onClick={() => setShow((v) => !v)}>
      <Jp className="v-jp" text={w[0]} as="div" />
      <div className="v-zh">{w[1]}</div>
      {w[2] && <div className="v-pos">{w[2]}</div>}
      <SpeakButton text={w[0]} useKana />
    </li>
  );
}

export function VocabStep({ unit, done, complete, next }: StepProps) {
  const { settings } = useAppState();
  const [playing, setPlaying] = useState(-1);
  const stop = useRef(false);

  useEffect(() => () => { stop.current = true; stopSpeaking(); }, []);

  const playAll = async () => {
    if (playing >= 0) { stop.current = true; stopSpeaking(); setPlaying(-1); return; }
    if (!speechSupported) { toast('這個瀏覽器不支援語音朗讀'); return; }
    stop.current = false;
    for (let i = 0; i < unit.vocab.length; i++) {
      if (stop.current) break;
      setPlaying(i);
      await speak(unit.vocab[i][0], true);
      await wait(350);
    }
    setPlaying(-1);
  };

  const finish = () => {
    if (!done) {
      const added = addUnitCards(unit);
      complete();
      toast(added ? `已加入 ${added} 張單字卡，之後會在「複習」出現` : '單字步驟完成');
    }
    next();
  };

  return (
    <>
      <div className="sec-head">
        <h2><span className="sec-no">1</span>單字</h2>
        <CoverToggle />
      </div>
      <p className="hint">
        點 <Icon name="volume" className="ic-sm" /> 聽發音。開啟「遮住中文」可以自我測驗，點卡片就會顯示答案。
      </p>
      <ul className={`vocab-grid ${settings.hideZh ? 'zh-cover' : ''}`}>
        {unit.vocab.map((w, i) => <VocabCard key={w[0]} w={w} active={playing === i} />)}
      </ul>
      <div className="step-foot">
        <button type="button" className="btn" onClick={playAll}>
          <Icon name={playing >= 0 ? 'stop' : 'play'} />
          {playing >= 0 ? '停止播放' : '全部播放'}
        </button>
        <button type="button" className="btn primary" onClick={finish}>
          {done ? '下一步：文法' : '讀完了，加入單字卡'}
          <Icon name="arrowRight" />
        </button>
      </div>
    </>
  );
}
