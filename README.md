# 🍱 MenuLens Pro | 智慧視覺菜單翻譯助手

MenuLens Pro 是一款專為日本旅行設計的 AI 菜單翻譯工具。它不僅能將日文菜單翻譯成繁體中文，還能透過 AI 視覺匹配提供食物縮圖，解決「翻譯對了但不知道是什麼」的點餐痛點。

## ✨ 核心功能

- **📸 智慧掃描**：利用 Gemini 多模態 AI，即時辨識照片中的菜名與價格。
- **🖼️ 視覺參考 (Visual Support)**：根據辨識出的菜名，自動匹配高品質美食圖片，讓您視覺化決定點什麼。
- **⚠️ 安全飲食標註**：自動辨識潛在過敏原（如海鮮、花生）與飲食偏好（如素食、辛辣）。
- **💰 即時匯率換算**：支援 JPY 轉 TWD / HKD / USD，讓您對消費金額有精確掌握。
- **❤️ 美食收藏夾**：一鍵收藏喜歡的菜單，方便隨時回顧。
- **📱 原生 App 體驗**：採用 Mobile-First 設計，提供流暢的側滑設定與視圖切換。

## 🚀 快速上手

### 1. 取得 API Key
本工具使用 Google Gemini API。請前往 [Google AI Studio](https://aistudio.google.com/apikey) 建立一個免費的 API Key。

### 2. 設定與使用
1. 打開 `index.html` 或訪問部署後的網址。
2. 點擊右上角 **設定 (⚙️)** 圖示。
3. 貼入您的 **Gemini API Key**，選擇偏好的模型與貨幣。
4. 點擊 **「開啟掃描器」** $\rightarrow$ 拍攝菜單 $\rightarrow$ 獲取 AI 翻譯結果。

## 🛠️ 技術架構 (For Developers)

MenuLens Pro 採用了嚴格的 **解耦架構 (Decoupled Architecture)**，旨在確保 UI 與邏輯的完全分離。

### 核心設計模式：`UIBridge`
- **邏輯層 (CoreLogic)**：純粹的業務邏輯，不含任何 DOM 操作。
- **接口層 (UIBridge)**：唯一的 DOM 操縱者。邏輯層透過呼叫 `UIBridge.method()` 來更新界面。
- **狀態管理 (appState)**：單一真相來源，驅動整個 App 的渲染。

**這種設計使得本專案具備極高的可擴展性，未來可輕鬆將 UI 層遷移至 Stitch 或其他前端框架，而無需修改任何核心邏輯。**

## 🌐 部署指南

本專案為純前端應用，最推薦使用 **GitHub Pages** 部署：
1. 將專案上傳至 GitHub Repository。
2. 前往 `Settings` $\rightarrow$ `Pages` $\rightarrow$ 選擇 `main` 分支 $\rightarrow$ `Save`。
3. 即可獲得一個專屬的 `https://<username>.github.io/menu-lens-pro/` 網址。

## 🔐 安全聲明
您的 API Key 僅儲存在瀏覽器的 `localStorage` 中，不會被上傳至任何伺服器。請妥善保管您的 Key，避免在公共電腦上儲存。
