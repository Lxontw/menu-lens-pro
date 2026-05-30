# 免費匯率查詢 API 服務整理

## 1. Frankfurter（最推薦 — 無需 API Key）

| 項目 | 內容 |
|------|------|
| **網址** | [frankfurter.dev](https://frankfurter.dev) |
| **API Key** | 不需要 |
| **免費額度** | 無日/月限制（僅有速率限制防止濫用） |
| **支援貨幣** | 200 種 |
| **API 端點** | `https://api.frankfurter.dev/v2/` |
| **特點** | 開源、資料來源為歐洲央行（ECB），可自行部署 |

### 使用範例

```bash
# 取得 USD 對所有貨幣的匯率
curl https://api.frankfurter.dev/v2/latest?base=USD

# 取得 USD 對 CNY、JPY、EUR 的匯率
curl https://api.frankfurter.dev/v2/latest?base=USD&symbols=CNY,JPY,EUR

# 查詢歷史匯率（指定日期）
curl https://api.frankfurter.dev/v2/2024-01-01?base=USD&symbols=TWD
```

---

## 2. ExchangeRate-API

| 項目 | 內容 |
|------|------|
| **網址** | [exchangerate-api.com](https://www.exchangerate-api.com) |
| **API Key** | 需要（免費註冊） |
| **免費額度** | 1,500 次/月 |
| **支援貨幣** | 161 種 |
| **更新頻率** | 每日更新一次 |
| **特點** | 有歷史資料、高可用基礎設施、無需信用卡 |

---

## 3. exchangerate.host

| 項目 | 內容 |
|------|------|
| **網址** | [exchangerate.host](https://exchangerate.host) |
| **API Key** | 需要（免費註冊） |
| **免費額度** | 100 次/月 |
| **支援貨幣** | 全球主要貨幣 + 加密貨幣 |
| **特點** | APILayer 旗下服務，資料涵蓋範圍較廣 |

---

## 方案對比總覽

| 服務 | API Key | 免費額度 | 貨幣數 | 歷史資料 |
|------|---------|----------|--------|----------|
| Frankfurter | 不需要 | 無限制 | 200 | 有 |
| ExchangeRate-API | 需要 | 1,500/月 | 161 | 有 |
| exchangerate.host | 需要 | 100/月 | 多種+加密 | 有 |

## 建議

- **小專案 / 偶爾查詢**：直接用 Frankfurter，免註冊、免 API Key，最簡單
- **中等用量**：ExchangeRate-API，每月 1,500 次足夠大部分場景
- **需加密貨幣匯率**：exchangerate.host 或 Frankfurter（支援部分加密貨幣）