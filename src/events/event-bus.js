import { appState } from '../state/app-state.js';
import { Storage } from '../storage/local-storage.js';
import { MenuService } from '../core/menu-service.js';
import { ReceiptService } from '../core/receipt-service.js';
import { FinanceService } from '../core/finance-service.js';
import { LifeToolsService } from '../core/life-tools-service.js';
import { RateService } from '../core/rate-service.js';
import { OrderService } from '../core/order-service.js';
import { SplitService } from '../core/split-service.js';
import { DeviceUtils } from '../device/camera.js';
import { UIBridge } from '../ui/ui-bridge.js';
import { views } from '../ui/views.js';

/**
 * Event Bus - Orchestrates interactions between UI, Core Services, and State
 */
export const EventBus = {
    _handlers: {},

    init() {
        this.registerEventHandlers();
        this.bindDOMEvents();
        
        // Global reference for inline HTML onclicks
        window.EventBus = this;
        window.UIBridge = UIBridge;
    },

    dispatch(eventName, payload) {
        if (this._handlers[eventName]) {
            this._handlers[eventName](payload);
        } else {
            console.warn(`No handler registered for event: ${eventName}`);
        }
    },

    registerEventHandlers() {
        this._handlers = {
            // --- App Lifecycle & Navigation ---
            'navigate': (viewName) => {
                const targetView = viewName === 'split-view' ? 'split' : viewName;
                appState.currentView = targetView;
                UIBridge.switchView(targetView);
                if (targetView === 'history') UIBridge.renderHistoryList();
                if (targetView === 'finance') UIBridge.renderAccounts();
                if (targetView === 'life-tools') UIBridge.renderLifeTools();
                if (targetView === 'home') UIBridge.renderHomeDashboard();
                if (targetView === 'order-preview') UIBridge.renderOrderPreview(appState.currentOrderPreview);
                if (targetView === 'split') UIBridge.renderSplitView();
            },
            'toggle-settings': () => UIBridge.toggleDrawer(true),
            'close-settings': () => UIBridge.toggleDrawer(false),
            'toggle-help': () => UIBridge.toggleHelpModal(true),
            'close-help': () => UIBridge.toggleHelpModal(false),
            'navigate-back': () => {
                // A simple back implementation. For now, just goes to history list.
                // A more robust solution would track view history.
                this.dispatch('navigate', 'history');
            },
            'navigate-home': () => {
                this.dispatch('navigate', 'home');
            },
            'start-scan': (payload) => {
                if (!appState.settings.apiKey) {
                    UIBridge.notify('請先設定 API 金鑰', 'warn');
                    return this.dispatch('toggle-settings');
                }
                appState.scannerMode = payload.mode || 'menu';
                this.dispatch('navigate', 'scanner');
                DeviceUtils.startCamera();
            },
            'upload-file-intent': () => {
                if (appState.scannerStatus === 'analyzing') return;
                document.getElementById('file-input').click();
            },
            'scan-capture': async () => {
                if (appState.scannerStatus === 'analyzing') return;
                const base64 = DeviceUtils.captureFrame();
                if (base64) {
                    appState.lastScanSource = 'camera';
                    this.handleScan(base64);
                }
            },
            'close-scanner': () => {
                DeviceUtils.stopCamera();
                const targetView = (appState.results && appState.results.length > 0) ? 'results' : 'home';
                this.dispatch('navigate', targetView);
            },
            'process-file-upload': async (file) => {
                 if (file) {
                    appState.lastScanSource = 'upload';
                    const base64 = await DeviceUtils.processImageFile(file);
                    this.handleScan(base64);
                }
            },
            'start-new-scan-session': () => {
                appState.results = [];
                Storage.saveLastResults();
                UIBridge.notify('已清空目前辨識結果，開始新的掃描流程', 'info');
                this.dispatch('start-scan', { mode: 'menu' });
            },

            // --- Order & Cart ---
            'generate-order-preview': () => {
                if (appState.order.length === 0) {
                    return UIBridge.notify('請先選擇菜單項目', 'warn');
                }
                const orderPreviewData = OrderService.createOrderFromCart();
                appState.currentOrderPreview = orderPreviewData;
                UIBridge.renderOrderPreview(appState.currentOrderPreview);
                this.dispatch('navigate', 'order-preview');
             },
            'go-to-split': () => {
                if (!appState.currentOrderPreview) return;
                SplitService.createSplitFromOrder(appState.currentOrderPreview);
                this.dispatch('navigate', 'split');
            },
            'finalize-split': () => {
                if (!appState.currentBill) return;
                
                const orderToSave = appState.currentOrderPreview;
                if(orderToSave){
                    orderToSave.splitDetails = appState.currentBill;
                    OrderService.saveOrderToHistory(orderToSave);
                }

                SplitService.finalizeSplit(); // Clears currentBill
                OrderService.clearCurrentOrder();
                UIBridge.updateOrderUI();
                this.dispatch('navigate', 'history');
                UIBridge.notify('分帳完成並已儲存至歷史紀錄', 'success');
            },
            'clear-order': () => {
                OrderService.clearCurrentOrder();
                UIBridge.updateOrderUI();
            },
            'show-order-summary': () => {
                const content = document.getElementById('cart-content');
                const chevron = document.getElementById('cart-chevron');
                const isExpanded = content.style.maxHeight && content.style.maxHeight !== '0px';

                if (isExpanded) {
                    content.style.maxHeight = null;
                    chevron.classList.replace('fa-chevron-down', 'fa-chevron-up');
                } else {
                    content.style.maxHeight = '500px';
                    chevron.classList.replace('fa-chevron-up', 'fa-chevron-down');
                }
            },

            // --- Settings ---
            'save-settings': () => {
                appState.settings.apiKey = document.getElementById('api-key-input').value;
                appState.settings.model = document.getElementById('model-select').value;
                appState.settings.currency = document.getElementById('currency-select').value;
                appState.settings.prefCustom = document.getElementById('pref-custom').value;
                appState.settings.customRate = parseFloat(document.getElementById('rate-input').value) || 0;

                Storage.saveSettings();
                UIBridge.notify('設定已儲存', 'success');
                UIBridge.toggleDrawer(false);
            },
            'fetch-live-rate': async () => {
                UIBridge.notify('正在獲取最新匯率...', 'info');
                const currentCurrency = document.getElementById('currency-select').value;
                const rate = await RateService.fetchLiveRate(currentCurrency, true);
                if (rate) {
                    appState.settings.customRate = rate;
                    document.getElementById('rate-input').value = rate.toFixed(4);
                    Storage.saveSettings();
                    UIBridge.notify('匯率已更新並已儲存', 'success');
                } else {
                    UIBridge.notify('匯率獲取失敗', 'error');
                }
            },
            'export-data': () => {
                const data = Storage.exportBackup();
                const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `menulens_backup_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                UIBridge.notify('已匯出備份檔', 'success');
            },
            'trigger-import-data': () => {
                document.getElementById('import-data-input')?.click();
            },
            'import-data': async (file) => {
                if (!file) return;
                try {
                    const text = await file.text();
                    const parsed = JSON.parse(text);
                    Storage.importBackup(parsed);
                    UIBridge.notify('已匯入備份資料，請重新整理畫面', 'success');
                    window.location.reload();
                } catch (error) {
                    console.error(error);
                    UIBridge.notify('匯入失敗，請確認 JSON 格式', 'error');
                }
            },
            'share-data': async () => {
                const backup = Storage.exportBackup();
                const text = JSON.stringify(backup, null, 2);
                try {
                    if (navigator.share) {
                        await navigator.share({ title: 'MenuLens Pro 備份', text });
                        UIBridge.notify('已開啟分享面板', 'success');
                    } else if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(text);
                        UIBridge.notify('備份內容已複製到剪貼簿', 'success');
                    } else {
                        UIBridge.notify('此裝置不支援分享或複製', 'warn');
                    }
                } catch (error) {
                    console.error(error);
                    UIBridge.notify('分享失敗', 'error');
                }
            },
        // --- History / Split / Receipt / Finance ---
            'view-history-item': (payload) => {
                const order = appState.orderHistory.find(o => o.id === payload.id);
                if (!order) return;
                
                const container = document.getElementById('history-view');
                if (container) {
                    container.innerHTML = views.renderHistoryDetailView(order);
                }
                // We just need to make sure the view is visible.
                UIBridge.switchView('history');
            },
            'reuse-order': (payload) => {
                if (OrderService.reuseOrder(payload.id)) {
                    UIBridge.notify('已將歷史訂單複製回點餐單', 'success');
                    this.dispatch('navigate', 'home');
                    UIBridge.updateOrderUI();
                } else {
                    UIBridge.notify('找不到要重複使用的訂單', 'error');
                }
            },
            'reuse-history-order': () => {
                if (!appState.currentOrderPreview) return;
                if (OrderService.reuseOrder(appState.currentOrderPreview.id)) {
                    UIBridge.notify('已複製回點餐單', 'success');
                    this.dispatch('navigate', 'home');
                    UIBridge.updateOrderUI();
                } else {
                    UIBridge.notify('找不到可複製的歷史訂單', 'error');
                }
            },
            'add-participant': () => {
                if (!appState.currentBill) return;
                const input = document.getElementById('split-participant-input');
                const name = input?.value?.trim() || '';
                if (!name) {
                    return UIBridge.notify('請先輸入成員名稱', 'warn');
                }
                SplitService.addParticipant(name);
                if (input) input.value = '';
                UIBridge.renderSplitView();
            },
            'finish-order': () => {
                OrderService.clearCurrentOrder();
                appState.currentOrderPreview = null;
                UIBridge.updateOrderUI();
                UIBridge.notify('點餐單已清空', 'success');
                this.dispatch('navigate', 'home');
            },
            'create-quick-account': () => {
                const nextIndex = appState.financeModule.accounts.length + 1;
                const account = FinanceService.addAccount(`新帳本 ${nextIndex}`, appState.settings.currency, 'personal');
                UIBridge.renderAccounts();
                UIBridge.notify(`已建立 ${account.name}`, 'success');
            },
            'view-account-detail': (accountId) => {
                appState.currentAccountId = accountId;
                Storage.saveCurrentAccount();
                UIBridge.renderAccounts();
            },
            'save-receipt-to-account': async () => {
                const receipt = appState.receiptResult;
                const selectedId = document.getElementById('save-to-account-select')?.value;
                if (!receipt) return UIBridge.notify('沒有可儲存的收據內容', 'warn');

                let account = appState.financeModule.accounts.find(a => a.id === selectedId);
                if (!account) {
                    account = FinanceService.addAccount('未命名帳本', receipt.originalCurrency || appState.settings.currency, 'personal');
                }

                const targetCurrency = account.currency || appState.settings.currency || 'TWD';
                const originalCurrency = receipt.originalCurrency || 'JPY';
                const originalAmount = receipt.originalAmount || 0;
                let saveAmount = originalAmount;
                let saveCurrency = originalCurrency;

                if (originalCurrency !== targetCurrency) {
                    const converted = await RateService.convert(originalAmount, originalCurrency, targetCurrency);
                    if (converted === null) {
                        UIBridge.notify('匯率取得失敗，請先設定匯率或稍後再試', 'error');
                        return;
                    }
                    saveAmount = converted;
                    saveCurrency = targetCurrency;
                }

                const transaction = {
                    type: 'expense',
                    title: receipt.translatedStoreName || receipt.storeName || '收據記錄',
                    amount: saveAmount,
                    currency: saveCurrency,
                    date: receipt.date || new Date().toISOString(),
                    items: receipt.items || [],
                    source: 'receipt-scan',
                    originalAmount: receipt.originalAmount,
                    originalCurrency: receipt.originalCurrency,
                    convertedAmount: receipt.convertedAmount,
                    convertedCurrency: receipt.convertedCurrency,
                    rawText: receipt.rawText
                };

                if (receipt.paymentMethod) {
                    transaction.paymentMethod = receipt.paymentMethod;
                }

                FinanceService.addTransaction(account.id, transaction);

                UIBridge.notify('收據已儲存至帳本', 'success');
                this.dispatch('navigate', 'finance');
                UIBridge.renderAccounts();
            },
        };
    },

    bindDOMEvents() {
        // Navigation
        document.getElementById('nav-home-btn').onclick = () => this.dispatch('navigate', 'home');
        document.getElementById('nav-history-btn').onclick = () => this.dispatch('navigate', 'history');
        document.getElementById('nav-finance-btn').onclick = () => this.dispatch('navigate', 'finance');
        document.getElementById('nav-life-btn').onclick = () => this.dispatch('navigate', 'life-tools');

        // Header
        document.getElementById('settings-btn').onclick = () => this.dispatch('toggle-settings');
        
        // Scanner
        document.getElementById('start-btn').onclick = () => this.dispatch('start-scan', { mode: 'menu' });
        document.getElementById('upload-landing-btn').onclick = () => {
            appState.scannerMode = 'menu';
            document.getElementById('file-input').click();
        };
        document.getElementById('scan-btn').onclick = () => this.dispatch('scan-capture');
        document.getElementById('upload-btn').onclick = () => document.getElementById('file-input').click();
        document.getElementById('error-upload-btn').onclick = () => document.getElementById('file-input').click();
        document.getElementById('scanner-close-btn').onclick = () => this.dispatch('close-scanner');
        document.getElementById('file-input').onchange = (e) => this.dispatch('process-file-upload', e.target.files[0]);

        // Home / History / Finance / Receipt
        document.getElementById('back-to-scan-btn').onclick = () => this.dispatch('navigate', 'scanner');
        document.getElementById('receipt-cancel-btn').onclick = () => this.dispatch('navigate', 'home');
        document.getElementById('receipt-save-btn').onclick = () => this.dispatch('save-receipt-to-account');
        document.getElementById('receipt-scan-btn').onclick = () => this.dispatch('start-scan', { mode: 'receipt' });
        document.getElementById('finance-add-account-btn').onclick = () => this.dispatch('create-quick-account');
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) exportBtn.onclick = () => this.dispatch('export-data');
        const importBtn = document.getElementById('import-data-btn');
        if (importBtn) importBtn.onclick = () => this.dispatch('trigger-import-data');
        const shareBtn = document.getElementById('share-data-btn');
        if (shareBtn) shareBtn.onclick = () => this.dispatch('share-data');
        const importInput = document.getElementById('import-data-input');
        if (importInput) importInput.onchange = (e) => this.dispatch('import-data', e.target.files[0]);

        // Results
        document.getElementById('append-scan-btn').onclick = () => this.dispatch('start-scan', { mode: 'menu' });
        document.getElementById('new-scan-btn').onclick = () => this.dispatch('start-new-scan-session');
        
        // Cart / Order
        document.getElementById('cart-trigger').onclick = () => this.dispatch('show-order-summary');
        document.getElementById('generate-menu-btn').onclick = (e) => { e.stopPropagation(); this.dispatch('generate-order-preview'); };
        document.getElementById('clear-order-btn').onclick = () => this.dispatch('clear-order');
        document.getElementById('menu-back-scan').onclick = () => this.dispatch('navigate', 'scanner');
        document.getElementById('menu-back-fav').onclick = () => this.dispatch('navigate', 'favorites');
        document.getElementById('finish-order-btn').onclick = () => this.dispatch('finish-order');
        document.getElementById('order-preview-back-btn').onclick = () => this.dispatch('navigate', appState.currentOrderPreview?.fromHistory ? 'history' : 'results');
        document.getElementById('order-preview-split-btn').onclick = () => this.dispatch('go-to-split');

        // Split
        document.getElementById('split-back-btn').onclick = () => this.dispatch('navigate', 'order-preview');
        document.getElementById('split-finish-btn').onclick = () => this.dispatch('finalize-split');

        // Help
        document.getElementById('scanner-help-btn').onclick = () => this.dispatch('toggle-help');
        document.getElementById('close-help-btn').onclick = () => this.dispatch('close-help');
        document.getElementById('done-help-btn').onclick = () => this.dispatch('close-help');
    },

    async handleScan(base64) {
        if (appState.scannerStatus === 'analyzing') return;
        
        const isReceiptMode = appState.scannerMode === 'receipt';
        const service = isReceiptMode ? ReceiptService : MenuService;
        const analyzingText = isReceiptMode ? '正在辨識收據...' : '正在分析菜單...';

        appState.scannerStatus = 'analyzing';
        UIBridge.updateScannerUI();
        UIBridge.notify(analyzingText, 'info');
        
        try {
            if (isReceiptMode) {
                const result = await service.analyzeReceipt(base64);
                appState.receiptResult = result;
                UIBridge.renderReceiptResult();
                this.dispatch('navigate', 'receipt-result');
            } else {
                const results = await service.analyzeMenu(base64);
                results.forEach(newItem => {
                    if (!appState.results.some(r => r.nameOriginal === newItem.nameOriginal)) {
                        appState.results.push(newItem);
                    }
                });
                Storage.saveLastResults();
                OrderService.addItemsToCart(results);
                UIBridge.updateOrderUI();
                UIBridge.renderResults();
                this.dispatch('navigate', 'results');
            }
            DeviceUtils.stopCamera();
            appState.scannerStatus = 'idle';
        } catch (error) {
            console.error(error);
            UIBridge.notify(error.message || '辨識失敗', 'error');
            appState.scannerStatus = 'ready';
            this.dispatch('navigate', 'home');
        } finally {
            UIBridge.updateScannerUI();
        }
    },
};
