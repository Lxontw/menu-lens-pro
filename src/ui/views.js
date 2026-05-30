// src/ui/views.js

import { appState } from '../state/app-state.js';
import { components } from './components.js';

function renderGreeting() {
    const hour = new Date().getHours();
    let greeting = '您好';
    if (hour < 5) {
        greeting = '凌晨好';
    } else if (hour < 12) {
        greeting = '上午好';
    } else if (hour < 18) {
        greeting = '下午好';
    } else {
        greeting = '晚上好';
    }
    return `<h2 class="text-3xl font-bold text-slate-800">${greeting}</h2>`;
}

function renderQuickActions() {
    return `
        <div class="grid grid-cols-2 gap-4">
            <div onclick="EventBus.dispatch('start-scan', { mode: 'menu' })" class="bg-indigo-600 text-white p-6 rounded-3xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform cursor-pointer">
                <i class="fas fa-camera text-2xl mb-3"></i>
                <h3 class="font-bold text-lg">菜單掃描</h3>
                <p class="text-xs opacity-70">拍照翻譯點餐</p>
            </div>
            <div onclick="EventBus.dispatch('start-scan', { mode: 'receipt' })" class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 active:scale-95 transition-transform cursor-pointer">
                <i class="fas fa-receipt text-2xl mb-3 text-indigo-600"></i>
                <h3 class="font-bold text-lg text-slate-800">收據掃描</h3>
                <p class="text-xs text-slate-400">記錄每日開銷</p>
            </div>
        </div>
    `;
}

function renderCurrentState(state) {
    // This will show current order summary or other status
    if (state.order && state.order.length > 0) {
        const totalItems = state.order.reduce((sum, item) => sum + item.qty, 0);
        const totalAmount = state.order.reduce((sum, item) => sum + (item.price * item.qty), 0);
        return `
            <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="font-bold text-slate-800">進行中的訂單</h4>
                    <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">未完成</span>
                </div>
                <p class="text-slate-500 mb-4">您有一筆訂單尚未完成，共 ${totalItems} 個品項。</p>
                <div class="flex justify-between items-center">
                    <span class="text-2xl font-bold text-slate-900">¥${totalAmount.toLocaleString()}</span>
                    <button onclick="EventBus.dispatch('show-order-summary')" class="px-5 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm">查看訂單</button>
                </div>
            </div>
        `;
    }
    return '<!-- No current order -->'; // Return empty if no current state to show
}

function renderRecentUse(state) {
    const history = state.orderHistory || [];
    if (history.length === 0) {
        return `
            <div class="bg-white rounded-2xl p-6 text-center text-slate-400 border border-slate-100 shadow-sm">
                <i class="fas fa-history text-3xl mb-4 opacity-20"></i>
                <p class="text-sm font-bold">尚無歷史紀錄</p>
                <p class="text-xs mt-1">完成第一筆訂單後將會顯示於此</p>
            </div>
        `;
    }

    return `
        <div class="space-y-3">
            ${history.slice(0, 3).map(order => `
                    <div class="bg-white rounded-2xl p-4 flex justify-between items-center shadow-sm border border-slate-100 active:scale-95 transition-transform cursor-pointer" onclick="EventBus.dispatch('view-history-item', { id: '${order.id}' })">
                        <div>
                            <p class="font-bold text-slate-800">${order.storeName || `訂單 #${order.id.slice(-6)}`}</p>
                            <p class="text-xs text-slate-400">${new Date(order.timestamp).toLocaleDateString()}</p>
                        </div>
                        <div class="text-right">
                             <p class="font-bold text-slate-800">¥${order.totalAmount.toLocaleString()}</p>
                             <p class="text-xs text-slate-400">${order.items.length} 品項</p>
                        </div>
                    </div>
                `).join('')}
             ${history.length > 3 ? `<button onclick="UIBridge.switchView('history')" class="w-full text-center text-sm font-bold text-indigo-600 py-3 hover:bg-indigo-50 rounded-xl">查看全部歷史紀錄</button>` : ''}
        </div>
    `;
}

export const views = {
    renderHomepage(state) {
        return `
            <div class="space-y-8">
                <div>
                    ${renderGreeting()}
                </div>
                
                <div>
                    <h3 class="font-bold text-lg text-slate-800 mb-4">快速操作</h3>
                    ${renderQuickActions()}
                </div>

                <div id="homepage-current-state">
                    ${renderCurrentState(state)}
                </div>

                <div>
                    <h3 class="font-bold text-lg text-slate-800 mb-4">最近使用</h3>
                    <div id="homepage-recent-use">
                       ${renderRecentUse(state)}
                    </div>
                </div>
            </div>
        `;
    },

    renderHistoryDetailView(order) {
        if (!order) {
            return `
                <div class="p-6 text-center">
                    <p class="text-slate-500">找不到指定的歷史紀錄。</p>
                    <button onclick="EventBus.dispatch('navigate-home')" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">返回首頁</button>
                </div>
            `;
        }

        const itemsHtml = order.items.map(item => `
            <li class="flex justify-between items-center py-3 border-b border-slate-100">
                <div class="flex-1 min-w-0 pr-4">
                    <p class="font-bold text-slate-800 truncate">${UIBridge.escapeHTML(item.nameTranslated || item.name)}</p>
                    <p class="text-xs text-slate-400 truncate">${UIBridge.escapeHTML(item.nameOriginal || '')}</p>
                </div>
                <div class="text-right flex-shrink-0">
                    <p class="font-bold text-slate-800">¥${(item.price * item.qty).toLocaleString()}</p>
                    <p class="text-[10px] text-slate-400 font-bold">${item.qty} x ¥${item.price.toLocaleString()}</p>
                </div>
            </li>
        `).join('');

        return `
            <div class="flex flex-col h-full">
                <header class="p-4 flex items-center gap-4 border-b border-slate-100">
                    <button onclick="EventBus.dispatch('navigate-back')" class="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h3 class="text-lg font-bold">${order.storeName || `訂單 #${order.id.slice(-6)}`}</h3>
                        <p class="text-xs text-slate-500">${new Date(order.timestamp).toLocaleString()}</p>
                    </div>
                </header>

                <main class="flex-1 overflow-y-auto p-6">
                    <div class="space-y-6">
                        <div>
                            <h4 class="font-bold text-slate-800 mb-2">訂單總計</h4>
                            <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex justify-between items-center">
                                <span class="text-slate-500">總金額</span>
                                <span class="text-2xl font-bold text-slate-900">¥${order.totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                        
                        <div>
                            <h4 class="font-bold text-slate-800 mb-2">品項列表 (${order.items.length})</h4>
                            <ul class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                                ${itemsHtml}
                            </ul>
                        </div>
                        
                        ${order.splitDetails ? `
                        <div>
                            <h4 class="font-bold text-slate-800 mb-2">分帳結果</h4>
                            <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2">
                                <div class="flex justify-between items-center text-sm">
                                    <span class="text-slate-500">分帳總額</span>
                                    <span class="font-bold text-slate-900">¥${(order.splitDetails.totalAmount || 0).toLocaleString()}</span>
                                </div>
                                ${(order.splitDetails.participants || []).map(p => `
                                    <div class="flex justify-between items-center text-sm py-2 border-t border-slate-100 first:border-t-0">
                                        <span class="text-slate-700">${p.name}</span>
                                        <span class="font-bold text-indigo-600">¥${(p.amount || 0).toLocaleString()}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                    </div>
                </main>

                <footer class="p-4 border-t border-slate-100 safe-bottom">
                    <button onclick="EventBus.dispatch('reuse-order', { id: '${order.id}' })" class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100">
                        <i class="fas fa-redo-alt mr-2"></i>
                        再次使用這張訂單
                    </button>
                </footer>
            </div>
        `;
    },

    renderSettings(settings) {
        return `
            <div class="p-6 flex flex-col h-full">
                <div class="flex justify-between items-center mb-8">
                    <h3 class="text-xl font-bold">偏好設定</h3>
                    <button id="close-settings-btn" class="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="space-y-6 flex-1 overflow-y-auto">
                    <!-- Onboarding Tip -->
                    <div id="api-onboarding-tip" class="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-3 ${settings.apiKey ? 'hidden' : ''}">
                        <i class="fas fa-magic text-indigo-600 mt-1"></i>
                        <div class="text-xs text-indigo-900 leading-relaxed">
                            <span class="font-bold">最後一小步！</span><br>
                            貼上您的 Gemini API 金鑰即可開始辨識。這讓您能享有完全私密且免費的 AI 翻譯服務。
                        </div>
                    </div>

                    <!-- API 金鑰 -->
                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <label for="api-key-input" class="block text-sm font-medium text-slate-700">Gemini API 金鑰</label>
                            <button id="help-api-btn-trigger" class="text-[10px] text-indigo-600 hover:underline font-medium">如何取得？</button>
                        </div>
                        <input type="password" id="api-key-input" placeholder="輸入您的 API 金鑰..." value="${settings.apiKey}"
                               class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all">
                        <p class="text-[10px] text-slate-400 italic">金鑰將僅儲存在您的本地瀏覽器中。</p>
                    </div>

                    <!-- 模型選擇 -->
                    <div class="space-y-2">
                        <label for="model-select" class="block text-sm font-medium text-slate-700">AI 模型版本</label>
                        <select id="model-select" class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="gemini-2.5-flash" ${settings.model === 'gemini-2.5-flash' ? 'selected' : ''}>Gemini 2.5 Flash (推薦)</option>
                            <option value="gemini-2.5-flash-lite" ${settings.model === 'gemini-2.5-flash-lite' ? 'selected' : ''}>Gemini 2.5 Flash-Lite</option>
                            <option value="gemini-2.5-pro" ${settings.model === 'gemini-2.5-pro' ? 'selected' : ''}>Gemini 2.5 Pro</option>
                        </select>
                    </div>

                    <!-- 貨幣設定 -->
                    <div class="space-y-2">
                        <label for="currency-select" class="block text-sm font-medium text-slate-700">目標貨幣</label>
                        <select id="currency-select" class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="TWD" ${settings.currency === 'TWD' ? 'selected' : ''}>新台幣 (TWD)</option>
                            <option value="HKD" ${settings.currency === 'HKD' ? 'selected' : ''}>港幣 (HKD)</option>
                            <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>美金 (USD)</option>
                        </select>
                    </div>

                    <!-- 自訂匯率 -->
                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <label id="rate-label" for="rate-input" class="block text-sm font-medium text-slate-700">自訂匯率 (1 JPY = ? ${settings.currency})</label>
                            <button id="fetch-rate-btn" class="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors font-bold">
                                <i class="fas fa-sync-alt mr-1"></i>自動獲取
                            </button>
                        </div>
                        <input type="number" id="rate-input" step="0.0001" placeholder="請輸入匯率..." value="${settings.customRate || ''}"
                               class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all">
                        <p class="text-[10px] text-slate-400 italic">您可點擊「自動獲取」抓取最新匯率，或自行手動微調。若為 0 將不進行換算。</p>
                    </div>

                    <!-- 飲食偏好 -->
                    <div class="space-y-2">
                        <label for="pref-custom" class="block text-sm font-medium text-slate-700">飲食提醒 / 過敏原 (自定義)</label>
                        <textarea id="pref-custom" rows="3" placeholder="例如：對花生嚴重過敏、不吃香菜、純素食..." 
                                  class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm">${settings.prefCustom}</textarea>
                        <p class="text-[10px] text-slate-400 italic">AI 將根據此處的描述，在翻譯結果中為您標註重點。</p>
                    </div>

                    <!-- 資料管理 -->
                    <div class="pt-4 border-t border-slate-100 space-y-3">
                        <button id="export-data-btn" class="w-full py-3 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-100 transition-colors">
                            <i class="fas fa-file-export mr-2"></i>匯出備份資料 (JSON)
                        </button>
                        <button id="import-data-btn" class="w-full py-3 bg-white text-slate-600 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-50 transition-colors">
                            <i class="fas fa-file-import mr-2"></i>匯入備份資料 (JSON)
                        </button>
                        <button id="share-data-btn" class="w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors">
                            <i class="fas fa-share-alt mr-2"></i>分享備份連結 / 複製摘要
                        </button>
                        <input id="import-data-input" type="file" accept="application/json" class="hidden" />
                    </div>
                </div>

                <div class="mt-8 pt-6 border-t border-slate-100 safe-bottom">
                    <button id="save-settings-btn" class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100">
                        儲存並返回
                    </button>
                </div>
            </div>
        `;
    }
};
