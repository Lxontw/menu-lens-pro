import { appState } from '../state/app-state.js';
import { Storage } from '../storage/local-storage.js';

/**
 * Finance Service
 */
export const FinanceService = {
    addAccount(name, currency, type = 'personal') {
        const newAccount = {
            id: Date.now().toString(),
            name,
            type,
            currency,
            createdAt: new Date().toISOString(),
            items: []
        };
        appState.financeModule.accounts.push(newAccount);
        Storage.saveFinance();
        return newAccount;
    },

    deleteAccount(accountId) {
        appState.financeModule.accounts = appState.financeModule.accounts.filter(a => a.id !== accountId);
        Storage.saveFinance();
    },

    addTransaction(accountId, transaction) {
        const account = appState.financeModule.accounts.find(a => a.id === accountId);
        if (!account) return;

        transaction.id = Date.now().toString();
        transaction.date = transaction.date || new Date().toISOString();
        account.items.push(transaction);
        Storage.saveFinance();
    },

    getAccount(accountId) {
        return appState.financeModule.accounts.find(a => a.id === accountId);
    }
};
