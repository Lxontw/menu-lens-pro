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
            // Using Open ER API (Free, currently stable)
            const response = await fetch(`https://open.er-api.com/v6/latest/JPY`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            if (data.result === 'success' && data.rates && data.rates[currency]) {
                return data.rates[currency];
            }
            
            console.warn(`Rate for ${currency} not found in API response`);
            return null;
        } catch (error) {
            console.error('Failed to fetch live rate from open.er-api.com:', error);
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
