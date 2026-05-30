# MenuLens Pro 模組化與收據 OCR 設計規格

## 目標

先把 MenuLens Pro 從單一大型 `logic.js` 重構成小型 ES Modules 架構，並保持它仍然是純靜態、適合手機使用的 Web App。完成模組化後，再在這個架構上加入「收據 OCR」與「帳本紀錄」功能。

手機使用是主要需求。正式使用時建議部署到 GitHub Pages 或其他 HTTPS 靜態網站，因為手機瀏覽器通常要求 HTTPS 才能穩定使用相機。直接用 `file://` 打開 `index.html` 不適合作為主要使用方式。

## 目前狀態

- `index.html` 是主畫面，現在載入的是 `logic.js`。
- `logic.js` 同時放了全域狀態、帳本邏輯、生活工具邏輯、UI 渲染、Gemini API 呼叫、相機工具、事件綁定。
- 程式已經有概念上的分層：`appState`、`CoreLogic`、`UIBridge`、`DeviceUtils`、`EventBus`。
- `index.html` 目前在第一個 `</html>` 後面還有重複殘留的 HTML。
- `logic.js` 會操作 `finance-view` 和 `life-tools-view`，但目前主版 `index.html` 沒有這兩個 section。
- `index-beta.html` 有比較完整的帳本與生活工具畫面，但它不是目前主入口，而且裡面有額外 inline script，不適合直接當成最終架構。

## 架構方向

使用 ES Modules，不導入打包工具。

`index.html` 改成載入：

```html
<script type="module" src="./src/main.js"></script>
```

預計檔案結構：

```text
src/
  main.js
  state/app-state.js
  storage/local-storage.js
  core/menu-service.js
  core/rate-service.js
  core/finance-service.js
  core/life-tools-service.js
  core/receipt-service.js
  device/camera.js
  ui/ui-bridge.js
  events/event-bus.js
```

各檔責任：

- `main.js`：App 啟動流程、初始畫面渲染、初始化事件。
- `state/app-state.js`：建立單一 `appState`，並從 localStorage 載入初始狀態。
- `storage/local-storage.js`：集中管理 localStorage key、JSON 讀寫、錯誤 fallback。
- `core/menu-service.js`：Gemini 菜單辨識、菜單結果整理。
- `core/rate-service.js`：匯率取得、預設匯率、貨幣格式化相關工具。
- `core/finance-service.js`：新增帳本、儲存帳本、加入交易項目、刪除帳本。
- `core/life-tools-service.js`：備忘錄編碼/解碼、單位換算、生活工具資料。
- `core/receipt-service.js`：Gemini 收據 OCR、JSON 解析、收據資料正規化。
- `device/camera.js`：啟動相機、停止相機、擷取畫面、圖片轉 base64。
- `ui/ui-bridge.js`：只負責 DOM 更新、畫面切換、各區塊 render。
- `events/event-bus.js`：綁定事件，串接 UI、狀態、核心服務與相機工具。

## 資料流程

菜單掃描流程：

1. 使用者開啟掃描器或上傳圖片。
2. `event-bus.js` 從 `camera.js` 取得 base64 圖片。
3. `menu-service.js` 呼叫 Gemini，回傳整理後的菜單項目。
4. `event-bus.js` 更新 `appState.results`，並把結果存進 localStorage。
5. `ui-bridge.js` 渲染翻譯結果與點餐清單。

收據掃描流程：

1. 使用者從帳本畫面選擇收據掃描模式。
2. `event-bus.js` 從 `camera.js` 取得 base64 圖片。
3. `receipt-service.js` 呼叫 Gemini OCR，回傳整理後的收據資料。
4. `ui-bridge.js` 顯示收據辨識結果畫面。
5. 使用者確認後，選擇要儲存到哪個帳本。
6. `finance-service.js` 把收據項目轉成帳本交易紀錄並儲存。
7. `ui-bridge.js` 重新渲染帳本摘要。

## UI 範圍

第一階段模組化時，盡量保留目前 UI，不做視覺重設計。

模組化時必須順手修正：

- 移除 `index.html` 第一個 `</html>` 之後的重複殘留內容。
- 在主版 `index.html` 補上 `finance-view` 和 `life-tools-view`。
- 這兩個畫面可以參考 `index-beta.html`，但要改成符合目前主版使用的 Font Awesome 樣式。
- 保留目前 bottom navigation 和既有 DOM id，避免重構時破壞現有事件綁定。

收據 OCR 第二階段新增：

- 在帳本畫面加入收據掃描入口。
- 新增 `receipt-result-view`，顯示店家、日期、總金額、幣別、項目清單、儲存/取消按鈕。
- 新增「儲存到帳本」流程，讓收據資料可以進入指定帳本。

## 錯誤處理

- 沒有 Gemini API Key 時，沿用目前開啟設定提醒的行為。
- Gemini 回傳內容可能包在 markdown code block 或含有多餘文字，解析時要能容錯。
- 收據 OCR 結果無效時，要顯示清楚通知，並讓使用者可以重新掃描或上傳圖片。
- localStorage JSON 壞掉時，不應讓 App 啟動失敗，要 fallback 到預設值。
- 相機啟動失敗時，維持目前通知方式，並保留圖片上傳作為替代入口。

## 手機部署方式

此專案維持純靜態網站：

- 正式使用不需要 Node runtime。
- 不需要 Vite、Webpack 或其他打包流程。
- 可以部署到 GitHub Pages。
- 相機功能應該在 HTTPS 網址上測試，不只用 `file://` 測。

本機測試時，可以在專案根目錄開一個簡單 static server，再用手機連到同一網路下的電腦 IP 測試。

GitHub 上傳與發布流程也要納入規格：

1. 程式整理完成後，提交到 Git 本地 commit。
2. 推送到 GitHub repository。
3. 以 repository root 作為靜態網站來源，確認 `index.html` 位於根目錄，`src/` 以相對路徑載入。
4. 在 GitHub Pages 啟用 `main` 或實際使用分支的部署。
5. 部署完成後，用 GitHub Pages 網址在手機上驗證相機、上傳圖片、localStorage、帳本與收據流程。

這代表模組化設計必須維持「直接以 repository 靜態檔案結構部署即可運作」，不能依賴 build 輸出目錄。

## 測試與驗證

目前專案沒有 `package.json` 或測試框架，所以第一階段先用瀏覽器手動驗證：

- 用 local static server 打開 App。
- 確認啟動時 console 沒有錯誤。
- 確認設定抽屜可以開啟與儲存。
- 確認有 API Key 時，圖片上傳流程仍會執行菜單辨識。
- 確認翻譯結果、點餐清單、收藏、生成菜單、帳本 tab、生活工具 tab 都能顯示。
- 確認 localStorage 資料重新整理後仍存在。

模組拆分穩定後，如果收據解析與儲存邏輯需要更穩，可以再加輕量測試。收據 OCR 的資料整理邏輯要寫成可單獨測試，不必真的呼叫 Gemini。

## 實作順序

1. 清理 `index.html` 結構，補回缺少的帳本/生活工具畫面。
2. 建立 `src/` 模組資料夾，先搬狀態與 localStorage helper。
3. 搬純邏輯服務：匯率、帳本、生活工具、菜單辨識。
4. 搬相機工具。
5. 搬 UI bridge。
6. 搬 event bus，並透過 `main.js` 串起所有模組。
7. 先驗證現有功能，再新增收據 OCR。
8. 新增 receipt service 與收據結果狀態。
9. 新增收據結果畫面與儲存到帳本流程。
10. 先用模擬或範例 Gemini 回應驗證收據流程，再做真實 API 測試。
11. 提交到 Git，推送 GitHub，啟用或更新 GitHub Pages，並用手機實機驗證。

## 不做的事

- 這一階段不導入 Vite、npm 或 build pipeline。
- 不重新設計 UI 視覺。
- 不改用 React/Vue/Svelte 等框架。
- 不更改既有 localStorage key，除非同時寫明確 migration。
- 不修改無關的 archive 檔案。

## 驗證回修要求（本輪必修）

以下問題已在第一次實作後被驗證抓到，本輪必須一起修完，否則視為未完成：

1. `localStorage` 容錯
   - 不可在 `app-state.js` 直接對可能壞掉的 JSON 做裸 `JSON.parse(...)`。
   - 必須把 JSON 讀取 fallback 集中到 `storage/local-storage.js`。
   - 任一 key 壞掉時，App 仍要能啟動並回退到預設值。

2. Gemini / OCR JSON 容錯
   - `menu-service.js` 與 `receipt-service.js` 不能只移除 markdown code block 後直接 `JSON.parse`。
   - 必須能處理前後夾雜說明文字、markdown code block、或非完美純 JSON 的情況。
   - `receipt-service.js` 必須做收據資料正規化，至少保證 store/date/total/currency/items 結構安全可 render。

3. 收據模式的圖片上傳流程
   - 目前 receipt 模式不能只改 `scan-btn`；`upload-btn` / `file-input` 也必須進入 receipt OCR flow。
   - 相機失敗時，receipt 模式仍必須可用圖片上傳完成辨識。

4. API Key 缺失時的 receipt 行為
   - 從帳本進入收據掃描前，也要沿用主掃描相同策略：提示缺少 API Key，並打開設定抽屜。
   - 不可只在 OCR 階段丟 generic failure。

5. 收據無效結果處理
   - 收據辨識結果缺欄位、格式錯誤、items 非陣列、total 非數值等情況，不可讓 UI crash。
   - 要顯示清楚通知，並保留重新掃描或重新上傳的可行路徑。

6. Life Tools 畫面不可自毀 DOM
   - 不可用會破壞 `life-tools-view` 主結構的方式，讓返回工具首頁失效。
   - `renderLifeTools()` 後必須能正常回到工具列表。
   - 保留主要 DOM id 與穩定事件流，避免覆蓋整個 view 後找不到原本節點。

7. 帳本保存收據資料
   - 「儲存到帳本」不能只存一筆過度簡化資料。
   - 至少要把 receipt 的 date、currency、items 或可追蹤的 receipt metadata 存進帳本交易紀錄，讓這筆匯入不是只有金額總和。

8. 匯率自訂值清空/歸零一致性
   - 使用者若清空或設為 0，不可殘留舊的 `menulens_rate_*` 值造成 UI 與實際換算不一致。

9. Scanner / receipt mode 狀態切換
   - 不可用脆弱方式造成 scan button、upload flow、返回流程互相污染。
   - 收據模式取消、失敗、成功後，都要能正確回復一般菜單掃描模式。

10. 本輪禁止範圍漂移
   - 不要改 archive 內無關檔案。
   - 不要刪除或搬動與本次修正無關的文件。
   - 保持 `index.html` + `src/` 可直接作為 GitHub Pages 靜態部署來源。

## 第三輪驗證補強（仍未過關，必修）

1. 幣別切換與匯率輸入欄同步
   - 使用者在設定抽屜切換 `currency-select` 時，`rate-input` 必須立即切換為該幣別對應的已存匯率或預設值。
   - 不可把前一個幣別的舊值誤存到新幣別，例如把 TWD 的數字存成 USD rate。
   - 實測發現：目前 `currency-select` 的 `change` 事件會呼叫 `updateSettingsUI()` 後把選取值重設回 `appState.settings.currency`（例如立刻跳回 TWD），導致使用者無法真正切換幣別。這個 bug 必須修掉。

2. 收據結果不可把無效資料靜默當成成功
   - 若 OCR 回傳缺少基本有效資訊（例如 total 非數值且 items 也空、或整體結構明顯無效），應視為辨識失敗。
   - 必須通知使用者重新掃描或重新上傳，而不是直接顯示一份全預設值的成功結果。

3. Receipt mode 失敗後要正確回復 menu mode
   - `handleReceiptScan()` 失敗時，不可讓 scanner mode 殘留在 receipt。
   - 失敗、取消、成功後，都要能乾淨回到一般菜單掃描模式。

4. Gemini 回應結構容錯要再補強
   - 不可直接假設 `data.candidates[0].content.parts[0].text` 一定存在。
   - 需要先做路徑檢查，對空 candidates、安全封鎖、奇怪回應格式給出可控錯誤訊息。

5. 若能在不大改 UI 的前提下順手補強
   - 避免明顯把模型輸出或使用者輸入原樣塞進 `innerHTML` 造成風險；至少對高風險文字欄位做基本 escape。
   - 但若這項會擴散太大，可優先完成前 1–4 項。
