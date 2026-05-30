# MenuLens Pro Modularization Then Receipt OCR Design

## Goal

Refactor MenuLens Pro from a single large `logic.js` file into a small ES Modules architecture that remains deployable as a pure static mobile web app, then add receipt OCR and account-book recording on top of that structure.

The app must keep working well on mobile browsers. The expected production path is GitHub Pages or another HTTPS static host, because camera access is more reliable on HTTPS than when opening `index.html` through `file://`.

## Current State

- `index.html` is the main app shell and loads `logic.js`.
- `logic.js` contains global state, finance logic, life tools logic, UI rendering, Gemini API calls, camera helpers, and event binding in one file.
- The code has conceptual layers: `appState`, `CoreLogic`, `UIBridge`, `DeviceUtils`, and `EventBus`.
- `index.html` currently has duplicated trailing markup after `</html>`.
- `logic.js` references `finance-view` and `life-tools-view`, but the current main `index.html` does not define those sections.
- `index-beta.html` contains more complete finance and life tools markup, but it is not the main entry and includes inline behavior.

## Architecture

Use ES Modules without introducing a build step.

`index.html` will load:

```html
<script type="module" src="./src/main.js"></script>
```

Proposed module layout:

```text
src/
  main.js
  state/app-state.js
  storage/local-storage.js
  core/menu-service.js
  core/rate-service.js
  core/finance-service.js
  core/life-tools-service.js
  core/receipt-service.js
  device/camera.js
  ui/ui-bridge.js
  events/event-bus.js
```

Responsibilities:

- `main.js`: startup sequence, initial render, event bus initialization.
- `state/app-state.js`: single app state object and state initialization from localStorage.
- `storage/local-storage.js`: localStorage key names, JSON read/write helpers, fallback handling.
- `core/menu-service.js`: Gemini menu analysis and menu result normalization.
- `core/rate-service.js`: exchange-rate lookup, fallback rates, currency formatting helpers where appropriate.
- `core/finance-service.js`: account creation, account persistence, transaction insertion, account deletion.
- `core/life-tools-service.js`: memo encoding/decoding, unit conversion, life tools data.
- `core/receipt-service.js`: Gemini receipt OCR, receipt JSON parsing, receipt normalization.
- `device/camera.js`: camera startup, shutdown, frame capture, file-to-base64 conversion.
- `ui/ui-bridge.js`: DOM rendering and view switching only.
- `events/event-bus.js`: event handlers and orchestration between UI, state, services, and device helpers.

## Data Flow

Menu scan flow:

1. User opens scanner or uploads an image.
2. `event-bus.js` gets base64 image data from `camera.js`.
3. `menu-service.js` calls Gemini and returns normalized menu items.
4. `event-bus.js` updates `appState.results` and persists menu cache.
5. `ui-bridge.js` renders results and order UI.

Receipt scan flow:

1. User chooses receipt mode or opens receipt scan from the finance view.
2. `event-bus.js` gets base64 image data from `camera.js`.
3. `receipt-service.js` calls Gemini OCR and returns normalized receipt data.
4. `ui-bridge.js` renders a receipt result view.
5. User saves the receipt to an account.
6. `finance-service.js` converts receipt items into account transactions and persists them.
7. `ui-bridge.js` re-renders account summaries.

## UI Scope

The first refactor should preserve the existing UI as much as possible.

Required cleanup during modularization:

- Remove duplicated trailing HTML after the first `</html>`.
- Add `finance-view` and `life-tools-view` containers to the main `index.html`, based on the existing `index-beta.html` structure but adapted to current Font Awesome styling.
- Keep the current bottom navigation and existing IDs so behavior remains compatible.

Receipt OCR UI added after modularization:

- Add a scan mode entry from the finance view.
- Add `receipt-result-view` for store name, date, total, currency, line items, and save/cancel controls.
- Add a save flow that stores receipt data into a selected account.

## Error Handling

- Missing Gemini API key should show the existing settings prompt behavior.
- Gemini response parsing should tolerate fenced JSON and surrounding text.
- Invalid OCR result should show a clear UI notification and keep the user on the scan/result flow.
- localStorage parse errors should fall back to defaults instead of crashing startup.
- Camera failures should continue using the existing notification pattern and allow image upload as fallback.

## Mobile Deployment

The app remains a static site:

- No Node runtime required in production.
- No bundler required.
- Deployable to GitHub Pages.
- Camera use should be tested on HTTPS, not only `file://`.

For local testing, use a simple static server from the project root and open the served URL on a phone if the device can reach the host machine.

## Testing And Verification

Because the project currently has no package or test runner, the first verification layer is manual/browser-based:

- Open the static app through a local server.
- Confirm startup does not throw console errors.
- Confirm settings drawer opens and saves.
- Confirm upload flow still calls menu analysis when an API key is present.
- Confirm results, order list, favorites, generated order menu, finance tab, and life tools tab render.
- Confirm localStorage-backed data survives reload.

After the module split stabilizes, add a lightweight test setup only if needed for receipt parsing and storage behavior. Receipt OCR logic should be written so JSON normalization can be tested without calling Gemini.

## Implementation Order

1. Clean `index.html` structure and restore missing finance/life views.
2. Create `src/` module folders and move state/storage helpers first.
3. Move pure services: rate, finance, life tools, menu.
4. Move camera helpers.
5. Move UI bridge.
6. Move event bus and wire imports through `main.js`.
7. Verify existing behavior before adding receipt OCR.
8. Add receipt service and receipt result state.
9. Add receipt result view and save-to-account flow.
10. Verify receipt flow with mocked or sample Gemini responses before real API testing.

## Non-Goals

- Do not introduce Vite, npm, or a build pipeline in this phase.
- Do not redesign the app visually.
- Do not migrate to a framework.
- Do not change localStorage key names unless a migration is explicitly added.
- Do not rewrite unrelated archive files.
