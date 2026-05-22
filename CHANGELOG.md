# 📜 MenuLens Pro 更新日誌 (CHANGELOG)

## [v0.4.0] - 2026-05-22
### 🚀 新功能
- **點餐菜單頁面**：購物車點選完畢後，點擊「生成菜單」按鈕可切換至獨立菜單頁面。
- **雙語雙幣別顯示**：菜單頁同時顯示日文原名、中文譯名、日幣金額（¥）及目標貨幣金額（TWD/HKD/USD）。
- **菜單頁收藏**：每項目旁附星號按鈕，可直接加入／移除收藏，即時同步 `localStorage`。
- **貨幣即時更新**：在菜單頁面變更貨幣設定後，儲存時自動重新計算並刷新顯示。

### 🛠️ 架構擴充
- `UIBridge` 新增 `renderOrderMenu()` 與 `currencyFormat()` 方法。
- `EventBus` 新增 `toggleMenuFavorite()` 方法及相關事件綁定。
- `switchView` 擴充支援 `order-menu-view`，菜單頁自動隱藏底部導覽列。
- 順帶修復 `index.html` 中重複的 Help Modal 區塊。

---

## [v0.3.0] - 2026-05-20 (成品版)
### 🚀 新功能
- **視覺參考系統**：整合 `LoremFlickr` API，根據 AI 提取的 `search_term` 自動匹配食物圖片。
- **增強型 AI 辨識**：更新 Prompt，新增過敏原警告 (`allergen_warning`) 與飲食標籤 (`dietary_tags`)。
- **收藏夾系統**：實作本地收藏邏輯，支援對美食項目的愛心標記與持久化儲存。
- **UX 優化**：加入讀取狀態指示器與平滑的視圖切換動畫。

### 🛠️ 架構重構
- **實作 UIBridge 模式**：將所有 DOM 操作從 `logic.js` 中完全抽離，建立標準化的 UI 接口。
- **狀態驅動渲染**：全面採用 `appState` 驅動 UI 更新，實現真正的邏輯與視圖解耦。
- **接口標準化**：定義統一的 JSON 數據格式，為日後遷移至 Stitch 等框架做準備。

---

## [v0.2.0] - 2026-05-20
### 🛠️ 基礎建構
- 建立現代化 Tailwind CSS 行動端介面。
- 實作 Gemini Multimodal API 基礎串接。
- 實作本地設定儲存 (`localStorage`)。
- 建立基礎視圖切換邏輯。

---

## [v0.1.0] - 2026-05-20
### 🧪 概念驗證 (POC)
- 驗證 Gemini API 對日本菜單圖片的辨識能力。
- 實作初步的文字翻譯列表。
- 驗證多模態輸入 (Image to Text) 的可行性。
