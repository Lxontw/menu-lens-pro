import { appState } from '../state/app-state.js';
import { Storage } from '../storage/local-storage.js';

/**
 * Life Tools Service
 */
export const LifeToolsService = {
    // Unit conversion rates (base unit as reference)
    unitRates: {
        length: { base: 'mm', m: 1000, cm: 10, mm: 1, km: 1000000, in: 25.4, ft: 304.8 },
        weight: { base: 'g', kg: 1000, g: 1, mg: 0.001, lb: 453.59, oz: 28.35 },
        volume: { base: 'ml', l: 1000, ml: 1, cup: 240, pint: 473.18 }
    },

    convertUnit(type, value, fromUnit, toUnit) {
        if (type === 'temperature') {
            if (fromUnit === 'C' && toUnit === 'F') return (value * 9/5) + 32;
            if (fromUnit === 'F' && toUnit === 'C') return (value - 32) * 5/9;
            return value;
        }
        const rates = this.unitRates[type];
        if (!rates) return value;
        const valueInBase = value * rates[fromUnit];
        return valueInBase / rates[toUnit];
    },

    saveMemo(content) {
        const memo = {
            id: Date.now().toString(),
            contentEncoded: btoa(unescape(encodeURIComponent(content))), // Base64 supporting UTF-8
            timestamp: new Date().toISOString()
        };
        appState.lifeToolsModule.memos.unshift(memo);
        Storage.saveLifeTools();
    },

    getMemos() {
        return appState.lifeToolsModule.memos.map(m => ({
            ...m,
            content: decodeURIComponent(escape(atob(m.contentEncoded)))
        }));
    }
};
