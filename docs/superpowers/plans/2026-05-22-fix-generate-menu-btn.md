# 修復 `generate-menu-btn` 按鈕失效問題實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 `generate-menu-btn` 按鈕從 `cart-summary-text` 內部移出，防止其在更新購物車 UI 時被覆蓋。

**Architecture:** 調整 `index.html` 中的 DOM 結構，將按鈕移至 `cart-trigger` 的右側操作區域，與總額顯示和展開圖示並列。

**Tech Stack:** HTML (Tailwind CSS)

---

### Task 1: 修改 index.html 結構

**Files:**
- Modify: `index.html:112-124`

- [ ] **Step 1: 移除 `cart-summary-text` 內的按鈕並移至右側容器**

移除前：
```html
                                <div class="font-bold flex items-center" id="cart-summary-text">
                                    0 件 | ¥0
                                    <button id="generate-menu-btn" class="ml-3 px-2 py-0.5 text-[10px] bg-white/20 hover:bg-white/30 rounded border border-white/30 transition-colors">生成菜單</button>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span id="cart-total-converted" class="text-sm font-medium bg-white/20 px-2 py-1 rounded-lg">NT$ 0</span>
                            <i id="cart-chevron" class="fas fa-chevron-up transition-transform duration-300"></i>
                        </div>
```

移除後：
```html
                                <div class="font-bold flex items-center" id="cart-summary-text">
                                    0 件 | ¥0
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button id="generate-menu-btn" class="px-2 py-0.5 text-[10px] bg-white/20 hover:bg-white/30 rounded border border-white/30 transition-colors">生成菜單</button>
                            <span id="cart-total-converted" class="text-sm font-medium bg-white/20 px-2 py-1 rounded-lg">NT$ 0</span>
                            <i id="cart-chevron" class="fas fa-chevron-up transition-transform duration-300"></i>
                        </div>
```

- [ ] **Step 2: 驗證變更**

檢查 `index.html` 確保結構正確且無語法錯誤。

- [ ] **Step 3: 提交變更**

```bash
git add index.html
git commit -m "fix: move generate-menu-btn outside cart-summary-text to prevent destruction on UI update"
```
