# 🤖 AI Agents Guide: PortalScrapper

This document provides context and guidelines for AI coding assistants working on this repository.

## 🏗️ Architecture Overview

Chrome/Edge extension (Manifest V3) with a **Side Panel** UI for passive news article capture from major news portals, featuring direct DB persistence via the API Medialog.

1.  **Content Scripts (`src/content/`)**: 
    - Injected into all supported news portal domains.
    - Detects if current page is a news article.
    - Extracts structured data via 4-layer cascade: JSON-LD → Meta Tags → Site-Specific Selectors → Readability.js.
    - Responds to extraction requests from the Service Worker.
    - Uses `MutationObserver` for dynamic content detection.

2.  **Service Worker (`src/background/`)**: 
    - Central message broker between Content Script, Side Panel, and the Storage/API.
    - Manages `chrome.storage.local` operations.
    - Handles export (JSON/CSV) and badge updates.

3.  **Side Panel (`src/sidepanel/`)**:
    - Persistent UI shown alongside browser content (Chrome Side Panel API).
    - Features a Login Screen that replaces the interface if no active session exists.
    - Editable form with pre-filled extracted data and manual/auto-resolved API fields.
    - Article history, export controls, classification system.
    - Communicates with Service Worker via `chrome.runtime.sendMessage`.

4.  **Extractors (`src/extractors/`)**: 
    - `jsonld.ts` — Parses `<script type="application/ld+json">` for NewsArticle/Article schemas.
    - `meta.ts` — Reads OpenGraph and Twitter Card meta tags.
    - `siteSpecific.ts` — Uses curated CSS selectors per portal.
    - `cascade.ts` — Orchestrates layers and merges results by confidence.

5.  **Storage (`src/storage/`)**: 
    - Wraps `chrome.storage.local` with CRUD operations.
    - Handles offline draft storage, listing, deletion, and export preparation.

6.  **API Client (`src/api/`)**:
    - `client.ts` — Handles HTTP operations for `POST /v1/medialogs/`, `PATCH /v1/medialogs/{id}` (for partial updates), `GET /v1/portales/`, and `POST /v1/relaciones/medialogs`.
    - `auth.ts` — Manages JWT authentication state (token storage and validation).
    - `types.ts` — Types for request and response payloads.

## 🛠️ Key Modules & Responsibilities

- **`src/extractors/cascade.ts`**: Orchestrates the 4-layer extraction cascade.
- **`src/extractors/siteSpecific.ts`**: Contains `SITE_CONFIGS` with CSS selectors for each supported news portal.
- **`src/extractors/snapshot.ts`**: Generates high-end, self-contained clean HTML/PDF snapshots with Base64 embedded assets, print layout sheets, promotional cleaners, and rich Schema/social meta wrappers.
- **`src/storage/store.ts`**: Handles CRUD operations for articles in `chrome.storage.local`.
- **`src/types.ts`**: The source of truth for `NewsArticle`, `SiteConfig`, and `ExtensionMessage` types.
- **`src/sidepanel/sidepanel.ts`**: Main UI logic, form handling, duplicate prevention, session management, clipboard operations.
- **`src/api/client.ts`**: All REST calls to the Medialog API (save medialog, create relations, portal/emisión resolution, duplicate search).
- **`src/api/auth.ts`**: JWT token management and session validation.
- **`src/config/portalClassifications.ts`**: **Important** — Defines which classifications are automatically linked to a medialog based on the portal ID.

## 📋 Coding Guidelines for Agents

### 1. Side Panel ↔ Content Script Communication
- Side Panel and Content Scripts **cannot** communicate directly.
- All messages must go through the Service Worker.
- Use `chrome.runtime.sendMessage` from Side Panel → Service Worker.
- Use `chrome.tabs.sendMessage(tabId, msg)` from Service Worker → Content Script.

### 2. Selector Stability
- Prefer `data-testid`, `aria-label`, or semantic selectors (`article p`, `h1`, `time[datetime]`) over fragile class names.
- JSON-LD and meta tags are the most stable sources. Always try them first.

### 3. Performance & Robustness
- Keep content script logic lean.
- Use timeouts + `Promise.race` on all `chrome.tabs.sendMessage` calls (the panel has frozen multiple times in the past due to unresponsive content scripts).
- Use the `isResolving` guard in `autoResolveEmisora` to prevent concurrent expensive operations.
- Protect every network call with `ensureValidSession()`.

### 4. Data Integrity & API Sync
- Always normalize `fecha` to **Mexico City local time** (`America/Mexico_City`) before saving or using it for searches.
- Always normalize transcription text to preserve paragraph breaks using `\n\n`.
- `abstract` and `url` must **always** contain the clean permalink URL (resolved via canonical tag, og:url, or parameter-stripping). Use `urlWithParams` to keep the raw URL with query parameters.
- After a successful save, automatically create relations if configured in `portalClassifications.ts`.
- Perform two-tier saving: local first (`chrome.storage.local`), then API.

### 5. Duplicate Prevention (Very Important)
- There is a **two-tier** duplicate system:
  1. Local check against `chrome.storage.local` (fast, URL-based).
  2. Remote check against the real Medialog database (by title + date and by URL).
- Use the global flag `(window as any).FORCE_API = true` in the console to bypass the local check during testing.
- When the form already has a `dbRecordId`, the local aggressive check should usually be skipped.

### 6. Automatic Relations
- After successfully saving a medialog, the extension automatically creates relations using `POST /v1/relaciones/medialogs`.
- The mapping is defined in `src/config/portalClassifications.ts`.
- `tipo` is always `"R"`.
- `fecha` must be the normalized Mexico City time of the article.

### 7. Authentication Lifecycle
- JWT is mandatory.
- `getCurrentUser()` must be called before any network operation.
- On 401/403 → logout and return to login screen gracefully.

## 🔄 Common Tasks

### Adding a new news portal
The extension now injects into **all HTTPS sites** (`manifest.json` uses `https://*/*`). This means:
1. **No need to modify `manifest.json`** for new portals — the content script is already injected everywhere.
2. **Test with the generic extractor first** — navigate to an article and trigger extraction. If the generic provides ≥80% quality, you're done.
3. **Only if needed**, add a new entry in `SITE_CONFIGS` in `src/extractors/siteSpecific.ts` with fine-tuned CSS selectors.
4. (Optional) Add automatic classifications in `src/config/portalClassifications.ts`.

### Portal Training Procedure (iterative)
When the generic extractor isn't enough for a specific portal:

1. **Navigate** to a representative article on the target portal.
2. **Inspect the DOM** — check for:
   - Does the site have JSON-LD `<script type="application/ld+json">`? (If yes, Layer 1 handles it)
   - What CSS selectors identify: title (`h1`), author, date (`time[datetime]`), content body?
   - Is there a paywall element?
3. **Open the Side Panel** and trigger Re-extract. Check what the cascade already captures.
4. **If fields are missing**, add the portal to `SITE_CONFIGS` with specific selectors.
5. Build (`npm run build`) and reload the extension.

### The 5-Layer Extraction Cascade
```
JSON-LD (0.95) → Site-Specific (0.85) → Meta Tags (0.75) → Generic (0.50) → Manual (0.0)
```
- **JSON-LD**: Most stable. Check `<script type="application/ld+json">` for `NewsArticle`/`Article` schemas.
- **Site-Specific**: CSS selectors curated per portal. Only applies to registered portals in `SITE_CONFIGS`.
- **Meta Tags**: OpenGraph (`og:title`, `og:description`), Twitter Cards, `article:published_time`.
- **Generic** (`src/extractors/generic.ts`): Text density heuristics, universal selectors (`article`, `main`, `[itemprop="articleBody"]`), automatic noise filtering. Works on **any** news site.
- **Manual**: User fills in the form directly.

The general merge rule is "first non-null value wins" — higher confidence layers take priority for metadata. However, **text content (article body)** uses **Smart Text Merging** in `mergeResults()`:
- Curated `site-specific` content is prioritized over `json-ld` truncated/teaser previews.
- If a lower confidence layer (like `site-specific` or `generic`) finds a text body that is significantly longer (e.g. >1.3x) than the one found by `json-ld` or `meta-tags`, it will overwrite it to capture the complete article.
- Curated `site-specific` text is preserved against being overwritten by noisy slightly longer `generic` extracts unless the new text is significantly longer.

### Adding automatic classifications for a portal
Edit `src/config/portalClassifications.ts`:

```ts
export const PORTAL_CLASSIFICATIONS: Record<number, number[]> = {
  4014: [25609],           // El País
  10725: [25872],          // Financial Times (PressReader)
};
```

### Fixing a broken selector
- Update the relevant entry in `SITE_CONFIGS`.
- Prefer semantic or `data-testid` selectors.
- For SPA sites (like PressReader), use `[class*="pattern"]` wildcards since exact class names may change.
- **Selector Priority (Crucial)**: `querySelectorText` evaluates comma-separated selectors sequentially from left to right. This ensures that more specific selectors (e.g., `.v-textview h1`) are evaluated and matched first, preventing loose fallbacks (e.g., naked `h1`) from matching random pagination elements (like "Prev") that appear earlier in the DOM. Always place more specific selectors first.

### Saving a medialog + creating relations / updates
1. For new articles, clicking "Grabar" calls `grabarMedialog(...)`.
2. When a `dbRecordId` is resolved (through extraction, history loading, or duplicate checks), the "Grabar" button dynamically changes to "Actualizar".
3. Clicking "Actualizar" performs a diff comparison between the current form state and `lastSavedFormState`, sending only the modified fields via `patchMedialog(...)` to `PATCH /v1/medialogs/{id}`.
4. If successful, `crearRelacionMedialog` is run for each classification defined for that portal (only on initial record creation).

## ⚠️ Known Gotchas

- **Side Panel Freezes**: Always use timeouts on `chrome.tabs.sendMessage`. The content script on heavy pages (especially El País) can become unresponsive.
- **Stale Form State**: When a new article is extracted, explicitly clear `dbRecordId` and old data if the URL changed.
- **Date Handling**: The Medialog backend expects `fecha` in **Mexico City local time**, not UTC.
- **Abstract Field**: Must always contain the original URL (used for remote duplicate search).
- **Session Expiry**: Always check `getCurrentUser()` before network calls. On 401, log out cleanly.
- **PressReader is a SPA**: The HTML source is empty — all content is JavaScript-rendered. Our content script runs at `document_idle` and sees the rendered DOM, but `MutationObserver` delays may be needed for dynamic article loading.
- **Generic extractor on non-news sites**: The content script injects on ALL HTTPS sites now. It's passive (only extracts on request), but `detectSite()` will return a generic result for any page with a path. This is by design.
- **Manual-Only Extraction**: Extraction is strictly on-demand (triggered exclusively when the user clicks 'Extraer' in the sidepanel). Automatic extraction on tab navigation or page reload is disabled to avoid unwanted captures.
- **SPA relative assets (e.g. PressReader)**: Relative image references (`images/be-ft-logo.svg`) can resolve improperly or hit SPA shell pages returning HTML. During snapshotting, always access the fully qualified URL from the live element property `.src` and check response content-types (rejecting `text/html`) before attempting Base64 conversion.
- **Duplicate Images in Body**: Portals often repeat the article's hero image inside the first paragraph of the body. Always use URL base matching to locate and remove the duplicate body picture from the parsed content.
- **Exact Printing Color Styles**: Background colors and SVG path fills are stripped by default when printing to PDF. Ensure `print-color-adjust: exact` and `-webkit-print-color-adjust: exact` are enforced on `@media print` body and header elements.
- **HTML Archive Downloads & Print Title**: When generating HTML archives or printing to PDF, the document `<title>` automatically prepends the clean main domain name in uppercase and a hyphen (e.g., `ELPAIS - Sheinbaum...`). The print layout elements have `.action-bar` stripped before saving.
- **Unsaved Changes dialog**: The warning prompt asking about unsaved changes on Re-extraction has been completely disabled to ensure a faster and smoother capture workflow.

## 🗂️ Related Project

This project was inspired by the [xscrapper](https://github.com/Kilo-Org/xscrapper) project (passive X/Twitter scraper). The El País extractor from that project was the original prototype for the site-specific layer here.

---

*Update this file whenever you add significant new behavior (especially anything involving the API, duplicate logic, or configuration).*