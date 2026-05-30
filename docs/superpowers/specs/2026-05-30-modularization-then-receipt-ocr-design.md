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
