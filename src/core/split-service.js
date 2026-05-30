import { appState } from '../state/app-state.js';
import { Storage } from '../storage/local-storage.js';

/**
 * Split Service
 * Handles all logic related to bill splitting.
 */
export const SplitService = {
    createSplitFromOrder(order) {
        if (!order) return;

        const total = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);

        appState.currentBill = {
            id: `split-${order.id}`,
            sourceOrderId: order.id,
            totalAmount: total,
            participants: [],
            splitMode: 'even',
            status: 'draft'
        };
        this.addParticipant('Me'); // Add the current user by default
        Storage.saveCurrentBill();
    },

    addParticipant(name) {
        if (!appState.currentBill || !name) return;

        const newParticipant = {
            id: `p-${Date.now()}`,
            name: name,
            amount: 0
        };
        appState.currentBill.participants.push(newParticipant);
        this.calculateSplit();
        Storage.saveCurrentBill();
    },

    calculateSplit() {
        if (!appState.currentBill) return;

        const bill = appState.currentBill;
        const numParticipants = bill.participants.length;
        if (numParticipants === 0) return;

        const amountPerPerson = Math.ceil(bill.totalAmount / numParticipants);
        
        bill.participants.forEach((p, index) => {
            p.amount = amountPerPerson;
        });

        // Adjust for rounding issues on the last person
        const totalCalculated = amountPerPerson * numParticipants;
        if (totalCalculated !== bill.totalAmount) {
            const difference = bill.totalAmount - totalCalculated;
            bill.participants[numParticipants - 1].amount += difference;
        }

        Storage.saveCurrentBill();
    },

    finalizeSplit() {
        if (!appState.currentBill) return;
        appState.currentBill.status = 'finalized';
        // The split data is part of the order now
        const orderInHistory = appState.orderHistory.find(o => o.id === appState.currentBill.sourceOrderId);
        if(orderInHistory) {
            orderInHistory.splitDetails = JSON.parse(JSON.stringify(appState.currentBill));
        }

        Storage.saveOrderHistory();
        appState.currentBill = null;
        Storage.saveCurrentBill();
    }
};
