import { useState, type MouseEvent } from 'react';
import { plain } from '../lib/ruby';
import { speak, speechSupported } from '../lib/speech';
import { Icon } from './Icon';
import { toast } from './Toast';

let warnedNoVoice = false;

interface Props {
  text: string;
  /** 用假名唸（單字用） */
  useKana?: boolean;
  label?: string;
  className?: string;
}

export function SpeakButton({ text, useKana = false, label, className = '' }: Props) {
  const [speaking, setSpeaking] = useState(false);

  const play = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!speechSupported) {
      toast('這個瀏覽器不支援語音朗讀，建議改用 Chrome 或 Edge');
      return;
    }
    if (!warnedNoVoice && window.speechSynthesis.getVoices().length > 0 &&
        !window.speechSynthesis.getVoices().some((v) => /^ja/i.test(v.lang))) {
      warnedNoVoice = true;
      toast('找不到日語語音，可能會唸不出來。到「設定」看怎麼安裝');
    }
    setSpeaking(true);
    await speak(text, useKana);
    setSpeaking(false);
  };

  return (
    <button
      type="button"
      className={`icon-btn ${speaking ? 'speaking' : ''} ${className}`}
      onClick={play}
      aria-label={label ?? `播放「${plain(text)}」`}
    >
      <Icon name="volume" />
    </button>
  );
}
