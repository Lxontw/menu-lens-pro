# MenuLens Pro – 購物車菜單頁功能規格書

## 目標
在使用者完成購物車選項後，提供一個「**生成菜單**」頁面，將已選項目以餐牌形式呈現，同時顯示日文原文、中文譯文、日幣金額及目標貨幣金額（兩種貨幣），並允許直接將項目加入收藏。

## 範圍
- 新增一個頁面視圖（`order-menu-view`）。
- 在購物車觸發條（cart-trigger）或購物車詳細區內新增「生成菜單」按鈕。
- 新視圖展示已選項目清單，每項包含：
  - 日文原名（`nameOriginal`）
  - 中文譯名（`nameTranslated`）
  - 日幣單價及小計（`price × qty`）
  - 目標貨幣單價及小計（依 `appState.settings.currency` 換算）
  - 加入/移除收藏的星號按鈕（金星＝已收藏，空星＝未收藏）
- 頁面底部提供「返回掃描器」與「返回收藏」兩個導航選項。
- 所有資料仍以 `appState.order` 為單一真實來源，不產生新狀態。
- 必須保持既有購物車功能（加減數量、清除、總計）不受影響。

## 功能詳述

### 1. UI 新增
#### 1.1. 首頁／掃描器／結果頁（現有）  
- 在 `#cart-trigger`（購物車觸發條）內加入一個按鈕：
  ```html
  <button id="generate-menu-btn" class="ml-2 text-xs font-medium text-indigo-200 hover:text-indigo-100">生成菜單</button>
  ```
- 或者在 `#cart-content` 內的「確認點餐內容」區塊下方加入同樣按鈕，視 UI 空間而定。

#### 1.2. 新視圖結構（`order-menu-view`）
```html
<section id="order-menu-view" class="absolute inset-0 z-10 flex flex-col bg-slate-50 hidden view-transition overflow-y-auto p-4 pb-24">
    <div class="flex items-center justify-between mb-4 px-2">
        <h3 class="font-bold text-lg">訂單菜單</h3>
        <div class="flex gap-2">
            <button id="menu-back-scan" class="text-indigo-600 text-sm font-medium">返回掃描</button>
            <button id="menu-back-fav" class="text-slate-400 text-sm font-medium">返回收藏</button>
        </div>
    </div>
    <div id="menu-list" class="space-y-4">
        <!-- 每項目由 JS 渲染 -->
    </div>
    <div class="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center text-slate-600">
        <span id="menu-total-jpy">¥0</span> |
        <span id="menu-total-converted">NT$ 0</span>
    </div>
</section>
```
> 注意：此區塊應放在 `<main>` 內部，與既有 `landing-view`、`scanner-view`、`results-view`、`favorites-view` 同層級。

#### 1.3. 單項目渲染模板（菜單項目）
每筆訂單項目（`item`）的 HTML 結構建議如下：
```html
<div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex items-center p-4 gap-4">
    <!-- 左側：數量與收藏星 -->
    <div class="flex-shrink-0 flex flex-col items-center gap-2">
        <span class="text-xs font-bold">×{{item.qty}}</span>
        <button class="w-6 h-6 flex items-center justify-center rounded-full bg-white hover:bg-slate-100 text-indigo-600"
                onclick="EventBus.toggleMenuFavorite({{index}})">
            <i class="fas {{item.favorited ? 'fa-star' : 'fa-star-o'}}"></i>
        </button>
    </div>
    <!-- 中間：名稱與價格 -->
    <div class="flex-1 min-w-0 space-y-1">
        <div class="flex justify-between items-baseline">
            <h4 class="text-lg font-bold text-slate-800 truncate">{{item.nameTranslated}}</h4>
            <span class="text-sm font-medium text-indigo-600">¥{{item.price.toLocaleString()}}</span>
        </div>
        <div class="flex justify-between items-baseline">
            <p class="text-sm font-medium text-slate-500 truncate">{{item.nameOriginal}}</p>
            <span class="text-sm font-medium text-slate-600">
                {{item.price * item.qty * appState.exchangeRates[appState.settings.currency] | currencyFormat}} {{appState.settings.currency}}
            </span>
        </div>
    </div>
</div>
```
> - `currencyFormat` 為簡易的千分位格式化函數（可在 `UIBridge` 中實作）。
> - `item.favorited` 為布林值，表示此項目是否已在 `appState.favorites` 中。
> - `{{index}}` 為該項目在 `appState.order` 中的索引，用於觸發收藏切換。

### 2. 狀態與資料流
- **資料來源**：`appState.order`（現有購物車狀態）。
- **收藏狀態**：透過 `appState.favorites` 判斷 `item.favorited`（`favorites` 中是否存在具有相同 `nameOriginal` 的項目）。
- **貨幣換算**：使用既有 `appState.exchangeRates` 及 `appState.settings.currency`。
- **無新增持久化**：所有狀態仍僅依賴 `localStorage`（經由既有 `saveSettings` / `favorites` 機制），不新增額外鍵。

### 3. 事件與行為
#### 3.1. 開啟菜單頁
- `EventBus` 新增監聽器：
  ```javascript
  document.getElementById('generate-menu-btn').onclick = () => {
      if (appState.order.length === 0) {
          UIBridge.notify('請先選擇菜單項目', 'warn');
          return;
      }
      appState.currentView = 'order-menu';
      UIBridge.switchView('order-menu');
      UIBridge.renderOrderMenu(); // 新增的渲染函式
  };
  ```
- 若購物車為空（`appState.order.length === 0`），則彈出提示（「請先選擇菜單項目」），不切換頁面。

#### 3.2. 渲染菜單頁（`UIBridge.renderOrderMenu`）
1. 清空 `#menu-list` 內容。
2. 若 `appState.order` 為空，顯示「目前沒有訂單項目」。
3. 否則，依序迭代 `appState.order`，為每項目產生上述模板 HTML，並將 `index` 傳入。
4. 計算總計：
   - 日幣總額 = `Σ (item.price × item.qty)`
   - 目標貨幣總額 = 日幣總額 × `appState.exchangeRates[appState.settings.currency]`
   - 更新 `#menu-total-jpy` 與 `#menu-total-converted` 的文字。

#### 3.3. 收藏切換
- `EventBus.toggleMenuFavorite(index)`：
  1. 取得 `item = appState.order[index]`。
  2. 檢查 `appState.favorites` 中是否已存在相同 `nameOriginal` 的項目。
  3. 若存在 → 移除該項目；不存在 → 加入該項目（僅加入一份，不考慮數量）。
  4. 更新 `localStorage.setItem('menulens_favorites', JSON.stringify(appState.favorites))`。
  5. 重新渲染目前項目（僅更新該項目的星號圖示），或重新渲染整個菜單頁（簡單實作）。
- 切換後不影響購物車數量或價格。

#### 3.4. 返回按鈕
- `#menu-back-scan`：切換至 `scanner-view` 並重新開啟相機（`DeviceUtils.startCamera()`）。
- `#menu-back-fav`：切換至 `favorites-view` 並渲染收藏清單（`UIBridge.renderResults(appState.favorites, 'favorites-list')`）。

### 4. 錯誤與邊界情況
| 情況 | 處理方式 |
|------|----------|
| 購物車為空時點擊「生成菜單」 | 彈出警告訊息（「請先選擇菜單項件」），不切換頁面。 |
| API 金鑰未設定 | 依照既有流程，於點擊「開啟掃描器」時會跳出設定抽屜，此功能不受影響。 |
| 貨幣設定變更 | 目標貨幣總額會即時依 `appState.settings.currency` 重新計算（在渲染時取用最新設定）。 |
| 項目同時存在於收藏與購物車 | 收藏星號顯示為已收藏（金星），不影響購物車數量。 |
| 相機未授權 | 切換至掃描器時會顯示既有的錯誤訊息（「無法啟動相機」），不影響菜單頁。 |

### 5. 互動流程說明（文字版）
1. 使用者掃描菜單、選取項目、調整數量 → 購物車觸發條顯示已選件數與日幣總計。
2. 使用者點擊「生成菜單」按鈕。
3. 若購物車為空 → 提示訊息；否則切換至「訂單菜單」頁面。
4. 在菜單頁面，使用者可：
   - 查看每項目的日文原名、中文譯文、單價、小計（日幣及目標貨幣）。
   - 點擊星號將該項目加入/移除收藏（即時更新 UI 及 localStorage）。
   - 點擊「返回掃描器」回到相機介面繼續掃描。
   - 點擊「返回收藏」前往收藏清單檢視已收藏項目。
5. 任意時刻使用者可點擊右上角齒輪圖示開啟設定抽屜變更 API Key、模型、貨幣或飲食偏好，變更後返回菜單頁面會即時反映新貨幣換算率。

### 6. 實作提示（不涉及具體程式碼）
- 所有新增 UI 元素應盡量重用既有樣式類別（如 `bg-white`, `rounded-2xl`, `shadow-sm`, `flex`, `items-center` 等）以保持視覺一致性。
- 新增的渲染函式 (`UIBridge.renderOrderMenu`) 建議放在 `UIBridge` 物件內，與既有 `renderResults`, `updateOrderUI` 同層級。
- 事件監聽器 (`EventBus`) 中的新函式應放在既有事件定義區塊之後，保持統一的命名慣例（`camelCase`）。
- 切換視圖時，請確保既有的 `view-transition` 平滑過渡類別仍然生效（即新視圖也需加入 `view-transition` 類別）。
- 本功能不應直接操作 DOM 外的全局變數（除 `appState` 外），以保持既有解耦架構。

## 驗證重點（待 Gemini CLI 產出程式碼後檢查）
1. 新視圖 (`#order-menu-view`) 正確隱藏/顯示，切換動作流暢。
2. 購物車為空時，點擊「生成菜單」不會導致頁面錯誤，且有適當提示。
3. 功能正確顯示每項目的：
   - 日文原名（`nameOriginal`）
   - 中文譯名（`nameTranslated`）
   - 日幣單價及小計（未四捨五入，保留原始精度）
   - 目標貨幣單價及小計（依目前設定貨幣換算，千分位格式化）
4. 收藏星號點擊後：
   - UI 立即更新星號顯示（空星↔金星）。
   - `localStorage` 中的 `menulens_favorites` 相應增減。
   - 切換至收藏頁可看到最新變更。
5. 總計區域顯示的日幣總計與目標貨幣總計與購物車總計一致。
6. 返回按鈕：
   - 「返回掃描器」會重新開啟相機並顯示掃描介面。
   - 「返回收藏」會顯示收藏清單（已加入的項目）。
7. 切換貨幣（TWD/HKD/USD）後，菜單頁面的目標貨幣總額即時更新。
8. 頁面切換後，既有購物車功能（加減數量、清除、總計）仍然正常運作。
9. 無新增的 `localStorage` 鍵名（只使用既有的 `menulens_api_key`, `menulens_model`, `menulens_currency`, `menulens_pref_custom`, `menulens_favorites`）。
10. 程式碼保持既有的 `UIBridge`, `CoreLogic`, `DeviceUtils`, `EventBus` 架構，未直接在事件處理函式中寫入大量 DOM 操作邏輯（盡量呼叫 `UIBridge` 方法）。

---  
此規格書完成後，請提供給 Gemini CLI 產出對應程式碼；我將負責監督與檢驗產出的程式碼是否符合上述需求與限制。若有任何需求變更或需要進一步澄清，請隨時告知。祝開發順利！