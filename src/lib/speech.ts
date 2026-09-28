import { useSyncExternalStore } from 'react';
import { BLANK, kana, plain } from './ruby';

/* 瀏覽器內建的日語語音（Web Speech API） */

export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

let voices: SpeechSynthesisVoice[] = [];
const listeners = new Set<() => void>();

function loadVoices() {
  if (!speechSupported) return;
  voices = window.speechSynthesis.getVoices().filter((v) => /^ja([-_]|$)/i.test(v.lang));
  listeners.forEach((l) => l());
}
if (speechSupported) {
  loadVoices();
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

/** 目前可用的日語語音（會隨瀏覽器載入而更新） */
export function useJapaneseVoices() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => voices,
  );
}

const VOICE_KEY = 'nihongo-voice';
export const getPreferredVoice = () => { try { return localStorage.getItem(VOICE_KEY) ?? ''; } catch { return ''; } };
export const setPreferredVoice = (uri: string) => { try { localStorage.setItem(VOICE_KEY, uri); } catch { /* ignore */ } };

function pickVoice(): SpeechSynthesisVoice | null {
  const chosen = voices.find((v) => v.voiceURI === getPreferredVoice());
  if (chosen) return chosen;
  return voices.find((v) => /Nanami|Google|Natural|Online|Kyoko|O-ren/i.test(v.name)) ?? voices[0] ?? null;
}

let rate = 0.9;
export const setSpeechRate = (r: number) => { rate = r; };

/**
 * 朗讀日文。useKana=true 時改用假名唸（單字單獨出現時，避免多音字唸錯）。
 * 回傳的 Promise 在唸完時 resolve。
 */
export function speak(text: string, useKana = false): Promise<boolean> {
  return new Promise((resolve) => {
    if (!speechSupported) { resolve(false); return; }
    const synth = window.speechSynthesis;
    synth.cancel();
    const src = text.replaceAll(BLANK, '、').replace(/[→／]/g, '、');
    const u = new SpeechSynthesisUtterance(useKana ? kana(src) : plain(src));
    u.lang = 'ja-JP';
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = rate;
    let finished = false;
    const finish = (ok: boolean) => { if (!finished) { finished = true; resolve(ok); } };
    u.onend = () => finish(true);
    u.onerror = () => finish(false);
    // 有些瀏覽器不會觸發 onend，用計時器保底
    window.setTimeout(() => finish(true), 1500 + (plain(src).length * 260) / rate);
    synth.speak(u);
  });
}

export const stopSpeaking = () => { if (speechSupported) window.speechSynthesis.cancel(); };
