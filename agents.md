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
    - `client.ts` — Handles HTTP operations for `POST /v1/medialogs/`, `GET /v1/portales/`, and `POST /v1/relaciones/medialogs`.
    - `auth.ts` — Manages JWT authentication state (token storage and validation).
    - `types.ts` — Types for request and response payloads.

## 🛠️ Key Modules & Responsibilities

- **`src/extractors/cascade.ts`**: Orchestrates the 4-layer extraction cascade.
- **`src/extractors/siteSpecific.ts`**: Contains `SITE_CONFIGS` with CSS selectors for each supported news portal.
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
- `abstract` must **always** contain the original article URL.
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
1. Add the domain to `host_permissions` and `content_scripts.matches` in `manifest.json`.
2. Add a new entry in `SITE_CONFIGS` in `src/extractors/siteSpecific.ts`.
3. (Optional) Add automatic classifications in `src/config/portalClassifications.ts`.

### Adding automatic classifications for a portal
Edit `src/config/portalClassifications.ts`:

```ts
export const PORTAL_CLASSIFICATIONS: Record<number, number[]> = {
  4014: [25609],           // El País
  1250: [3001, 3002],      // Another portal
};
```

### Fixing a broken selector
- Update the relevant entry in `SITE_CONFIGS`.
- Prefer semantic or `data-testid` selectors.

### Saving a medialog + creating relations
1. Call `grabarMedialog(...)`.
2. If successful, the code automatically calls `crearRelacionMedialog` for each classification defined for that portal.

## ⚠️ Known Gotchas

- **Side Panel Freezes**: Always use timeouts on `chrome.tabs.sendMessage`. The content script on heavy pages (especially El País) can become unresponsive.
- **Stale Form State**: When a new article is extracted, explicitly clear `dbRecordId` and old data if the URL changed.
- **Date Handling**: The Medialog backend expects `fecha` in **Mexico City local time**, not UTC.
- **Abstract Field**: Must always contain the original URL (used for remote duplicate search).
- **Session Expiry**: Always check `getCurrentUser()` before network calls. On 401, log out cleanly.

## 🗂️ Related Project

This project was inspired by the [xscrapper](https://github.com/Kilo-Org/xscrapper) project (passive X/Twitter scraper). The El País extractor from that project was the original prototype for the site-specific layer here.

---

*Update this file whenever you add significant new behavior (especially anything involving the API, duplicate logic, or configuration).*