import { useSyncExternalStore } from 'react';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { mergeStates, normalizeState } from './merge';
import { getState, onLocalChange, setState } from './store';

/*
 * 雲端同步（Supabase）
 * - 沒設定環境變數時整個功能關閉，網站照常用本機儲存
 * - 登入後：抓雲端 → 跟本機合併 → 存回本機 → 上傳合併結果
 * - 本機有變動時，等 2.5 秒沒有新變動再同步一次（debounce）
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export type SyncStatus = 'disabled' | 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncInfo {
  status: SyncStatus;
  email?: string;
  lastSynced?: number;
  error?: string;
}

let info: SyncInfo = { status: supabase ? 'signed-out' : 'disabled' };
const listeners = new Set<() => void>();
function setInfo(patch: Partial<SyncInfo>) {
  info = { ...info, ...patch };
  listeners.forEach((l) => l());
}

export function useSyncInfo(): SyncInfo {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => info,
  );
}

let session: Session | null = null;
let timer: number | undefined;
let running: Promise<void> | null = null;
let again = false;

function describe(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

/** 抓雲端、合併、上傳。同一時間只跑一個，跑的途中又有變動就再跑一次。 */
export async function syncNow(): Promise<void> {
  if (!supabase || !session) return;
  if (running) { again = true; return running; }
  if (!navigator.onLine) { setInfo({ status: 'offline' }); return; }

  const client = supabase;
  const userId = session.user.id;
  running = (async () => {
    setInfo({ status: 'syncing' });
    const { data, error } = await client.from('progress').select('data').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    if (data?.data) setState(mergeStates(getState(), normalizeState(data.data)), { silent: true });
    const { error: upErr } = await client
      .from('progress')
      .upsert({ user_id: userId, data: getState(), updated_at: new Date().toISOString() });
    if (upErr) throw upErr;
    setInfo({ status: 'synced', lastSynced: Date.now(), error: undefined });
  })()
    .catch((err) => {
      setInfo(navigator.onLine ? { status: 'error', error: describe(err) } : { status: 'offline' });
    })
    .finally(() => {
      running = null;
      if (again) { again = false; void syncNow(); }
    });
  return running;
}

function scheduleSync() {
  if (!session) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void syncNow(), 2500);
}

/** 登入連結回來時網址會帶 ?code=...，登入完成後清掉 */
function cleanAuthParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('code')) {
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  }
}

export function initSync() {
  if (!supabase) return;
  onLocalChange(scheduleSync);

  supabase.auth.onAuthStateChange((event, s) => {
    session = s;
    if (!s) {
      setInfo({ status: 'signed-out', email: undefined, lastSynced: undefined });
      return;
    }
    setInfo({ email: s.user.email ?? undefined });
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
      cleanAuthParams();
      // 官方建議不要在這個 callback 裡直接 await 其他 Supabase 呼叫，所以延後執行
      window.setTimeout(() => void syncNow(), 0);
    }
  });

  window.addEventListener('online', () => void syncNow());
  let lastFocusSync = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastFocusSync > 30_000) {
      lastFocusSync = Date.now();
      void syncNow();
    }
  });
}

export async function sendMagicLink(email: string) {
  if (!supabase) throw new Error('尚未設定 Supabase');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
  });
  if (error) throw error;
}

/** 在另一台裝置收信時，可以改輸入信裡的 6 位數驗證碼 */
export async function verifyEmailCode(email: string, token: string) {
  if (!supabase) throw new Error('尚未設定 Supabase');
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

export async function signOut() {
  await supabase?.auth.signOut();
}
