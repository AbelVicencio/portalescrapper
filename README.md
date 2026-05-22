# PortalScrapper

**PortalScrapper** is a Chrome/Edge (Manifest V3) Side Panel extension designed for passive, high-quality capture of news articles from major news portals, with **direct persistence** into the Medialog database.

The extension automatically extracts structured data, resolves portal/emisora/emisión information, allows manual editing, and saves the record to the API — all while trying to stay as silent and non-intrusive as possible.

## ✨ Key Features

- **Passive & Automatic Extraction**
  - 4-layer extraction cascade (JSON-LD → Meta Tags → Site-Specific Selectors → Readability.js)
  - Works on 9 major news domains (El País, Reforma, Milenio, WSJ, NYT, etc.)
  - Uses `MutationObserver` for dynamic pages

- **Smart Portal Resolution**
  - Automatically resolves `emisora`, `portal`, `nombre_portal` and `pais` from the article URL using `/v1/portales`
  - Prioritizes exact domain matches
  - Also resolves `emisión` based on date + emisora

- **Strong Duplicate Prevention**
  - Local check against `chrome.storage.local` (URL-based)
  - Remote check against the real Medialog database (by title + date and by URL)
  - `FORCE_API` debug flag for testing the remote path

- **Automatic Classifications (Relations)**
  - After successfully saving a medialog, the extension can automatically create relations (`/v1/relaciones/medialogs`)
  - Fully configurable per portal in `src/config/portalClassifications.ts`
  - Example: Portal 4014 (El País) → automatically links classification 25609

- **Data Quality & Normalization**
  - All dates are normalized to **Mexico City local time** (America/Mexico_City)
  - Transcription text is normalized with proper paragraph separation (`\n\n`)
  - `abstract` field always contains the original article URL

- **Excellent User Experience**
  - Very wide side panel by default (~920px, ~48% of FHD screen)
  - Main action buttons placed at the top for quick access
  - Toast messages appear at the top
  - New Medialog ID is automatically copied to clipboard after saving
  - Robust protection against panel freezing and expired sessions

- **Developer Friendly**
  - `FORCE_API = true` flag to bypass local duplicate check
  - Full logging of resolution and saving process
  - Clean, well-documented configuration

## 🏗️ Architecture

- **Manifest V3** Side Panel extension
- **Content Script** with 4-layer extraction cascade
- **Service Worker** as message broker
- **Side Panel** as the main UI (form + history + controls)
- Direct REST communication with the **Medialog API**

## 🛠️ Tech Stack

- **TypeScript** + **esbuild** (no bundlers like Webpack/Vite)
- Chrome Extension APIs (Side Panel, `chrome.storage.local`, messaging)
- Pure CSS (no frameworks)
- Direct `fetch` calls to the Medialog API (JWT Bearer)

## 📁 Important Files

| File | Purpose |
|------|---------|
| `src/config/portalClassifications.ts` | Defines which classifications are automatically linked per portal |
| `src/sidepanel/sidepanel.ts` | Main UI logic, duplicate checks, session handling |
| `src/api/client.ts` | All API calls (`grabarMedialog`, `crearRelacionMedialog`, searches, etc.) |
| `src/extractors/siteSpecific.ts` | CSS selectors per news portal |
| `src/utils/export.ts` | CSV and JSON export (with normalized data) |

## 🔧 Configuration

The most important configuration file is:

```ts
src/config/portalClassifications.ts
```

Example:

```ts
export const PORTAL_CLASSIFICATIONS: Record<number, number[]> = {
  4014: [25609],           // El País
  1250: [3001, 3002],      // Another portal with multiple classifications
};
```

After saving a medialog, the extension will automatically create a relation for each classification listed for that portal.

## 🛡️ Recommendations for Future Development

### Be as silent as possible (recommended philosophy)

The original spirit of this extension is to be **passive and non-intrusive**. Some recommendations:

- **Avoid showing toasts** for every successful background operation (only show on explicit user action or real errors).
- **Do not poll** or constantly hit the API in the background.
- Keep the number of automatic actions reasonable (one relation per classification is good; avoid creating dozens of relations automatically).
- When in doubt, prefer **local checks first** and only hit the network when necessary.
- The `FORCE_API` flag already exists as an escape hatch for power users/debugging.

Maintaining this "silent by default" approach will make the extension much more pleasant to use in a real newsroom environment.

## 🚀 Development

```bash
npm install
npm run build          # Builds everything
npm run typecheck      # Type checking
```

After building, reload the extension in `chrome://extensions`.

## 📜 License

MIT

---

*Maintained with care. The goal is a stable, silent, and high-quality tool for real journalistic work.*