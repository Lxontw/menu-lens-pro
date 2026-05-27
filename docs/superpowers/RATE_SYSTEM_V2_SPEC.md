# MenuLens Pro - 匯率系統 v2.0 規格書 (方案 2)

## 1. 目標
升級現有的匯率換算系統，移除寫死的匯率數值，改為支援 **自動從網路抓取（Frankfurter API）** 與 **使用者手動微調** 兩並行模式，並能針對不同目標貨幣獨立儲存匯率。

## 2. 功能詳述

### 2.1 UI 變更 (`index.html`)
*   **自訂匯率區塊**：在「目標貨幣」選單下方新增。
    *   **Label (`#rate-label`)**：動態顯示換算關係（例：`1 JPY = ? TWD`）。
    *   **輸入框 (`#rate-input`)**：`type="number"`, `step="0.0001"`, `placeholder="請輸入匯率..."`。
    *   **自動獲取按鈕 (`#fetch-rate-btn`)**：放置於 Label 旁邊，點擊後觸發 API 抓取。
*   **提示文字**：註明匯率若為 0 將不進行換算（顯示為「未設定」）。

### 2.2 邏輯實作 (`logic.js`)
*   **狀態與儲存**：
    *   移除 `appState.exchangeRates` 中的寫死資料。
    *   新增 `getExchangeRate(currency)`：優先從 `localStorage` 讀取 `menulens_rate_[CURRENCY]`。若無，回傳 `0`。
    *   修改 `CoreLogic.saveSettings`：儲存時，將 `#rate-input` 的值存入當前選擇貨幣對應的 `localStorage` key（例如 `menulens_rate_TWD`）。
*   **API 整合 (Frankfurter)**：
    *   實作 `CoreLogic.fetchLatestRate(base, target)`。
    *   Endpoint 範例: `https://api.frankfurter.dev/v2/latest?base=JPY&symbols=TWD`。
*   **事件處理**：
    *   **貨幣切換**：當 `#currency-select` 發生 `change` 事件時，自動更新 `#rate-label` 的文字（例如 `1 JPY = ? HKD`），並從 `localStorage` 載入該貨幣儲存的匯率至 `#rate-input`。
    *   **自動獲取按鈕**：點擊 `#fetch-rate-btn` 時，呼叫 `fetchLatestRate`。成功後將數值填入 `#rate-input`，並透過 `UIBridge.notify` 顯示成功訊息。若失敗則顯示錯誤。

### 2.3 UI 優化補強 (v1.1 Fix 3)
*   **字體大小一致化**：
    *   修改 `UIBridge.renderOrderMenu`，將日文原文 (`item.nameOriginal`) 的 class 從 `text-base` 改為 `text-lg font-medium`，確保與中文譯文的字體大小一致，提升對照閱讀體驗。

### 2.4 金額顯示處理
*   **未設定匯率**：在 `UIBridge.renderOrderMenu` 與 `UIBridge.updateOrderUI` 中，若取出的匯率為 `0` 或空值，目標貨幣的金額顯示應為「未設定」，而非「NT$ 0」。

---

## 3. 檢驗清單 (Verification Checklist)

開發完成後，請依序執行以下測試以確保功能符合規格：

### A. 設定介面檢驗
- [ ] 開啟設定抽屜時，能看到「自訂匯率」欄位與「自動獲取」按鈕。
- [ ] 切換「目標貨幣」選單（例如從 TWD 改為 HKD），`#rate-label` 會同步更新為 `1 JPY = ? HKD`。
- [ ] 切換貨幣後，`#rate-input` 會正確載入先前為該貨幣儲存的數值。

### B. 自動抓取檢驗
- [ ] 點擊「自動獲取」按鈕，輸入框能在短時間內自動填入一個小數值。
- [ ] 透過瀏覽器開發者工具檢查 Network，確認是呼叫 `api.frankfurter.dev`，並且沒有報錯。
- [ ] 在無網路狀態下點擊按鈕，會彈出錯誤提示，且應用程式不會崩潰。

### C. 儲存與換算檢驗
- [ ] 手動修改匯率數值，點擊「儲存並返回」。重新整理網頁後打開設定，該數值依然存在。
- [ ] 在購物車與「訂單菜單」頁面中，目標貨幣金額（如 NT$）的計算結果等於 `日幣總額 × 自訂匯率`。
- [ ] 將匯率手動設為 `0` 並儲存，相關的金額顯示應為「未設定」。

### D. UI 一致性檢驗
- [ ] 進入「訂單菜單」頁面，日文原文與中文譯文的字體大小視覺上一致（皆為 `text-lg`）。
