-- 日語練習帳：雲端同步用的資料表
-- 在 Supabase 後台的 SQL Editor 貼上整段執行一次即可。

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 開啟 Row Level Security：沒有符合下面規則的請求一律拒絕
alter table public.progress enable row level security;

-- 每個人只能讀寫「自己那一列」
drop policy if exists "read own progress" on public.progress;
create policy "read own progress" on public.progress
  for select using (auth.uid() = user_id);

drop policy if exists "insert own progress" on public.progress;
create policy "insert own progress" on public.progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own progress" on public.progress;
create policy "update own progress" on public.progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
