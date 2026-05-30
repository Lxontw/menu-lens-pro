import { appState } from '../state/app-state.js';
import { Storage } from '../storage/local-storage.js';

/**
 * Order Service
 * Manages the lifecycle of an order, from cart to history.
 */
export const OrderService = {
    addItemsToCart(items) {
        if (!items || !Array.isArray(items)) return;

        items.forEach(newItem => {
            const existingItem = appState.order.find(o => o.nameOriginal === newItem.nameOriginal);
            if (existingItem) {
                existingItem.qty++;
            } else {
                appState.order.push({ ...newItem, qty: 1 });
            }
        });

        Storage.saveOrder();
    },

    createOrderFromCart() {
        if (appState.order.length === 0) return null;

        const items = JSON.parse(JSON.stringify(appState.order)); // Deep copy
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const totalItems = items.reduce((sum, item) => sum + item.qty, 0);

        return {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            items: items,
            totalAmount: totalAmount,
            totalItems: totalItems,
            currency: appState.settings.currency,
            storeName: '',
            notes: '',
            participants: [],
            splitResult: null,
            status: 'pending' 
        };
    },

    saveOrderToHistory(order) {
        if (!order) return;
        const snapshot = JSON.parse(JSON.stringify(order));
        snapshot.status = 'completed';
        appState.orderHistory.push(snapshot); // Add to the end of the array
        Storage.saveOrderHistory();
    },

    clearCurrentOrder() {
        appState.order = [];
        Storage.saveOrder();
    },

    reuseOrder(orderId) {
        const orderFromHistory = appState.orderHistory.find(o => o.id === orderId);
        if (orderFromHistory) {
            // Create a new draft order from the historical one
            appState.order = JSON.parse(JSON.stringify(orderFromHistory.items));
            Storage.saveOrder();
            return true;
        }
        return false;
    }
};
