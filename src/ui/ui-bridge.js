import { appState } from '../state/app-state.js';
import { RateService } from '../core/rate-service.js';
import { LifeToolsService } from '../core/life-tools-service.js';

/**
 * UI Bridge - Handles all DOM updates
 */
export const UIBridge = {
    switchView(viewName) {
        const views = ['landing', 'scanner', 'results', 'favorites', 'order-menu', 'finance', 'life-tools', 'receipt-result'];
        views.forEach(v => {
            const el = document.getElementById(`${v}-view`);
            if (el) {
                if (v === viewName) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            }
        });

        // Toggle bottom nav visibility
        const nav = document.getElementById('bottom-nav');
        if (nav) {
            const hiddenViews = ['landing', 'scanner', 'order-menu', 'receipt-result'];
            hiddenViews.includes(viewName) ? nav.classList.add('hidden') : nav.classList.remove('hidden');
            
            // Update active state in nav
            const navMap = {
                'results': 'nav-scan-btn',
                'favorites': 'nav-history-btn',
                'finance': 'nav-finance-btn',
                'life-tools': 'nav-life-btn'
            };
            
            Object.values(navMap).forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.classList.replace('text-indigo-600', 'text-slate-400');
                }
            });
            
            if (navMap[viewName]) {
                const activeBtn = document.getElementById(navMap[viewName]);
                if (activeBtn) activeBtn.classList.replace('text-slate-400', 'text-indigo-600');
            }
        }

        // 特別處理：Landing View 時若購物車為空，隱藏 Panel
        if (viewName === 'landing') {
            this.updateOrderUI();
        }
    },

    updateScannerUI(status = appState.scannerStatus) {
        const titleEl = document.getElementById('scanner-mode-title');
        const statusEl = document.getElementById('status-indicator');
        const loadingEl = document.getElementById('camera-loading-text');
        const errorEl = document.getElementById('camera-error-display');
        const scanBtnInner = document.getElementById('scan-btn-inner');
        const scanSpinner = document.getElementById('scan-spinner');
        const scanBtn = document.getElementById('scan-btn');
        const uploadBtn = document.getElementById('upload-btn');

        if (titleEl) {
            titleEl.innerText = appState.scannerMode === 'menu' ? '菜單辨識模式' : '收據辨識模式';
        }

        // 狀態對應文案
        const statusMap = {
            'idle': '準備中...',
            'starting': '正在啟動相機...',
            'ready': '請將菜單置於框內並對焦',
            'analyzing': 'AI 正在辨識中，請稍候...',
            'error': '發生錯誤'
        };

        if (statusEl) statusEl.innerText = statusMap[status] || statusMap.idle;
        
        if (loadingEl) {
            status === 'starting' ? loadingEl.classList.remove('hidden') : loadingEl.classList.add('hidden');
        }

        if (errorEl) {
            status === 'error' ? errorEl.classList.remove('hidden') : errorEl.classList.add('hidden');
        }

        // 按鈕可用性與動畫
        if (status === 'analyzing') {
            scanBtnInner?.classList.add('opacity-0', 'scale-50');
            scanSpinner?.classList.remove('hidden');
            scanBtn.disabled = true;
            uploadBtn.disabled = true;
            uploadBtn.classList.add('opacity-50');
        } else {
            scanBtnInner?.classList.remove('opacity-0', 'scale-50');
            scanSpinner?.classList.add('hidden');
            scanBtn.disabled = false;
            uploadBtn.disabled = false;
            uploadBtn.classList.remove('opacity-50');
        }
    },

    notify(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-xl font-bold text-sm view-transition transform -translate-y-4 opacity-0`;
        
        const themes = {
            info: 'bg-slate-900 text-white',
            success: 'bg-emerald-600 text-white',
            warn: 'bg-amber-500 text-white',
            error: 'bg-rose-600 text-white'
        };
        
        toast.classList.add(...themes[type].split(' '));
        toast.innerText = message;
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.replace('-translate-y-4', 'translate-y-0');
            toast.classList.replace('opacity-0', 'opacity-100');
        });
        
        setTimeout(() => {
            toast.classList.replace('translate-y-0', '-translate-y-4');
            toast.classList.replace('opacity-100', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    toggleDrawer(open) {
        const drawer = document.getElementById('settings-drawer');
        const onboardingTip = document.getElementById('api-onboarding-tip');
        if (drawer) {
            if (open) {
                drawer.classList.replace('drawer-closed', 'drawer-open');
                this.updateSettingsUI(true); // 開啟時同步狀態
                
                if (onboardingTip) {
                    !appState.settings.apiKey ? onboardingTip.classList.remove('hidden') : onboardingTip.classList.add('hidden');
                }
            } else {
                drawer.classList.replace('drawer-open', 'drawer-closed');
            }
        }
    },

    toggleHelpModal(show) {
        const modal = document.getElementById('help-modal');
        if (modal) show ? modal.classList.remove('hidden') : modal.classList.add('hidden');
    },

    escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    updateSettingsUI(syncCurrencyFromState = false) {
        const currencyEl = document.getElementById('currency-select');
        if (syncCurrencyFromState && currencyEl) {
            currencyEl.value = appState.settings.currency;
        }

        const currentCurrency = currencyEl?.value || appState.settings.currency;
        const inputs = {
            'api-key-input': appState.settings.apiKey,
            'model-select': appState.settings.model,
            'currency-select': currentCurrency,
            'pref-custom': appState.settings.prefCustom,
            'rate-input': RateService.getExchangeRate(currentCurrency) || ''
        };

        for (const [id, value] of Object.entries(inputs)) {
            const el = document.getElementById(id);
            if (el) el.value = value;
        }

        const label = document.getElementById('rate-label');
        if (label) label.innerText = `自訂匯率 (1 JPY = ? ${currentCurrency})`;
    },

    renderResults(items = appState.results, targetId = 'results-list') {
        const container = document.getElementById(targetId);
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = `<div class="py-20 text-center text-slate-400">
                <i class="fas fa-search text-3xl mb-4 opacity-20"></i><br>
                目前沒有翻譯結果
            </div>`;
            if (targetId === 'results-list') {
                const summaryEl = document.getElementById('results-summary');
                if (summaryEl) summaryEl.innerText = '0 項目';
            }
            return;
        }

        if (targetId === 'results-list') {
            const summaryEl = document.getElementById('results-summary');
            if (summaryEl) summaryEl.innerText = `${items.length} 項目`;
        }

        const rate = RateService.getExchangeRate(appState.settings.currency);

        container.innerHTML = items.map((item, index) => {
            const isFav = appState.favorites.some(f => f.nameOriginal === item.nameOriginal);
            const orderItem = appState.order.find(o => o.nameOriginal === item.nameOriginal);
            const qty = orderItem ? orderItem.qty : 0;

            return `
                <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden p-5 space-y-4 animate-fade-in">
                    <div class="flex justify-between items-start">
                        <div class="flex-1 pr-4">
                            <h4 class="text-lg font-bold text-slate-900 mb-1">${this.escapeHTML(item.nameTranslated)}</h4>
                            <p class="text-sm font-medium text-slate-400 mb-2">${this.escapeHTML(item.nameOriginal)}</p>
                            ${item.description ? `<p class="text-[11px] text-slate-500 leading-relaxed">${this.escapeHTML(item.description)}</p>` : ''}
                        </div>
                        <div class="text-right flex-shrink-0">
                            <div class="text-xl font-bold text-indigo-600">¥${item.price.toLocaleString()}</div>
                            <div class="text-[10px] font-bold text-slate-400 mt-1">${RateService.format(item.price, appState.settings.currency, rate)}</div>
                        </div>
                    </div>

                    <div class="flex flex-wrap gap-2">
                        ${(item.dietary_tags || []).map(tag => `
                            <span class="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold">${this.escapeHTML(tag)}</span>
                        `).join('')}
                    </div>

                    ${item.allergen_warning ? `
                        <div class="bg-rose-50 text-rose-600 p-3 rounded-2xl flex items-center gap-3 text-[10px] font-bold">
                            <i class="fas fa-exclamation-circle text-sm"></i>
                            <span>${this.escapeHTML(item.allergen_warning)}</span>
                        </div>
                    ` : ''}

                    <div class="flex gap-3">
                        <button onclick="EventBus.toggleFavorite(${index}, '${targetId}')" 
                                class="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 ${isFav ? 'text-amber-500' : 'text-slate-300'} active:scale-90 transition-all">
                            <i class="fas fa-star text-lg"></i>
                        </button>
                        <button onclick="EventBus.addOrderItem(${index}, '${targetId}')" 
                                class="flex-1 h-12 ${qty > 0 ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-900 text-white'} rounded-2xl font-bold text-xs active:scale-95 transition-all">
                            ${qty > 0 ? `已加入點餐單 (×${qty})` : '加入點餐單'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    updateOrderUI() {
        const panel = document.getElementById('order-summary-panel');
        const summaryText = document.getElementById('cart-summary-text');
        const totalConvTrigger = document.getElementById('cart-total-converted');
        const listContainer = document.getElementById('order-list');
        const totalJPY = document.getElementById('total-price-jpy');
        const totalConv = document.getElementById('total-price-converted');

        const totalItems = appState.order.reduce((s, i) => s + i.qty, 0);
        const totalJPYVal = appState.order.reduce((s, i) => s + (i.price * i.qty), 0);
        const rate = RateService.getExchangeRate(appState.settings.currency);

        // Landing view 且購物車為空時，完全隱藏 panel
        if (totalItems === 0 || (appState.currentView === 'landing' && totalItems === 0)) {
            panel.classList.add('translate-y-full');
            return;
        }

        panel.classList.remove('translate-y-full');
        summaryText.innerText = `${totalItems} 件 | ¥${totalJPYVal.toLocaleString()}`;
        totalConvTrigger.innerText = RateService.format(totalJPYVal, appState.settings.currency, rate);
        
        listContainer.innerHTML = appState.order.map((item, index) => `
            <div class="flex justify-between items-center py-2">
                <div class="flex-1 min-w-0 pr-4">
                    <div class="font-bold text-sm truncate">${this.escapeHTML(item.nameTranslated)}</div>
                    <div class="text-[10px] text-slate-400 truncate">${this.escapeHTML(item.nameOriginal)}</div>
                </div>
                <div class="flex items-center gap-3 bg-slate-100 rounded-xl px-2 py-1">
                    <button onclick="EventBus.updateQty(${index}, -1)" class="w-6 h-6 flex items-center justify-center text-slate-400 active:scale-90">
                        <i class="fas fa-minus text-xs"></i>
                    </button>
                    <span class="text-sm font-bold w-4 text-center">${item.qty}</span>
                    <button onclick="EventBus.updateQty(${index}, 1)" class="w-6 h-6 flex items-center justify-center text-indigo-600 active:scale-90">
                        <i class="fas fa-plus text-xs"></i>
                    </button>
                </div>
            </div>
        `).join('');

        totalJPY.innerText = `¥${totalJPYVal.toLocaleString()}`;
        totalConv.innerText = `約 ${RateService.format(totalJPYVal, appState.settings.currency, rate)}`;
    },

    renderOrderMenu() {
        const container = document.getElementById('menu-list');
        const totalJPY = document.getElementById('menu-total-jpy');
        const totalConv = document.getElementById('menu-total-converted');
        if (!container) return;

        if (appState.order.length === 0) {
            container.innerHTML = '<div class="text-center py-10 text-slate-400">尚未選擇任何項目</div>';
            return;
        }

        const rate = RateService.getExchangeRate(appState.settings.currency);
        let jpySum = 0;

        container.innerHTML = appState.order.map((item, index) => {
            const subtotalJPY = item.price * item.qty;
            jpySum += subtotalJPY;
            const isFav = appState.favorites.some(f => f.nameOriginal === item.nameOriginal);

            return `
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center p-4 gap-4">
                    <div class="flex-shrink-0 flex flex-col items-center gap-2">
                        <span class="text-xs font-bold text-indigo-600">×${item.qty}</span>
                        <button onclick="EventBus.toggleMenuFavorite(${index})" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 ${isFav ? 'text-amber-500' : 'text-slate-300'}">
                            <i class="fas fa-star"></i>
                        </button>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-baseline mb-1">
                            <h4 class="text-lg font-bold text-slate-800 truncate">${this.escapeHTML(item.nameTranslated)}</h4>
                            <span class="text-sm font-bold text-indigo-600">¥${subtotalJPY.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between items-baseline">
                            <p class="text-base font-medium text-slate-400 truncate">${this.escapeHTML(item.nameOriginal)}</p>
                            <span class="text-xs font-bold text-slate-500">${RateService.format(subtotalJPY, appState.settings.currency, rate)}</span>
                        </div>
                        <div class="flex flex-wrap gap-1 mt-2">
                            ${(item.dietary_tags || []).map(tag => `
                                <span class="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold">${this.escapeHTML(tag)}</span>
                            `).join('')}
                        </div>
                        ${item.allergen_warning ? `<div class="mt-2 text-[10px] font-bold text-rose-500 italic"><i class="fas fa-exclamation-triangle mr-1"></i>${this.escapeHTML(item.allergen_warning)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        totalJPY.innerText = `¥${jpySum.toLocaleString()}`;
        totalConv.innerText = RateService.format(jpySum, appState.settings.currency, rate);
    },

    renderAccounts() {
        const container = document.getElementById('accounts-list');
        if (!container) return;

        const accounts = appState.financeModule.accounts;
        if (accounts.length === 0) {
            container.innerHTML = '<div class="text-center py-20 text-slate-400">目前沒有帳本，點擊右上方新增</div>';
            return;
        }

        container.innerHTML = accounts.map(acc => {
            const total = acc.items.reduce((sum, item) => sum + item.amount, 0);
            return `
                <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 animate-fade-in active:scale-[0.98] transition-transform" 
                     onclick="EventBus.viewAccountDetail('${acc.id}')">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <div class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">${acc.type === 'personal' ? '個人帳本' : '共享帳本'}</div>
                            <h4 class="font-bold text-lg text-slate-800">${this.escapeHTML(acc.name)}</h4>
                        </div>
                        <div class="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                    <div class="flex justify-between items-end">
                        <div class="text-2xl font-black text-slate-900">
                            <span class="text-sm font-bold text-slate-400 mr-1">${this.escapeHTML(acc.currency)}</span>${total.toLocaleString()}
                        </div>
                        <div class="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                            ${acc.items.length} 筆紀錄
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderLifeTools() {
        const grid = document.getElementById('life-tools-grid');
        const main = document.getElementById('life-tools-main');
        const detail = document.getElementById('life-tools-detail');
        
        if (main) main.classList.remove('hidden');
        if (detail) detail.classList.add('hidden');
        if (!grid) return;

        grid.innerHTML = appState.lifeToolsModule.tools.map(tool => `
            <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform cursor-pointer" 
                 onclick="EventBus.openLifeTool('${tool.id}')">
                <div class="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center ${this.escapeHTML(tool.color)}">
                    <i class="fas ${this.escapeHTML(tool.icon)} text-2xl"></i>
                </div>
                <span class="font-bold text-slate-700 text-sm">${this.escapeHTML(tool.name)}</span>
            </div>
        `).join('');
    },

    renderLifeToolDetail(toolId) {
        const tool = appState.lifeToolsModule.tools.find(t => t.id === toolId);
        const main = document.getElementById('life-tools-main');
        const detail = document.getElementById('life-tools-detail');
        if (!detail || !main || !tool) return;

        main.classList.add('hidden');
        detail.classList.remove('hidden');

        let detailHtml = `
            <div class="flex items-center gap-4 mb-8 px-2">
                <button onclick="UIBridge.renderLifeTools()" class="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm text-slate-400">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <h3 class="font-bold text-lg">${this.escapeHTML(tool.name)}</h3>
            </div>
        `;

        if (toolId === 'memo') {
            const memos = LifeToolsService.getMemos();
            detailHtml += `
                <div class="space-y-6">
                    <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                        <textarea id="memo-input" class="w-full h-32 p-2 text-sm outline-none resize-none bg-slate-50 rounded-xl mb-4" placeholder="輸入備忘錄內容..."></textarea>
                        <button onclick="EventBus.saveMemo()" class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-100">儲存備忘錄</button>
                    </div>
                    <div class="space-y-4">
                        ${memos.length > 0 ? memos.map(m => `
                            <div class="bg-amber-50 rounded-3xl p-5 border border-amber-100 relative group animate-fade-in">
                                <p class="text-sm text-slate-700 leading-relaxed font-medium">${this.escapeHTML(m.content)}</p>
                                <div class="text-[10px] text-amber-400 font-bold mt-3 flex justify-between items-center">
                                    <span>${new Date(m.timestamp).toLocaleString()}</span>
                                    <i class="fas fa-sticky-note opacity-30"></i>
                                </div>
                            </div>
                        `).join('') : '<div class="text-center py-10 text-slate-400 italic text-xs">尚無備忘錄</div>'}
                    </div>
                </div>
            `;
        } else if (toolId === 'currency') {
            detailHtml += `
                <div class="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-8">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">日圓金額 (JPY)</label>
                        <input type="number" id="calc-jpy" value="1000" class="w-full text-4xl font-black text-slate-900 outline-none border-b-4 border-slate-50 focus:border-indigo-500 pb-4 transition-colors">
                    </div>
                    <div class="flex items-center justify-center">
                        <div class="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                            <i class="fas fa-arrow-down text-lg"></i>
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between items-center mb-4">
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">換算結果 (${this.escapeHTML(appState.settings.currency)})</label>
                            <span id="calc-result" class="text-3xl font-black text-indigo-600">--</span>
                        </div>
                        <button onclick="EventBus.calculateCurrency()" class="w-full py-5 bg-indigo-600 text-white rounded-3xl font-bold text-base shadow-xl shadow-indigo-100 active:scale-95 transition-all">即時換算</button>
                    </div>
                </div>
            `;
        } else {
            detailHtml += `<div class="text-center py-20 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                <i class="fas fa-tools text-3xl mb-4 opacity-20"></i><br>
                工具 「${this.escapeHTML(tool.name)}」 介面開發中
            </div>`;
        }

        detail.innerHTML = detailHtml;
    },

    renderReceiptResult() {
        const container = document.getElementById('receipt-data-container');
        const select = document.getElementById('save-to-account-select');
        if (!container || !appState.receiptResult) return;

        const res = appState.receiptResult;
        
        container.innerHTML = `
            <div class="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <div class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">消費店家</div>
                <h4 class="text-xl font-black text-slate-900 mb-4">${this.escapeHTML(res.storeName)}</h4>
                
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">日期</div>
                        <div class="text-sm font-bold text-slate-700">${this.escapeHTML(res.date)}</div>
                    </div>
                    <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">總計金額</div>
                        <div class="text-sm font-bold text-indigo-600">${this.escapeHTML(res.currency)} ${(res.totalAmount || 0).toLocaleString()}</div>
                    </div>
                </div>

                <div class="space-y-3">
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">明細項目</div>
                    ${(res.items || []).length > 0 ? res.items.map(item => `
                        <div class="flex justify-between items-center text-sm font-medium py-2 border-b border-slate-200 last:border-0">
                            <span class="text-slate-700 flex-1 pr-4 truncate">${this.escapeHTML(item.name)}</span>
                            <div class="text-right flex-shrink-0">
                                <span class="text-slate-400 text-xs mr-2">×${item.qty}</span>
                                <span class="text-slate-900">${this.escapeHTML(res.currency === 'JPY' ? '¥' : res.currency)} ${(item.price || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    `).join('') : '<div class="text-xs text-slate-400 italic px-1">無明細項目</div>'}
                </div>
            </div>
        `;

        const accounts = appState.financeModule.accounts;
        select.innerHTML = accounts.length > 0 ? accounts.map(acc => `
            <option value="${this.escapeHTML(acc.id)}">${this.escapeHTML(acc.name)} (${this.escapeHTML(acc.currency)})</option>
        `).join('') : '<option value="">請先建立帳本</option>';
    }
};
