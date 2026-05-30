import { appState } from './state/app-state.js';
import { EventBus } from './events/event-bus.js';
import { UIBridge } from './ui/ui-bridge.js';

/**
 * App Bootstrapper
 */
window.addEventListener('load', () => {
    // Model Migration / Fallback logic
    const allowedModels = [
        'gemini-3.5-flash', 'gemini-3.1-flash-lite', 
        'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'
    ];
    if (!allowedModels.includes(appState.settings.model)) {
        console.log(`Detected legacy/invalid model: ${appState.settings.model}. Falling back to gemini-3.5-flash.`);
        appState.settings.model = 'gemini-3.5-flash';
        localStorage.setItem('menulens_model', 'gemini-3.5-flash');
    }

    // Initialize Event Bindings
    EventBus.init();

    // Initial View Logic
    if (appState.results.length > 0) {
        UIBridge.switchView('results');
        UIBridge.renderResults();
    } else {
        UIBridge.switchView('landing');
    }

    // Update UI components with initial state
    UIBridge.updateOrderUI();
    UIBridge.renderAccounts();
    UIBridge.renderLifeTools();
    
    console.log('MenuLens Pro v2.0 Modularized Bootstrapped.');
});
