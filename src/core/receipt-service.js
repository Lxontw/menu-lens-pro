import { appState } from '../state/app-state.js';
import { RateService } from './rate-service.js';

/**
 * Receipt OCR Service (Gemini API)
 */
export const ReceiptService = {
    async analyzeReceipt(base64Image) {
        if (!appState.settings.apiKey) throw new Error('API_KEY_MISSING');

        const prompt = `
            Analyze this receipt image. Extract the following information into a JSON object:
            {
                "storeName": "Name of the store (Original)",
                "storeNameTranslated": "Name of the store (Traditional Chinese)",
                "date": "YYYY-MM-DD",
                "totalAmount": 1250,
                "currency": "JPY",
                "paymentMethod": "Credit Card/Cash/etc (Optional, omit if not clear)",
                "items": [
                    { 
                        "nameOriginal": "Item Name in original language", 
                        "nameTranslated": "Item Name in Traditional Chinese",
                        "price": 500, 
                        "qty": 1 
                    },
                    ...
                ]
            }
            
            Rules:
            1. Language: Translate store name and all item names to Traditional Chinese (Taiwan style).
            2. If date is not clear, use current date: ${new Date().toISOString().split('T')[0]}.
            3. Extract currency from symbols or text (e.g., ¥ -> JPY, $ -> USD).
            4. Ensure totalAmount and price are numbers.
            5. Return ONLY the raw JSON object. Do not include markdown code blocks.
            6. paymentMethod is optional; do not fabricate it if not present on the receipt.
        `;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${appState.settings.model}:generateContent?key=${appState.settings.apiKey}`;
        
        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                topP: 1,
                topK: 32,
                maxOutputTokens: 2048,
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            throw new Error('辨識失敗：Gemini 未回傳有效內容 (可能是安全封鎖 or 格式錯誤)');
        }
        
        try {
            // Find the first '{' and last '}' to extract potential JSON object
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            
            let result;
            if (start === -1 || end === -1) {
                const cleaned = text.replace(/```json|```/g, '').trim();
                result = JSON.parse(cleaned);
            } else {
                const jsonStr = text.substring(start, end + 1);
                result = JSON.parse(jsonStr);
            }

            // Normalization
            const originalAmount = parseFloat(result.totalAmount) || 0;
            const originalCurrency = result.currency || 'JPY';
            const targetCurrency = appState.settings.currency || 'TWD';

            const normalized = {
                storeName: result.storeName || '未知商店', // Legacy support
                originalStoreName: result.storeName || '未知商店',
                translatedStoreName: result.storeNameTranslated || result.storeName || '未知商店',
                date: result.date || new Date().toISOString().split('T')[0],
                originalAmount: originalAmount,
                convertedAmount: RateService.convert(originalAmount, originalCurrency, targetCurrency),
                originalCurrency: originalCurrency,
                convertedCurrency: targetCurrency,
                totalAmount: originalAmount, // Keep for backward compatibility
                currency: originalCurrency, // Keep for backward compatibility
                items: Array.isArray(result.items) ? result.items.map(item => ({
                    nameOriginal: item.nameOriginal || item.name || '未命名項目',
                    nameTranslated: item.nameTranslated || item.name || '未命名項目',
                    price: parseFloat(item.price) || 0,
                    qty: parseInt(item.qty) || 1
                })) : [],
                rawText: text // Preserve raw OCR text as requested
            };

            if (result.paymentMethod) {
                normalized.paymentMethod = result.paymentMethod;
            }

            // Strict Validation
            if (normalized.originalAmount === 0 && normalized.items.length === 0) {
                throw new Error('辨識無效：收據未包含有效的金額或項目明細。');
            }

            return normalized;
        } catch (e) {
            console.error('Failed to parse receipt JSON:', text);
            throw new Error(e.message || '無法辨識收據內容，請確保圖片清晰。');
        }
    }
};
