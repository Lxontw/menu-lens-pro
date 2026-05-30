import { appState } from './state/app-state.js';
import { EventBus } from './events/event-bus.js';
import { UIBridge } from './ui/ui-bridge.js';

/**
 * App Bootstrapper
 */
window.addEventListener('load', () => {
    window.__appState = appState;

    // Model Migration / Fallback logic
    const allowedModels = [
        'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'
    ];
    if (!allowedModels.includes(appState.settings.model)) {
        console.log(`Detected legacy/invalid model: ${appState.settings.model}. Falling back to gemini-2.5-flash.`);
        appState.settings.model = 'gemini-2.5-flash';
        localStorage.setItem('menulens_model', 'gemini-2.5-flash');
    }

    // Initialize Event Bindings
    EventBus.init();

    // Initial View Logic
    UIBridge.switchView('home');
    UIBridge.renderHomeDashboard();

    // Update UI components with initial state
    UIBridge.updateOrderUI();
    UIBridge.renderAccounts();
    UIBridge.renderLifeTools();
    
    console.log('MenuLens Pro v2.1 Initialized.');
});
