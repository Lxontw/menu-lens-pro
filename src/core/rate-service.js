import { appState } from '../state/app-state.js';
import { Storage } from '../storage/local-storage.js';

/**
 * Exchange Rate Service
 */
export const RateService = {
    getStoredRate(currency) {
        return Storage.getCustomRate(currency);
    },

    getExchangeRate(currency) {
        if (currency === 'JPY') return 1;
        if (appState.settings.currency === currency && appState.settings.customRate > 0) {
            return appState.settings.customRate;
        }
        return this.getStoredRate(currency);
    },

    async resolveRate(currency) {
        if (currency === 'JPY') return 1;

        const storedRate = this.getExchangeRate(currency);
        if (storedRate && storedRate > 0) {
            return storedRate;
        }

        // If not found, fetch, persist, and return
        const liveRate = await this.fetchLiveRate(currency, true);
        return liveRate;
    },

    /**
     * Convert amount between currencies
     * @param {number} amount 
     * @param {string} fromCurrency 
     * @param {string} toCurrency 
     * @returns {Promise<number|null>}
     */
    async convert(amount, fromCurrency, toCurrency) {
        if (!amount && amount !== 0) return null;
        if (fromCurrency === toCurrency) return amount;

        const fromRate = await this.resolveRate(fromCurrency);
        const toRate = await this.resolveRate(toCurrency);

        if (fromRate && toRate) {
            // Formula: amount * (1/fromRate) * toRate  => amount * toRate / fromRate
            return (amount / fromRate) * toRate;
        }

        return null;
    },

    async fetchLiveRate(currency, persist = false) {
        try {
            // Using Open ER API (Free, currently stable)
            const response = await fetch(`https://open.er-api.com/v6/latest/JPY`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            if (data.result === 'success' && data.rates && data.rates[currency]) {
                const rate = data.rates[currency];
                if (persist) {
                    Storage.saveCustomRate(currency, rate);
                    appState.settings.customRate = rate;
                }
                return rate;
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
