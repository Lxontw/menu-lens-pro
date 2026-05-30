import { appState } from '../state/app-state.js';

/**
 * Menu Recognition Service (Gemini API)
 */
export const MenuService = {
    async analyzeMenu(base64Image) {
        if (!appState.settings.apiKey) throw new Error('API_KEY_MISSING');

        const prompt = `
            You are a menu translation assistant. Analyze the provided image of a menu (likely in Japanese).
            Return a JSON array of objects, each representing a menu item:
            {
                "nameOriginal": "Japanese Name",
                "nameTranslated": "Traditional Chinese Name",
                "price": 1200,
                "description": "Brief description in Traditional Chinese",
                "dietary_tags": ["Vegan", "Spicy", etc.],
                "allergen_warning": "Warning if any common allergens match: ${appState.settings.prefCustom}"
            }
            
            Rules:
            1. Language: Translate everything to Traditional Chinese (Taiwan style).
            2. Price: Must be a pure number (no currency symbols).
            3. Deduplication: If multiple identical items appear, return only one.
            4. User Preferences: Pay special attention to: ${appState.settings.prefCustom}.
            5. Output format: Return ONLY the raw JSON array. No markdown code blocks.
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
            throw new Error('辨識失敗：Gemini 未回傳有效內容 (可能是安全封鎖或格式錯誤)');
        }
        
        // Resilient JSON extraction
        try {
            // Find the first '[' and last ']' to extract potential JSON array
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');
            
            if (start === -1 || end === -1) {
                // Fallback: try removing markdown blocks
                const cleaned = text.replace(/```json|```/g, '').trim();
                return JSON.parse(cleaned);
            }
            
            const jsonStr = text.substring(start, end + 1);
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse menu JSON:', text);
            throw new Error('無法解析菜單資料，請重試或更換圖片。');
        }
    }
};
