# 日語練習帳 N5・N4

給剛背完五十音的人：像參考書一樣有系統，但每一課都能動手練習。每天一課，大約 30 分鐘。

- **30 課**：第 1–20 課是 N5 核心文法，第 21–30 課是 N4 常用文法
- **每課 4 步驟**：單字 → 文法（接續公式、例句、台灣人常犯的錯、小試身手）→ 生活會話角色扮演 → 8 題練習
- **題型**：選擇、句子重組、打字（可以直接打羅馬拼音）、聽力
- **每日任務**：今天要學的課＋到期的單字卡，完成就在月曆上蓋章、累積連續天數
- **複習**：單字卡間隔複習（快忘記時才出現）＋錯題本
- **其他**：振假名開關、遮住中文自我測驗、瀏覽器日語朗讀、索引查詢、深色模式、可加到手機主畫面離線使用
- **雲端同步**（選用）：用 Email 登入後，手機和電腦的進度自動合併

## 在自己電腦上執行

需要 [Node.js](https://nodejs.org/) 20 以上。

```bash
npm install
npm run dev
```

打開 <http://localhost:5173> 就能用。沒有設定 Supabase 也能完整使用，進度會存在瀏覽器裡。

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 開發模式（改程式會即時更新） |
| `npm run build` | 型別檢查 + 打包到 `dist/` |
| `npm run preview` | 預覽打包結果（<http://localhost:4173/learn_japanese/>） |
| `npm run check:data` | 檢查課程資料：振假名格式、答案、會話角色等 |

> 這台電腦的環境變數有 `NODE_ENV=production`，會讓 npm 略過開發用套件。專案裡的 `.npmrc`（`include=dev`）已經處理好了，照常 `npm install` 就行。

## 設定雲端同步（Supabase）

只有你自己使用的話，Supabase 的免費方案就很夠用。

1. **建立專案**：到 [supabase.com](https://supabase.com) 註冊，按 New project。Region 選 Tokyo 或 Singapore 會比較快。
2. **建立資料表**：左側 SQL Editor → 貼上 [`supabase/schema.sql`](supabase/schema.sql) 的內容 → Run。
3. **設定登入網址**：Authentication → URL Configuration
   - Site URL：`https://lily0902.github.io/learn_japanese/`
   - Redirect URLs 加入兩個：`http://localhost:5173/**`、`https://lily0902.github.io/learn_japanese/**`
4. **讓信裡也有驗證碼**（建議）：Authentication → Email Templates，在「Magic Link」和「Confirm signup」兩個範本裡加一行 `驗證碼：{{ .Token }}`。
   登入連結必須在「按下寄送的那個瀏覽器」打開；如果你在電腦上按寄送、卻在手機收信，就改輸入信裡的 6 位數驗證碼。
5. **填入金鑰**：Project Settings → API，複製 Project URL 和 `anon` `public` key。
   - 本機：把 `.env.example` 複製成 `.env.local`，填入這兩個值，重新 `npm run dev`
   - GitHub Pages：repo 的 Settings → Secrets and variables → Actions → **Variables**，新增 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`
6. **登入一次**：到網站的「設定 → 雲端同步」輸入 Email，收信登入。
7. **關閉註冊**：第一次登入成功後，到 Authentication → Sign In / Providers，關掉「Allow new users to sign up」。這樣就只有你能登入。

**安全性**：`anon` key 本來就是設計給前端用的公開金鑰，資料靠資料表的 Row Level Security 保護——每個登入的人只能讀寫自己那一列。

**同步規則**：兩台裝置都有學的話會自動合併，不會互相覆蓋。課程步驟只要任一邊完成就算完成；單字卡、錯題和設定以最後更新的為準。

## 部署到 GitHub Pages

1. 把專案 push 到 GitHub 的 `main` 分支。
2. repo 的 Settings → Pages → Source 選 **GitHub Actions**。
3. 之後每次 push 到 `main`，[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) 會自動檢查課程資料、打包並部署。

網址會是 <https://lily0902.github.io/learn_japanese/>。用手機瀏覽器打開後選「加到主畫面」，就能像 App 一樣使用，沒網路時也能打開。

## 專案結構

```
src/
├── data/            課程內容（n5-part1.ts、n5-part2.ts、n4.ts）與資料型別 types.ts
├── lib/             不依賴 React 的工具：振假名、羅馬拼音轉假名、語音、間隔複習、日期
├── state/           全域狀態（store.ts）、動作（actions.ts）、查詢（selectors.ts）、
│                    合併規則（merge.ts）、Supabase 同步（sync.ts）
├── components/      共用元件：版面、圖示、振假名文字、朗讀按鈕、印章、提示訊息
├── pages/           各頁面：今日、目錄、課程、複習、索引、設定
├── unit/            課程的四個步驟：單字、文法、會話、練習
└── quiz/            題目引擎：選擇、聽力、重組、打字
```

狀態管理沒有用額外套件，而是用 React 內建的 `useSyncExternalStore` 接一個小型 store（[`src/state/store.ts`](src/state/store.ts)），適合拿來理解 React 怎麼訂閱外部資料。

## 新增或修改課程

課程都在 `src/data/`，格式說明寫在 [`src/data/types.ts`](src/data/types.ts)。重點：

- 振假名寫成 `食[た]べます`，漢字後面直接接 `[讀音]`
- `**重點**` 會變成螢光筆，`（　）` 會變成填空底線
- 選項陣列的**第一個**永遠是正確答案，畫面上會自動打亂

改完跑一次 `npm run check:data`，它會抓出格式錯誤、沒有說明的錯誤選項、打字題答案無法用假名輸入等問題。
