import { appState } from '../state/app-state.js';

/**
 * Storage Helper
 */
export const Storage = {
    // Helper to safely get and parse JSON from localStorage
    getJSON(key, defaultValue = []) {
        try {
            const data = localStorage.getItem(key);
            if (!data) return defaultValue;
            const parsed = JSON.parse(data);
            return parsed || defaultValue;
        } catch (e) {
            console.error(`Error parsing localStorage key "${key}":`, e);
            return defaultValue;
        }
    },

    saveSettings() {
        localStorage.setItem('menulens_api_key', appState.settings.apiKey);
        localStorage.setItem('menulens_model', appState.settings.model);
        localStorage.setItem('menulens_currency', appState.settings.currency);
        localStorage.setItem('menulens_pref_custom', appState.settings.prefCustom);
        
        // v1.3: Save custom rate for each currency
        const rateKey = `menulens_rate_${appState.settings.currency}`;
        if (appState.settings.customRate && appState.settings.customRate > 0) {
            localStorage.setItem(rateKey, appState.settings.customRate);
        } else {
            localStorage.removeItem(rateKey);
        }
    },

    saveFavorites() {
        localStorage.setItem('menulens_favorites', JSON.stringify(appState.favorites));
    },

    saveOrder() {
        localStorage.setItem('menulens_current_order', JSON.stringify(appState.order));
    },

    saveLastResults() {
        localStorage.setItem('menulens_last_results', JSON.stringify(appState.results));
    },

    saveOrderHistory() {
        localStorage.setItem('menulens_order_history', JSON.stringify(appState.orderHistory));
    },

    saveCurrentBill() {
        localStorage.setItem('menulens_current_bill', JSON.stringify(appState.currentBill));
    },

    saveFinance() {
        localStorage.setItem('menulens_accounts', JSON.stringify(appState.financeModule.accounts));
    },

    saveCurrentAccount() {
        localStorage.setItem('menulens_current_account_id', appState.currentAccountId || '');
    },

    exportBackup() {
        const backup = {};
        Object.keys(localStorage)
            .filter(key => key.startsWith('menulens_'))
            .forEach(key => {
                backup[key] = localStorage.getItem(key);
            });
        return backup;
    },

    importBackup(backupData = {}) {
        Object.entries(backupData).forEach(([key, value]) => {
            if (!key.startsWith('menulens_')) return;
            if (typeof value === 'string') {
                localStorage.setItem(key, value);
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
        });
    },

    saveLifeTools() {
        localStorage.setItem('menulens_reminders', JSON.stringify(appState.lifeToolsModule.reminders));
        localStorage.setItem('menulens_memos', JSON.stringify(appState.lifeToolsModule.memos));
    },

    getCustomRate(currency) {
        return parseFloat(localStorage.getItem(`menulens_rate_${currency}`)) || 0;
    }
};
