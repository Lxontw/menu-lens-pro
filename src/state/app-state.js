import { Storage } from '../storage/local-storage.js';

/**
 * Global App State
 */
export const appState = {
    settings: {
        apiKey: localStorage.getItem('menulens_api_key') || '',
        model: localStorage.getItem('menulens_model') || 'gemini-3.5-flash',
        currency: localStorage.getItem('menulens_currency') || 'TWD',
        prefCustom: localStorage.getItem('menulens_pref_custom') || '',
        customRate: 0 // Will be populated by UIBridge or RateService when needed
    },
    currentView: 'landing',
    scannerMode: 'menu', // 'menu' or 'receipt'
    stream: null,
    results: Storage.getJSON('menulens_last_results'),
    order: Storage.getJSON('menulens_current_order'),
    favorites: Storage.getJSON('menulens_favorites'),
    financeModule: {
        accounts: Storage.getJSON('menulens_accounts')
    },
    lifeToolsModule: {
        tools: [
            {id:'currency', name:'匯率計算器', icon:'fa-exchange-alt', color:'text-indigo-600'},
            {id:'unit',      name:'單位換算',      icon:'fa-ruler-combined', color:'text-emerald-600'},
            {id:'reminder',  name:'提醒事項',      icon:'fa-bell',           color:'text-rose-600'},
            {id:'memo',      name:'緊急備忘錄',    icon:'fa-sticky-note',    color:'text-amber-600'}
        ],
        reminders: Storage.getJSON('menulens_reminders'),
        memos: Storage.getJSON('menulens_memos')
    },
    receiptResult: null
};
