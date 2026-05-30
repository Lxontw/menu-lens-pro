import { appState } from '../state/app-state.js';
import { Storage } from '../storage/local-storage.js';

/**
 * Exchange Rate Service
 */
export const RateService = {
    getExchangeRate(currency) {
        return Storage.getCustomRate(currency);
    },

    async fetchLiveRate(currency) {
        try {
            // Using Frankfurter API (Free, no key)
            const response = await fetch(`https://api.frankfurter.dev/v2/latest?base=JPY&symbols=${currency}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            return data.rates[currency];
        } catch (error) {
            console.error('Failed to fetch live rate:', error);
            return null;
        }
    },

    format(value, currency, rate) {
        if (!rate || rate === 0) return '未設定匯率';
        const converted = value * rate;
        
        const formatters = {
            TWD: (v) => `NT$ ${Math.round(v).toLocaleString()}`,
            HKD: (v) => `HK$ ${v.toFixed(2)}`,
            USD: (v) => `$ ${v.toFixed(2)}`
        };

        return formatters[currency] ? formatters[currency](converted) : `${currency} ${converted.toFixed(2)}`;
    }
};
