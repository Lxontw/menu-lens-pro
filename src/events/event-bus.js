import { appState } from '../state/app-state.js';
import { Storage } from '../storage/local-storage.js';
import { MenuService } from '../core/menu-service.js';
import { ReceiptService } from '../core/receipt-service.js';
import { FinanceService } from '../core/finance-service.js';
import { LifeToolsService } from '../core/life-tools-service.js';
import { RateService } from '../core/rate-service.js';
import { DeviceUtils } from '../device/camera.js';
import { UIBridge } from '../ui/ui-bridge.js';

/**
 * Event Bus - Orchestrates interactions between UI, Core Services, and State
 */
export const EventBus = {
    init() {
        this.bindCoreEvents();
        this.bindNavEvents();
        this.bindSettingsEvents();
        this.bindMenuEvents();
        this.bindReceiptEvents();
        this.bindFinanceEvents();
        this.bindLifeToolsEvents();
        
        // Global reference for inline HTML onclicks
        window.EventBus = this;
        window.UIBridge = UIBridge;
    },

    bindCoreEvents() {
        document.getElementById('start-btn').onclick = () => {
            if (!appState.settings.apiKey) {
                UIBridge.notify('請先設定 API 金鑰', 'warn');
                UIBridge.toggleDrawer(true);
                return;
            }
            appState.scannerMode = 'menu';
            appState.currentView = 'scanner';
            UIBridge.switchView('scanner');
            DeviceUtils.startCamera();
        };

        document.getElementById('scan-btn').onclick = async () => {
            const base64 = DeviceUtils.captureFrame();
            if (base64) this.handleScan(base64);
        };

        document.getElementById('upload-btn').onclick = () => {
            document.getElementById('file-input').click();
        };

        document.getElementById('file-input').onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const base64 = await DeviceUtils.processImageFile(file);
                this.handleScan(base64);
            }
        };

        document.getElementById('rescan-btn').onclick = () => {
            appState.scannerMode = 'menu';
            appState.currentView = 'scanner';
            UIBridge.switchView('scanner');
            DeviceUtils.startCamera();
        };

        document.getElementById('scanner-close-btn').onclick = () => {
            DeviceUtils.stopCamera();
            if (appState.scannerMode === 'receipt') {
                appState.scannerMode = 'menu';
                appState.currentView = 'finance';
                UIBridge.switchView('finance');
            } else {
                // menu mode
                if (appState.results && appState.results.length > 0) {
                    appState.currentView = 'results';
                    UIBridge.switchView('results');
                } else {
                    appState.currentView = 'landing';
                    UIBridge.switchView('landing');
                }
            }
        };
    },

    async handleScan(base64) {
        if (appState.scannerMode === 'receipt') {
            return await this.handleReceiptScan(base64);
        }

        UIBridge.notify('正在分析菜單...', 'info');
        const scanLine = document.getElementById('scan-line');
        if (scanLine) scanLine.style.opacity = '1';

        try {
            const results = await MenuService.analyzeMenu(base64);
            
            // Deduplicate against existing results
            results.forEach(newItem => {
                if (!appState.results.some(r => r.nameOriginal === newItem.nameOriginal)) {
                    appState.results.push(newItem);
                }
            });

            appState.currentView = 'results';
            Storage.saveLastResults();
            UIBridge.switchView('results');
            UIBridge.renderResults();
            DeviceUtils.stopCamera();
        } catch (error) {
            console.error(error);
            UIBridge.notify(error.message, 'error');
        } finally {
            if (scanLine) scanLine.style.opacity = '0';
        }
    },

    bindNavEvents() {
        document.getElementById('nav-scan-btn').onclick = () => {
            if (appState.results.length > 0) {
                appState.currentView = 'results';
                UIBridge.switchView('results');
                UIBridge.renderResults();
            } else {
                appState.currentView = 'landing';
                UIBridge.switchView('landing');
            }
        };

        document.getElementById('nav-history-btn').onclick = () => {
            appState.currentView = 'favorites';
            UIBridge.switchView('favorites');
            UIBridge.renderResults(appState.favorites, 'favorites-list');
        };

        document.getElementById('nav-finance-btn').onclick = () => {
            appState.currentView = 'finance';
            UIBridge.switchView('finance');
            UIBridge.renderAccounts();
        };

        document.getElementById('nav-life-btn').onclick = () => {
            appState.currentView = 'life-tools';
            UIBridge.switchView('life-tools');
            UIBridge.renderLifeTools();
        };

        document.getElementById('back-to-scan-btn').onclick = () => {
            appState.currentView = 'scanner';
            UIBridge.switchView('scanner');
            DeviceUtils.startCamera();
        };

        document.getElementById('settings-btn').onclick = () => UIBridge.toggleDrawer(true);
        document.getElementById('close-settings-btn').onclick = () => UIBridge.toggleDrawer(false);
    },

    bindSettingsEvents() {
        document.getElementById('currency-select').onchange = () => {
            UIBridge.updateSettingsUI();
        };

        document.getElementById('save-settings-btn').onclick = () => {
            appState.settings.apiKey = document.getElementById('api-key-input').value;
            appState.settings.model = document.getElementById('model-select').value;
            appState.settings.currency = document.getElementById('currency-select').value;
            appState.settings.prefCustom = document.getElementById('pref-custom').value;
            appState.settings.customRate = parseFloat(document.getElementById('rate-input').value) || 0;

            Storage.saveSettings();
            UIBridge.notify('設定已儲存', 'success');
            UIBridge.toggleDrawer(false);
            
            // Re-render current view to reflect changes
            if (appState.currentView === 'results') UIBridge.renderResults();
            if (appState.currentView === 'order-menu') UIBridge.renderOrderMenu();
        };

        document.getElementById('fetch-rate-btn').onclick = async () => {
            UIBridge.notify('正在獲取最新匯率...', 'info');
            const currentCurrency = document.getElementById('currency-select').value;
            const rate = await RateService.fetchLiveRate(currentCurrency);
            if (rate) {
                document.getElementById('rate-input').value = rate.toFixed(4);
                UIBridge.notify('匯率已更新', 'success');
            } else {
                UIBridge.notify('匯率獲取失敗', 'error');
            }
        };

        document.getElementById('help-api-btn-trigger').onclick = () => UIBridge.toggleHelpModal(true);
        document.getElementById('close-help-btn').onclick = () => UIBridge.toggleHelpModal(false);
        document.getElementById('done-help-btn').onclick = () => UIBridge.toggleHelpModal(false);
        
        document.getElementById('export-data-btn').onclick = () => this.exportData();
    },

    bindMenuEvents() {
        document.getElementById('generate-menu-btn').onclick = (e) => {
            e.stopPropagation();
            if (appState.order.length === 0) {
                UIBridge.notify('請先選擇菜單項目', 'warn');
                return;
            }
            appState.currentView = 'order-menu';
            UIBridge.switchView('order-menu');
            UIBridge.renderOrderMenu();
        };

        document.getElementById('cart-trigger').onclick = () => {
            const content = document.getElementById('cart-content');
            const chevron = document.getElementById('cart-chevron');
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                chevron.classList.replace('fa-chevron-down', 'fa-chevron-up');
            } else {
                content.style.maxHeight = '500px';
                chevron.classList.replace('fa-chevron-up', 'fa-chevron-down');
            }
        };

        document.getElementById('clear-order-btn').onclick = () => {
            appState.order = [];
            Storage.saveOrder();
            UIBridge.updateOrderUI();
        };

        document.getElementById('menu-back-scan').onclick = () => {
            appState.currentView = 'results';
            UIBridge.switchView('results');
            UIBridge.renderResults();
        };

        document.getElementById('menu-back-fav').onclick = () => {
            appState.currentView = 'favorites';
            UIBridge.switchView('favorites');
            UIBridge.renderResults(appState.favorites, 'favorites-list');
        };

        document.getElementById('finish-order-btn').onclick = () => {
            appState.order = [];
            Storage.saveOrder();
            UIBridge.updateOrderUI();
            UIBridge.notify('點餐完成！', 'success');
            appState.currentView = 'results';
            UIBridge.switchView('results');
            UIBridge.renderResults();
        };
    },

    bindReceiptEvents() {
        document.getElementById('receipt-scan-btn').onclick = () => {
            if (!appState.settings.apiKey) {
                UIBridge.notify('請先設定 API 金鑰', 'warn');
                UIBridge.toggleDrawer(true);
                return;
            }
            appState.scannerMode = 'receipt';
            appState.currentView = 'scanner';
            UIBridge.switchView('scanner');
            DeviceUtils.startCamera();
        };

        document.getElementById('receipt-cancel-btn').onclick = () => {
            appState.scannerMode = 'menu';
            appState.currentView = 'finance';
            UIBridge.switchView('finance');
        };

        document.getElementById('receipt-save-btn').onclick = () => {
            const accountId = document.getElementById('save-to-account-select').value;
            if (!accountId || !appState.receiptResult) {
                UIBridge.notify('請選擇帳本', 'warn');
                return;
            }
            
            const res = appState.receiptResult;
            FinanceService.addTransaction(accountId, {
                store: res.storeName,
                amount: res.totalAmount,
                date: res.date,
                currency: res.currency,
                type: 'expense',
                category: 'dining',
                note: `收據匯入: ${res.storeName}`,
                metadata: {
                    items: res.items,
                    source: 'receipt_ocr'
                }
            });
            
            UIBridge.notify('已儲存至帳本', 'success');
            appState.receiptResult = null;
            appState.scannerMode = 'menu';
            appState.currentView = 'finance';
            UIBridge.switchView('finance');
            UIBridge.renderAccounts();
        };
    },

    async handleReceiptScan(base64) {
        UIBridge.notify('正在辨識收據...', 'info');
        const scanLine = document.getElementById('scan-line');
        if (scanLine) scanLine.style.opacity = '1';

        try {
            const result = await ReceiptService.analyzeReceipt(base64);
            appState.receiptResult = result;
            UIBridge.switchView('receipt-result');
            UIBridge.renderReceiptResult();
            DeviceUtils.stopCamera();
        } catch (error) {
            console.error(error);
            UIBridge.notify(error.message || '收據辨識失敗', 'error');
            // Reset mode on failure to avoid contamination
            appState.scannerMode = 'menu';
            appState.currentView = 'finance';
            UIBridge.switchView('finance');
            DeviceUtils.stopCamera();
        } finally {
            if (scanLine) scanLine.style.opacity = '0';
        }
    },

    bindFinanceEvents() {
        document.getElementById('finance-add-account-btn').onclick = () => {
            const name = prompt('請輸入帳本名稱：');
            if (!name) return;
            const currency = prompt('請輸入幣別 (TWD/JPY/HKD/USD)：', appState.settings.currency) || 'TWD';
            
            FinanceService.addAccount(name, currency);
            UIBridge.renderAccounts();
        };
    },

    bindLifeToolsEvents() {
        // inline events handled by onclick in UIBridge.renderLifeTools
    },

    // Action Handlers for list items
    addOrderItem(index, source = 'results') {
        const item = (source === 'results') ? appState.results[index] : appState.favorites[index];
        if (!item) return;

        const existing = appState.order.find(o => o.nameOriginal === item.nameOriginal);
        if (existing) {
            existing.qty++;
        } else {
            appState.order.push({ ...item, qty: 1 });
        }
        
        Storage.saveOrder();
        UIBridge.updateOrderUI();
        if (source === 'results') UIBridge.renderResults();
        else UIBridge.renderResults(appState.favorites, 'favorites-list');
    },

    updateQty(index, delta) {
        const item = appState.order[index];
        if (!item) return;
        
        item.qty += delta;
        if (item.qty <= 0) {
            appState.order.splice(index, 1);
        }
        
        Storage.saveOrder();
        UIBridge.updateOrderUI();
        
        // Update results view if active
        if (appState.currentView === 'results') UIBridge.renderResults();
        if (appState.currentView === 'favorites') UIBridge.renderResults(appState.favorites, 'favorites-list');
    },

    toggleFavorite(index, source = 'results-list') {
        const items = (source === 'results-list') ? appState.results : appState.favorites;
        const item = items[index];
        if (!item) return;

        const favIndex = appState.favorites.findIndex(f => f.nameOriginal === item.nameOriginal);
        if (favIndex > -1) {
            appState.favorites.splice(favIndex, 1);
        } else {
            appState.favorites.push(item);
        }

        Storage.saveFavorites();
        if (source === 'results-list') UIBridge.renderResults(appState.results, 'results-list');
        else UIBridge.renderResults(appState.favorites, 'favorites-list');
    },

    toggleMenuFavorite(index) {
        const item = appState.order[index];
        if (!item) return;
        
        const favIndex = appState.favorites.findIndex(f => f.nameOriginal === item.nameOriginal);
        if (favIndex > -1) {
            appState.favorites.splice(favIndex, 1);
        } else {
            appState.favorites.push({
                nameOriginal: item.nameOriginal,
                nameTranslated: item.nameTranslated,
                price: item.price,
                description: item.description,
                dietary_tags: item.dietary_tags,
                allergen_warning: item.allergen_warning
            });
        }
        
        Storage.saveFavorites();
        UIBridge.renderOrderMenu();
    },

    saveMemo() {
        const input = document.getElementById('memo-input');
        if (!input || !input.value.trim()) return;
        LifeToolsService.saveMemo(input.value);
        UIBridge.renderLifeToolDetail('memo');
    },

    calculateCurrency() {
        const jpyInput = document.getElementById('calc-jpy');
        const resultEl = document.getElementById('calc-result');
        if (!jpyInput || !resultEl) return;
        
        const jpy = parseFloat(jpyInput.value) || 0;
        const rate = RateService.getExchangeRate(appState.settings.currency);
        resultEl.innerText = RateService.format(jpy, appState.settings.currency, rate);
    },

    openLifeTool(toolId) {
        UIBridge.renderLifeToolDetail(toolId);
    },

    viewAccountDetail(accountId) {
        const account = FinanceService.getAccount(accountId);
        if (!account) return;
        
        UIBridge.notify(`帳本 「${account.name}」 詳情介面開發中`, 'info');
    },

    exportData() {
        const data = {
            accounts: appState.financeModule.accounts,
            memos: appState.lifeToolsModule.memos,
            favorites: appState.favorites,
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `menulens_backup_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
};
