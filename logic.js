/**
 * MenuLens Pro - Order Assistant Edition
 * 
 * Changes: 
 * 1. Removed visual food image matching.
 * 2. Equal text size for Original and Translated names for dual-reading.
 * 3. Implemented Order List with total price calculation.
 * 4. Implemented API Exponential Backoff retry to prevent bans.
 */

// =============================================================================
// 1. GLOBAL STATE
// =============================================================================
const appState = {
    settings: {
        apiKey: localStorage.getItem('menulens_api_key') || '',
        model: localStorage.getItem('menulens_model') || 'gemini-2.5-flash',
        currency: localStorage.getItem('menulens_currency') || 'TWD',
        customPrefs: localStorage.getItem('menulens_pref_custom') || ''
    },
    currentView: 'landing',
    isDrawerOpen: false,
    isProcessing: false,
    stream: null,
    results: JSON.parse(localStorage.getItem('menulens_last_results') || '[]'),
    order: JSON.parse(localStorage.getItem('menulens_current_order') || '[]'), // 持久化購物車
    favorites: JSON.parse(localStorage.getItem('menulens_favorites') || '[]')
};

/**
 * 取得指定貨幣的自訂匯率 (v2.0)
 */
function getExchangeRate(currency) {
    const rate = localStorage.getItem(`menulens_rate_${currency}`);
    if (rate) return parseFloat(rate);
    
    // 防禦性底限匯率 (Fallback Rates) - v2.1
    const fallbacks = { TWD: 0.20, HKD: 0.05, USD: 0.006 };
    return fallbacks[currency] || 0;
}

// =============================================================================
// 2. UI BRIDGE (Standardized DOM Interface)
// =============================================================================
const UIBridge = {
    switchView(viewName) {
        const views = ['landing-view', 'scanner-view', 'results-view', 'favorites-view', 'order-menu-view'];
        views.forEach(v => {
            const el = document.getElementById(v);
            if (el) v === `${viewName}-view` ? el.classList.remove('hidden') : el.classList.add('hidden');
        });
        
        const nav = document.getElementById('bottom-nav');
        if (nav) {
            // 在掃描器或點餐菜單頁面時隱藏底部導覽列
            ['scanner', 'order-menu'].includes(viewName) ? nav.classList.add('hidden') : nav.classList.remove('hidden');
        }
    },

    currencyFormat(value, rate) {
        if (!rate || rate === 0) return '未設定';
        return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: appState.settings.currency, maximumFractionDigits: 0 }).format(value * rate);
    },

    renderOrderMenu() {
        const listContainer = document.getElementById('menu-list');
        const totalJPYEl = document.getElementById('menu-total-jpy');
        const totalConvEl = document.getElementById('menu-total-converted');
        
        if (!listContainer) return;

        if (appState.order.length === 0) {
            listContainer.innerHTML = '<div class="text-center py-20 text-slate-400">目前沒有訂單項目</div>';
            totalJPYEl.innerText = '¥0';
            totalConvEl.innerText = `${appState.settings.currency} 0`;
            return;
        }

        const totalJPY = appState.order.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const currentRate = getExchangeRate(appState.settings.currency);

        listContainer.innerHTML = appState.order.map((item, index) => {
            const isFavorited = appState.favorites.some(f => f.nameOriginal === item.nameOriginal);

            // 渲染飲食標記與過敏警告 (Fix 5)
            const tagsHtml = item.dietary_tags && item.dietary_tags.length > 0 
                ? item.dietary_tags.map(t => `<span class="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 font-medium">${t}</span>`).join('') 
                : '';
            const warningHtml = item.allergen_warning 
                ? `<span class="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded border border-red-100 font-bold">⚠️ ${item.allergen_warning}</span>` 
                : '';

            return `
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex items-center p-4 gap-4 animate-fade-in">
                    <!-- 左側：數量與收藏星 -->
                    <div class="flex-shrink-0 flex flex-col items-center gap-2 border-r border-slate-100 pr-4">
                        <span class="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mb-1">×${item.qty}</span>
                        <button class="flex flex-col items-center justify-center gap-1 group"
                                onclick="EventBus.toggleMenuFavorite(${index})">
                            <div class="w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 group-hover:bg-amber-50 transition-colors">
                                <i class="${isFavorited ? 'fas fa-star text-amber-400 text-2xl' : 'far fa-star text-slate-300 text-2xl'}"></i>
                            </div>
                            <span class="text-xs font-bold ${isFavorited ? 'text-amber-600' : 'text-slate-400'}">收藏</span>
                        </button>
                    </div>
                    <!-- 中間：名稱與價格 -->
                    <div class="flex-1 min-w-0 space-y-1">
                        <div class="flex justify-between items-baseline">
                            <h4 class="text-lg font-bold text-slate-800 truncate">${item.nameTranslated}</h4>
                            <span class="text-sm font-medium text-indigo-600">¥${(item.price * item.qty).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between items-baseline">
                            <p class="text-lg font-medium text-slate-500 truncate">${item.nameOriginal}</p>
                            <span class="text-sm font-medium text-slate-600">
                                ${this.currencyFormat(item.price * item.qty, currentRate)}
                            </span>
                        </div>
                        <div class="flex flex-wrap gap-1 mt-1">
                            ${tagsHtml}
                            ${warningHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        totalJPYEl.innerText = `¥${totalJPY.toLocaleString()}`;
        totalConvEl.innerText = this.currencyFormat(totalJPY, currentRate);
    },

    toggleDrawer(isOpen) {
        const drawer = document.getElementById('settings-drawer');
        if (drawer) {
            isOpen ? drawer.classList.replace('drawer-closed', 'drawer-open') : drawer.classList.replace('drawer-open', 'drawer-closed');
        }
    },

    toggleHelpModal(isOpen) {
        const modal = document.getElementById('help-modal');
        if (modal) isOpen ? modal.classList.remove('hidden') : modal.classList.add('hidden');
    },

    setProcessing(isProcessing, message = '') {
        const scanLine = document.getElementById('scan-line');
        const status = document.getElementById('status-indicator');
        const scanBtn = document.getElementById('scan-btn')?.querySelector('div');

        if (scanLine) {
            isProcessing ? scanLine.classList.add('animate-bounce') : scanLine.classList.remove('animate-bounce');
            scanLine.style.opacity = isProcessing ? '1' : '0';
        }
        if (status) status.innerText = message || (isProcessing ? '分析中...' : '請將菜單置於框內');
        if (scanBtn) isProcessing ? scanBtn.classList.add('scale-75', 'bg-slate-300') : scanBtn.classList.remove('scale-75', 'bg-slate-300');
    },

    renderResults(items, targetId = 'results-list') {
        const container = document.getElementById(targetId);
        if (!container) return;

        if (!items || items.length === 0) {
            container.innerHTML = '<div class="text-center py-20 text-slate-400">目前沒有資料</div>';
            return;
        }

        container.innerHTML = items.map((item, index) => {
            const orderItem = appState.order.find(o => o.nameOriginal === item.nameOriginal);
            const qty = orderItem ? orderItem.qty : 0;
            
            // 渲染飲食標記與過敏警告 (Fix 4: 放大至 text-xs)
            const tagsHtml = item.dietary_tags && item.dietary_tags.length > 0 
                ? item.dietary_tags.map(t => `<span class="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 font-medium">${t}</span>`).join('') 
                : '';
            const warningHtml = item.allergen_warning 
                ? `<span class="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded border border-red-100 font-bold">⚠️ ${item.allergen_warning}</span>` 
                : '';
            
            return `
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex items-center p-4 gap-4 animate-fade-in active:bg-slate-50 transition-colors cursor-pointer" onclick="EventBus.addOrderItem(${index})">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 rounded-full border-2 ${qty > 0 ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'} flex items-center justify-center transition-all">
                            ${qty > 0 ? `<span class="text-white text-xs font-bold">${qty}</span>` : '<i class="fas fa-plus text-slate-400 text-xs"></i>'}
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-baseline gap-2">
                            <h3 class="text-lg font-bold text-slate-800 truncate">${item.nameTranslated}</h3>
                            <span class="text-lg font-bold text-indigo-600 whitespace-nowrap">¥${item.price.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between items-baseline gap-2">
                            <h4 class="text-base font-medium text-slate-500 truncate">${item.nameOriginal}</h4>
                            ${item.recommendation ? '<span class="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">推薦</span>' : ''}
                        </div>
                        <p class="text-sm text-slate-400 mt-1 truncate">${item.description}</p>
                        <div class="flex flex-wrap gap-1 mt-2">
                            ${tagsHtml}
                            ${warningHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    updateOrderUI() {
        const panel = document.getElementById('order-summary-panel');
        const trigger = document.getElementById('cart-trigger');
        const content = document.getElementById('cart-content');
        const listContainer = document.getElementById('order-list');
        const summaryText = document.getElementById('cart-summary-text');
        const totalConvertedTrigger = document.getElementById('cart-total-converted');
        const totalJPY = document.getElementById('total-price-jpy');
        const totalConv = document.getElementById('total-price-converted');
        const chevron = document.getElementById('cart-chevron');

        if (!panel) return;

        const totalItems = appState.order.reduce((sum, item) => sum + item.qty, 0);
        const totalJPYValue = appState.order.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const currentRate = getExchangeRate(appState.settings.currency);
        const totalConvText = this.currencyFormat(totalJPYValue, currentRate);

        // 1. 處理觸發條顯示
        if (totalItems === 0) {
            panel.classList.add('translate-y-full');
            content.style.maxHeight = '0px';
            chevron.style.transform = 'rotate(0deg)';
            return;
        }
        panel.classList.remove('translate-y-full');
        summaryText.innerText = `${totalItems} 件 | ¥${totalJPYValue.toLocaleString()}`;
        totalConvertedTrigger.innerText = totalConvText;

        // 2. 渲染詳細列表
        listContainer.innerHTML = appState.order.map((item, index) => {
            const itemConvText = this.currencyFormat(item.price * item.qty, currentRate);
            return `
                <div class="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                    <div class="flex-1 min-w-0 pr-4">
                        <div class="flex justify-between items-center mb-1">
                            <div class="font-bold text-slate-800 truncate">${item.nameTranslated}</div>
                            <div class="text-sm font-medium text-indigo-600 whitespace-nowrap">¥${(item.price * item.qty).toLocaleString()}</div>
                        </div>
                        <div class="flex justify-between items-center">
                            <div class="text-xs text-slate-400 truncate">${item.nameOriginal}</div>
                            <div class="text-xs font-medium text-slate-500">約 ${itemConvText}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 bg-slate-100 rounded-full px-2 py-1">
                        <button onclick="EventBus.updateQty(${index}, -1)" class="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-sm text-slate-600 hover:text-indigo-600 transition-colors">
                            <i class="fas fa-minus text-[10px]"></i>
                        </button>
                        <span class="text-sm font-bold w-4 text-center">${item.qty}</span>
                        <button onclick="EventBus.updateQty(${index}, 1)" class="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-sm text-slate-600 hover:text-indigo-600 transition-colors">
                            <i class="fas fa-plus text-[10px]"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        totalJPY.innerText = `¥${totalJPYValue.toLocaleString()}`;
        totalConv.innerText = `約 ${totalConvText}`;
    },

    toggleCartExpanded() {
        const content = document.getElementById('cart-content');
        const chevron = document.getElementById('cart-chevron');
        const isExpanded = content.style.maxHeight !== '0px' && content.style.maxHeight !== '';
        
        if (isExpanded) {
            content.style.maxHeight = '0px';
            chevron.style.transform = 'rotate(0deg)';
        } else {
            content.style.maxHeight = '500px'; // Large enough value
            chevron.style.transform = 'rotate(180deg)';
        }
    },

    updateSettingsUI() {
        const currency = appState.settings.currency;
        document.getElementById('api-key-input').value = appState.settings.apiKey;
        document.getElementById('model-select').value = appState.settings.model;
        document.getElementById('currency-select').value = currency;
        document.getElementById('pref-custom').value = appState.settings.customPrefs;
        
        // v2.0: 更新匯率 Label 與 Input
        document.getElementById('rate-label').innerText = `自訂匯率 (1 JPY = ? ${currency})`;
        document.getElementById('rate-input').value = getExchangeRate(currency) || '';
    },

    notify(message, type = 'info') {
        alert(`[${type.toUpperCase()}] ${message}`);
    }
};

// =============================================================================
// 3. CORE LOGIC (Business Rules)
// =============================================================================
const CoreLogic = {
    // API 防封禁重試機制 (Exponential Backoff)
    async fetchWithRetry(url, options, maxRetries = 3, backoff = 2000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url, options);
                if (response.status === 429) {
                    console.warn(`API Rate Limit hit. Retrying in ${backoff}ms...`);
                    await new Promise(r => setTimeout(r, backoff));
                    backoff *= 2; // 每次失敗延遲翻倍
                    continue;
                }
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (err) {
                if (i === maxRetries - 1) throw err;
                console.warn(`Request failed, retrying... (${i+1}/${maxRetries})`);
                await new Promise(r => setTimeout(r, backoff));
                backoff *= 2;
            }
        }
    },

    async analyzeMenu(base64Image) {
        if (!appState.settings.apiKey) throw new Error('API Key 缺失，請至設定中填寫');

        const prompt = `你是一個專業的日本料理翻譯官。分析圖片並回傳嚴格 JSON：
        { "items": [ { "nameOriginal": "日文", "nameTranslated": "中文", "price": 數字, "description": "簡述", "dietary_tags": [], "allergen_warning": "警告字串", "recommendation": true/false } ] }
        
        特別要求：請根據使用者的飲食提醒進行精準標註：
        "${appState.settings.customPrefs || '無特別需求'}"
        如果發現符合上述禁忌的食物，請在 allergen_warning 中明確指出。`;

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${appState.settings.model}:generateContent?key=${appState.settings.apiKey}`;
        const payload = {
            contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Image } }] }]
        };

        const data = await this.fetchWithRetry(endpoint, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });

        if (data.error) throw new Error(data.error.message);

        const text = data.candidates[0].content.parts[0].text;
        const match = text.match(/\{[\s\S]*\}/);
        return JSON.parse(match ? match[0] : text);
    },

    /**
     * 從 Open Exchange Rates API 獲取最新匯率 (v2.1)
     * 改用 open.er-api.com，支援 TWD 且免 Key
     */
    async fetchLatestRate(base, target) {
        try {
            const url = `https://open.er-api.com/v6/latest/${base}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('匯率伺服器暫時無回應');
            const data = await res.json();
            
            if (data.result === 'success' && data.rates[target]) {
                return data.rates[target];
            }
            throw new Error(`不支援的貨幣: ${target}`);
        } catch (err) {
            console.error('匯率抓取失敗:', err);
            throw new Error(`暫時無法獲取即時匯率 (${err.message})，已為您載入參考數值。`);
        }
    },

    saveSettings(newSettings, currentRate) {
        Object.assign(appState.settings, newSettings);
        localStorage.setItem('menulens_api_key', newSettings.apiKey);
        localStorage.setItem('menulens_model', newSettings.model);
        localStorage.setItem('menulens_currency', newSettings.currency);
        localStorage.setItem('menulens_pref_custom', newSettings.customPrefs);
        
        // v2.0: 儲存對應貨幣的匯率
        if (currentRate !== undefined) {
            localStorage.setItem(`menulens_rate_${newSettings.currency}`, currentRate);
        }
    }
};

// =============================================================================
// 4. UTILITIES (Device Access)
// =============================================================================
const DeviceUtils = {
    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            appState.stream = stream;
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.playsInline = true;
            video.className = "w-full h-full object-cover";
            const preview = document.getElementById('camera-preview');
            preview.innerHTML = '';
            preview.appendChild(video);
            const line = document.createElement('div');
            line.id = 'scan-line';
            line.className = 'absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] opacity-0 z-10';
            preview.appendChild(line);
        } catch (err) {
            UIBridge.notify('無法啟動相機：' + err.message, 'error');
        }
    },
    stopCamera() {
        if (appState.stream) appState.stream.getTracks().forEach(t => t.stop());
        appState.stream = null;
    },
    captureFrame() {
        const video = document.querySelector('video');
        if (!video) return null;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    },
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};

// =============================================================================
// 5. EVENT BUS
// =============================================================================
const EventBus = {
    init() {
        document.getElementById('settings-btn').onclick = () => {
            appState.isDrawerOpen = true;
            UIBridge.toggleDrawer(true);
        };
        document.getElementById('close-settings-btn').onclick = () => {
            appState.isDrawerOpen = false;
            UIBridge.toggleDrawer(false);
        };
        document.getElementById('start-btn').onclick = () => {
            if (!appState.settings.apiKey) {
                UIBridge.notify('請先在設定中輸入 Gemini API 金鑰', 'warn');
                appState.isDrawerOpen = true;
                UIBridge.toggleDrawer(true);
                return;
            }
            appState.currentView = 'scanner';
            UIBridge.switchView('scanner');
            DeviceUtils.startCamera();
        };
        document.getElementById('upload-btn').onclick = () => {
            document.getElementById('file-input').click();
        };
        document.getElementById('file-input').onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            UIBridge.setProcessing(true, '正在上傳並分析圖片...');
            try {
                const base64 = await DeviceUtils.fileToBase64(file);
                const data = await CoreLogic.analyzeMenu(base64);
                
                // Fix 3: 去重邏輯
                const uniqueNewItems = [];
                data.items.forEach(newItem => {
                    const isDuplicate = uniqueNewItems.some(u => u.nameOriginal === newItem.nameOriginal) || 
                                       appState.order.some(o => o.nameOriginal === newItem.nameOriginal) ||
                                       appState.results.some(r => r.nameOriginal === newItem.nameOriginal);
                    if (!isDuplicate) uniqueNewItems.push(newItem);
                });
                
                appState.results.push(...uniqueNewItems);
                // Fix 1: 儲存至快取
                localStorage.setItem('menulens_last_results', JSON.stringify(appState.results));
                
                appState.currentView = 'results';
                DeviceUtils.stopCamera();
                UIBridge.switchView('results');
                UIBridge.renderResults(appState.results);
            } catch (err) {
                UIBridge.notify(err.message, 'error');
            } finally {
                UIBridge.setProcessing(false);
            }
        };
        document.getElementById('scan-btn').onclick = async () => {
            if (appState.isProcessing) return;
            const imageData = DeviceUtils.captureFrame();
            if (!imageData) return;
            UIBridge.setProcessing(true, '分析中...');
            try {
                const data = await CoreLogic.analyzeMenu(imageData);
                
                // Fix 3: 去重邏輯
                const uniqueNewItems = [];
                data.items.forEach(newItem => {
                    const isDuplicate = uniqueNewItems.some(u => u.nameOriginal === newItem.nameOriginal) || 
                                       appState.order.some(o => o.nameOriginal === newItem.nameOriginal) ||
                                       appState.results.some(r => r.nameOriginal === newItem.nameOriginal);
                    if (!isDuplicate) uniqueNewItems.push(newItem);
                });
                
                appState.results.push(...uniqueNewItems);
                // Fix 1: 儲存至快取
                localStorage.setItem('menulens_last_results', JSON.stringify(appState.results));
                
                appState.currentView = 'results';
                DeviceUtils.stopCamera();
                UIBridge.switchView('results');
                UIBridge.renderResults(appState.results);
            } catch (err) {
                UIBridge.notify(err.message, 'error');
            } finally {
                UIBridge.setProcessing(false);
            }
        };
        document.getElementById('rescan-btn').onclick = () => {
            let shouldClearOrder = false;
            if (appState.order.length > 0) {
                // 防禦性設計：詢問使用者是「續拍」還是「換店」
                if (confirm('您目前有點餐紀錄。這是要「掃描新餐廳」嗎？\n(選「確定」將清空點餐單；選「取消」則保留內容繼續續拍下一頁)')) {
                    shouldClearOrder = true;
                }
            }

            if (shouldClearOrder) {
                appState.order = [];
                localStorage.removeItem('menulens_current_order');
                UIBridge.updateOrderUI();
            }

            appState.results = [];
            localStorage.removeItem('menulens_last_results');
            
            appState.currentView = 'scanner';
            UIBridge.switchView('scanner');
            DeviceUtils.startCamera();
        };

        // v2.1: 完成點餐並清空 (新餐廳準備)
        document.getElementById('finish-order-btn').onclick = () => {
            if (confirm('確定已完成點餐並清空紀錄嗎？')) {
                appState.order = [];
                appState.results = [];
                localStorage.removeItem('menulens_current_order');
                localStorage.removeItem('menulens_last_results');
                
                UIBridge.updateOrderUI();
                UIBridge.renderResults([]);
                
                appState.currentView = 'landing';
                UIBridge.switchView('landing');
            }
        };

        // v2.0: 貨幣切換事件 - 自動抓取最新匯率
        document.getElementById('currency-select').onchange = async (e) => {
            const currency = e.target.value;
            document.getElementById('rate-label').innerText = `自訂匯率 (1 JPY = ? ${currency})`;
            
            // 自動嘗試抓取
            const btn = document.getElementById('fetch-rate-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner animate-spin mr-1"></i>抓取中';
            
            try {
                const rate = await CoreLogic.fetchLatestRate('JPY', currency);
                document.getElementById('rate-input').value = rate;
                // 自動儲存至 localStorage 以便即時生效
                localStorage.setItem(`menulens_rate_${currency}`, rate);
            } catch (err) {
                console.warn('自動抓取失敗，載入本地快取');
                document.getElementById('rate-input').value = getExchangeRate(currency) || '';
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sync-alt mr-1"></i>自動獲取';
            }
        };

        // v2.0: 自動獲取匯率事件
        document.getElementById('fetch-rate-btn').onclick = async () => {
            const currency = document.getElementById('currency-select').value;
            const btn = document.getElementById('fetch-rate-btn');
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner animate-spin mr-1"></i>抓取中';
            
            try {
                const rate = await CoreLogic.fetchLatestRate('JPY', currency);
                document.getElementById('rate-input').value = rate;
                UIBridge.notify(`已獲取最新匯率：1 JPY = ${rate} ${currency}`, 'info');
            } catch (err) {
                UIBridge.notify(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sync-alt mr-1"></i>自動獲取';
            }
        };

        document.getElementById('save-settings-btn').onclick = () => {
            const newSettings = {
                apiKey: document.getElementById('api-key-input').value,
                model: document.getElementById('model-select').value,
                currency: document.getElementById('currency-select').value,
                customPrefs: document.getElementById('pref-custom').value
            };
            const currentRate = document.getElementById('rate-input').value;
            CoreLogic.saveSettings(newSettings, currentRate);
            UIBridge.toggleDrawer(false);
            
            // 儲存後即時反映匯率變更
            UIBridge.updateOrderUI();
            if (appState.currentView === 'order-menu') {
                UIBridge.renderOrderMenu();
            }
        };
        
        // Order Menu Specific Events
        document.getElementById('generate-menu-btn').onclick = (e) => {
            e.stopPropagation(); // 防止觸發購物車展開
            if (appState.order.length === 0) {
                UIBridge.notify('請先選擇菜單項目', 'warn');
                return;
            }
            appState.currentView = 'order-menu';
            UIBridge.switchView('order-menu');
            UIBridge.renderOrderMenu();
        };

        document.getElementById('menu-back-scan').onclick = () => {
            appState.currentView = 'results';
            UIBridge.switchView('results');
            UIBridge.renderResults(appState.results);
        };

        document.getElementById('menu-back-fav').onclick = () => {
            appState.currentView = 'favorites';
            UIBridge.switchView('favorites');
            UIBridge.renderResults(appState.favorites, 'favorites-list');
        };
        
        // Shopping Cart Events
        document.getElementById('cart-trigger').onclick = () => {
            UIBridge.toggleCartExpanded();
        };
        document.getElementById('clear-order-btn').onclick = () => {
            appState.order = [];
            localStorage.removeItem('menulens_current_order');
            UIBridge.updateOrderUI();
            UIBridge.renderResults(appState.results);
        };

        // Favorites Events
        document.getElementById('nav-history-btn').onclick = () => {
            appState.currentView = 'favorites';
            UIBridge.switchView('favorites');
            UIBridge.renderResults(appState.favorites, 'favorites-list');
        };
        document.getElementById('back-to-scan-btn').onclick = () => {
            appState.currentView = 'scanner';
            UIBridge.switchView('scanner');
            DeviceUtils.startCamera();
        };

        // Help Modal Events
        document.getElementById('help-api-btn').onclick = () => UIBridge.toggleHelpModal(true);
        document.getElementById('close-help-btn').onclick = () => UIBridge.toggleHelpModal(false);
        document.getElementById('done-help-btn').onclick = () => UIBridge.toggleHelpModal(false);
    },

    addOrderItem(index) {
        const item = appState.results[index];
        if (!item) return;
        
        const orderIndex = appState.order.findIndex(o => o.nameOriginal === item.nameOriginal);
        if (orderIndex > -1) {
            appState.order[orderIndex].qty += 1;
        } else {
            appState.order.push({ ...item, qty: 1 });
        }
        
        localStorage.setItem('menulens_current_order', JSON.stringify(appState.order));
        UIBridge.renderResults(appState.results);
        UIBridge.updateOrderUI();
    },

    updateQty(index, delta) {
        const item = appState.order[index];
        if (!item) return;
        
        item.qty += delta;
        if (item.qty <= 0) {
            appState.order.splice(index, 1);
        }
        
        localStorage.setItem('menulens_current_order', JSON.stringify(appState.order));
        UIBridge.renderResults(appState.results);
        UIBridge.updateOrderUI();
    },

    toggleFavorite(index, targetId) {
        const list = targetId === 'favorites-list' ? appState.favorites : appState.results;
        const item = list[index];
        if (!item) return;
        
        const favIndex = appState.favorites.findIndex(f => f.nameOriginal === item.nameOriginal);
        if (favIndex > -1) {
            appState.favorites.splice(favIndex, 1);
        } else {
            appState.favorites.push(item);
        }
        localStorage.setItem('menulens_favorites', JSON.stringify(appState.favorites));
        UIBridge.renderResults(list, targetId);
    },

    toggleMenuFavorite(index) {
        const item = appState.order[index];
        if (!item) return;
        
        const favIndex = appState.favorites.findIndex(f => f.nameOriginal === item.nameOriginal);
        if (favIndex > -1) {
            appState.favorites.splice(favIndex, 1);
        } else {
            // 加入收藏時不保留 qty 資訊，只保留項目基本資訊
            const { qty, ...itemInfo } = item;
            appState.favorites.push(itemInfo);
        }
        localStorage.setItem('menulens_favorites', JSON.stringify(appState.favorites));
        UIBridge.renderOrderMenu();
    }
};

// Start Application
document.addEventListener('DOMContentLoaded', async () => {
    UIBridge.updateSettingsUI();
    
    // v2.0: 啟動時自動檢查當前貨幣匯率，若為 0 則嘗試自動抓取
    const currentCurrency = appState.settings.currency;
    if (getExchangeRate(currentCurrency) === 0) {
        console.log(`正在為新用戶自動初始化 ${currentCurrency} 匯率...`);
        try {
            const rate = await CoreLogic.fetchLatestRate('JPY', currentCurrency);
            localStorage.setItem(`menulens_rate_${currentCurrency}`, rate);
            UIBridge.updateSettingsUI(); // 更新介面顯示
        } catch (err) {
            console.warn('啟動時自動抓取匯率失敗');
        }
    }
    
    // Fix 1: 若有上次結果，直接顯示
    if (appState.results.length > 0) {
        appState.currentView = 'results';
        UIBridge.switchView('results');
        UIBridge.renderResults(appState.results);
    } else {
        UIBridge.switchView('landing');
    }
    
    EventBus.init();
    if (!appState.settings.apiKey) {
        setTimeout(() => {
            UIBridge.notify('歡迎使用 MenuLens Pro！請先設定 Gemini API 金鑰。', 'info');
            appState.isDrawerOpen = true;
            UIBridge.toggleDrawer(true);
        }, 1000);
    }
});
