import { appState } from './state/app-state.js';
import { EventBus } from './events/event-bus.js';
import { UIBridge } from './ui/ui-bridge.js';

/**
 * App Bootstrapper
 */
window.addEventListener('load', () => {
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
