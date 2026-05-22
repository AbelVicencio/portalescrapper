# 📰 PortalScrapper — Especificación del Proyecto

## Descripción General

**PortalScrapper** es una extensión de navegador (Chrome/Edge — Manifest V3) que muestra un **Side Panel persistente** al lado del navegador con un formulario de captura de noticias. Al navegar a un portal de noticias, la extensión detecta y extrae automáticamente datos estructurados del artículo visible en el DOM y pre-llena el formulario. 

El usuario inicia sesión con sus credenciales de la **API Medialog** en una pantalla de login dedicada que bloquea el formulario hasta que se autentique exitosamente. Al presionar **[💾 Grabar API]**, la extensión guarda el registro en el almacenamiento local `chrome.storage.local` (como draft/historial, permitiendo exportación a JSON y CSV) y lo **persiste directamente en la base de datos** a través de la API Medialog en la nube (`POST /v1/medialogs/`). Además, el sistema **auto-resuelve el ID de la emisora** llamando a la API de portales (`GET /v1/portales/?dominio=...`) utilizando el dominio de la noticia procesada.

## Stack Tecnológico

- **Lenguaje**: TypeScript (strict mode)
- **Bundler**: esbuild (IIFE, ES2022, sourcemaps)
- **UI**: HTML + CSS vanilla (Side Panel) con soporte para Pantalla de Login y Formulario de Captura Completo
- **Runtime**: Chrome Extension Manifest V3
- **Storage**: `chrome.storage.local` (offline first & local cache)
- **Persistencia y Autenticación**: API Medialog v2.2.0 (`POST /v1/medialogs/` con Bearer JWT token obtenido vía `POST /auth/token`)
- **Auto-Resolución**: API Medialog Portales (`GET /v1/portales/?dominio=...`)

## Arquitectura

```
┌───────────────────────────────────────────────────────────┐
│                     manifest.json                          │
│   permissions: sidePanel, storage, activeTab, tabs         │
│   side_panel: { default_path: "sidepanel.html" }           │
│   content_scripts: [matches: portales de noticias]         │
└───────┬──────────────────┬──────────────────┬─────────────┘
        │                  │                  │
  ┌─────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
  │  Content    │    │   Service   │    │  Side Panel │
  │  Script     │    │   Worker    │    │  (UI)       │
  │             │    │             │    │             │
  │ • Detecta   │    │ • Router    │    │ • Login     │
  │   portal    │    │   mensajes  │    │ • Formulario│
  │ • Extrae    │    │ • Storage   │    │ • Auto-     │
  │   JSON-LD   │    │   manager   │    │   resolución│
  │ • Extrae    │    │ • Export    │    │ • Lista de  │
  │   DOM       │    │ • Badge     │    │   artículos │
  │ • Detecta   │    │             │    │ • Copiar    │
  │   paywall   │    │             │    │ • Grabar API│
  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                  ┌─────────▼─────────┐      HTTPS /v1/medialogs/
                  │ chrome.storage    │◄─────────────────────────────► API Medialog
                  │  .local           │ (JWT Auth, Auto-Emisora)        (Producción)
                  └───────────────────┘
```

### Flujo de Comunicación

```
Side Panel ──[EXTRACT_NOW]──► Service Worker ──[chrome.tabs.sendMessage]──► Content Script
Content Script ──[ARTICLE_DATA]──► Service Worker ──[port/sendMessage]──► Side Panel
Side Panel ──[GRABAR_ARTICLE]──► Service Worker ──► chrome.storage.local & API Medialog
```

**Nota**: El Side Panel y los Content Scripts NO pueden comunicarse directamente. El Service Worker actúa como broker central de mensajes. Para llamadas a la API de Medialog (Autenticación, Auto-resolución de Emisora y Grabar Nota), el Side Panel puede realizar las llamadas HTTP directamente o canalizarlas a través del Service Worker para evitar interrupciones de ciclo de vida.

## Portales de Noticias Soportados (Fase 1)

| Portal | Host Patterns | Idioma |
|---|---|---|
| Wall Street Journal | `wsj.com` | EN |
| New York Times | `nytimes.com` | EN |
| Reuters | `reuters.com` | EN |
| Financial Times | `ft.com` | EN |
| PressReader (FT y otros) | `pressreader.com`, `*.pressreader.com` | Multi |
| Washington Post | `washingtonpost.com` | EN |
| El País | `elpais.com` | ES |
| Reforma | `reforma.com`, `*.reforma.com` | ES |
| Milenio | `milenio.com` | ES |

### Host Permissions del Manifest

```json
"host_permissions": [
  "https://*.wsj.com/*",
  "https://*.nytimes.com/*",
  "https://*.reuters.com/*",
  "https://*.ft.com/*",
  "https://*.pressreader.com/*",
  "https://*.washingtonpost.com/*",
  "https://*.elpais.com/*",
  "https://*.reforma.com/*",
  "https://*.milenio.com/*"
]
```

### Content Script Matches

Los content scripts deben inyectarse en todas las URLs de estos dominios usando los mismos patterns de `host_permissions`.

## Estrategia de Extracción (Cascada de 4 capas)

El content script intenta cada capa en orden de confiabilidad:

### Capa 1: JSON-LD (confidence: 0.95)
La mayoría de los portales serios incluyen `<script type="application/ld+json">` con esquema `NewsArticle` o `Article`. Es la fuente más confiable y estructurada.

```typescript
// Buscar en todos los scripts JSON-LD
const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
// Buscar @type: "NewsArticle", "Article", "ReportageNewsArticle"
// Extraer: headline, author, datePublished, articleBody, image, publisher, etc.
```

### Capa 2: Meta Tags OpenGraph / Twitter Cards (confidence: 0.80)
Complementa o reemplaza JSON-LD cuando no está disponible.

```typescript
document.querySelector('meta[property="og:title"]')?.content
document.querySelector('meta[name="author"]')?.content
document.querySelector('meta[property="article:published_time"]')?.content
document.querySelector('meta[property="og:image"]')?.content
document.querySelector('meta[property="og:url"]')?.content
document.querySelector('meta[property="article:section"]')?.content
document.querySelector('meta[property="article:tag"]')?.content
```

### Capa 3: Selectores específicos por sitio (confidence: 0.85)
Para cada portal, selectores curados basados en `data-testid`, atributos de accesibilidad, o selectores estables.

```typescript
const SITE_CONFIGS: Record<string, SiteConfig> = {
  'wsj.com': {
    title: 'h1.wsj-article-headline, h1[class*="StyledHeadline"]',
    author: '.author-name, [class*="AuthorName"]',
    date: 'time[datetime]',
    content: '.article-content p, [class*="ArticleBody"] p',
    paywall: '.wsj-snippet-login, #cx-snippet-overlay'
  },
  'nytimes.com': {
    title: 'h1[data-testid="headline"]',
    author: '[class*="byline"] a, span[class*="last-byline"]',
    date: 'time[datetime]',
    content: 'section[name="articleBody"] p',
    paywall: '#gateway-content, [data-testid="inline-message"]'
  },
  'reuters.com': {
    title: 'h1[data-testid="Heading"]',
    author: '[data-testid="AuthorName"], a[href*="/authors/"]',
    date: 'time[datetime]',
    content: '[data-testid*="paragraph"], .article-body__content p',
    paywall: '.paywall-container'
  },
  'ft.com': {
    title: '.article-headline, .topper__headline',
    author: '.article__author-name, .topper__standfirst',
    date: 'time[datetime], .article-info__timestamp',
    content: '.article__content-body p, .body-content p',
    paywall: '.barrier, .o-barrier'
  },
  'washingtonpost.com': {
    title: 'h1[data-qa="headline"]',
    author: '.author-name a, [data-qa="author-name"]',
    date: 'time[datetime], [data-qa="display-date"]',
    content: '.article-body p, [data-qa="article-body"] p',
    paywall: '.paywall-overlay, #paywall-offer'
  },
  'elpais.com': {
    title: 'h1.a_t',
    author: '.a_md_a_n',
    date: 'time[datetime]',
    content: 'article p, .a_c p',
    paywall: '.a_tp, #ctn_freemium_article, .mura-wall'
  },
  'reforma.com': {
    title: 'h1.article-title, #MainContent h1',
    author: '.author, .article-author',
    date: 'time[datetime], .date',
    content: '.article-body p, #article-body p',
    paywall: '.paywall, .subscription-wall'
  },
  'milenio.com': {
    title: 'h1.content-title, h1.title',
    author: '.author-name, .content-author',
    date: 'time[datetime]',
    content: '.content-body p, .article-body p',
    paywall: '.paywall, .subscription-overlay'
  },
  'pressreader.com': {
    title: '.article-title h1, .article-headline',
    author: '.article-author, .byline',
    date: '.article-date, time[datetime]',
    content: '.article-body p, .article-text p',
    paywall: '' // PressReader no suele tener paywall si estás logueado
  }
};
```

> **NOTA**: Estos selectores son aproximaciones iniciales. Se deben validar contra el DOM real de cada portal y actualizar conforme los sitios cambien. Preferir siempre `data-testid`, `aria-label`, y atributos semánticos sobre clases CSS ofuscadas.

### Capa 4: Readability.js (confidence: 0.60)
Fallback universal para sitios no mapeados. Usa la librería de Mozilla (la misma de Firefox Reader Mode).

```typescript
import { Readability } from '@mozilla/readability';
const doc = document.cloneNode(true) as Document;
const article = new Readability(doc).parse();
// article.title, article.byline, article.textContent, article.content
```

### Merge Final
El content script combina resultados de todas las capas disponibles en orden de prioridad:
1. Campos de JSON-LD (más confiable)
2. Campos de selectores específicos del sitio (complementan)
3. Campos de meta tags OG (complementan)
4. Readability como último fallback

Cada campo incluye un indicador de `extractionMethod` para que el usuario sepa de dónde vino.

## Modelo de Datos

```typescript
// ══════════════════════════════════════════
// MODELO PRINCIPAL (HÍBRIDO API MEDIALOG & LOCAL)
// ══════════════════════════════════════════

interface NewsArticle {
  // ── Identificación ──
  id: string;                         // UUID v4 generado al guardar
  source: string;                     // Dominio: 'wsj.com', 'nytimes.com', etc.
  url: string;                        // URL canónica (permalink oficial, mapeado a 'abstract' en la API)
  urlWithParams?: string;             // URL completa con query params/IDs

  // ── Campos de la API Medialog (Persistidos y Editables) ──
  emisora: number;                    // ID de la emisora (captura manual / auto-resolución vía GET /v1/portales/?dominio=...)
  emision: number;                    // ID de la emisión (captura manual, valor sugerido/defecto: 4659889)
  fecha: string;                      // Fecha y hora del registro (ISO 8601 o YYYY-MM-DDTHH:MM:SS)
  usuario: string;                    // Login del logger (obtenido automáticamente de la sesión del JWT)
  evento: number;                     // Tipo de evento (fijo por defecto: 1)
  superabstract: string;              // Titular o encabezado de la nota (de NewsArticle.encabezado)
  pendiente: number;                  // Estatus de edición (1 = Pendiente, 0 = Terminado)
  
  // ── Campos Opcionales / Mapeos Auxiliares en la API ──
  abstract: string;                   // URL/permalink de la nota (por razones de compatibilidad se envía en el body de la API como text)
  texto: string;                      // Texto completo (mapeado a 'transcripcion' o persistido localmente)
  autor: string;                      // Autor(es) de la nota (guardado localmente)
  medio: string;                      // Nombre del medio / portal (guardado localmente)

  // ── Datos Estructurados Adicionales (Persistidos Localmente y en JSON Export) ──
  subtitulo?: string;                 // Subtítulo / Deck / Standfirst
  seccion?: string;                   // Sección del periódico (Politics, Business, etc.)
  tags?: string[];                    // Keywords / Tags del artículo
  idioma?: string;                    // 'es' | 'en' | 'fr' | etc.
  imageUrls?: string[];               // URLs de imágenes del artículo
  authorUrl?: string;                 // URL del perfil del autor
  publisherName?: string;             // Nombre del publisher (de JSON-LD)
  publisherLogo?: string;             // Logo del publisher
  description?: string;               // Meta description / OG description
  wordCount?: number;                 // Conteo de palabras del texto

  // ── Control de Calidad ──
  isFullContent: boolean;             // ¿Se capturó el artículo completo?
  paywallDetected: boolean;           // ¿Se detectó un paywall?
  extractionMethod: ExtractionMethod; // Cómo se obtuvo el dato principal
  confidence: number;                 // 0.0 - 1.0

  // ── Clasificación del Investigador ──
  clasificaciones: number[];          // Array de números de clasificación (1, 2, 3...)
  notas?: string;                     // Notas libres del investigador (mapeado a 'analisis' en la API)

  // ── Timestamps ──
  capturedAt: string;                 // ISO 8601 — cuándo se capturó
  lastModified: string;               // ISO 8601 — última edición manual

  // ── Estado ──
  status: ArticleStatus;
  dbRecordId?: number;                // Almacena el ID retornado por la API ('medialog') al grabar
}

type ExtractionMethod = 'json-ld' | 'site-specific' | 'meta-tags' | 'readability' | 'manual';
type ArticleStatus = 'draft' | 'reviewed' | 'exported' | 'synced';

// ══════════════════════════════════════════
// MAPEO DE PERSISTENCIA DIRECTA (API MEDIALOG)
// ══════════════════════════════════════════
// Endpoint: POST https://api.medialog.com.mx/v1/medialogs/
// Headers:
//   - Content-Type: application/json
//   - Authorization: Bearer <JWT_TOKEN>
//
// Mapeo exacto del Body JSON:
// ┌──────────────────────────┬────────────────────────────────────────────────────────┐
// │ Campo API (POST Body)     │ Origen / Campo de NewsArticle                          │
// ├──────────────────────────┼────────────────────────────────────────────────────────┤
// │ emisora (smallint)       │ NewsArticle.emisora (Editable en UI, auto-resuelta)    │
// │ emision (int)            │ NewsArticle.emision (Editable en UI, default 4659889)   │
// │ fecha (datetime)         │ NewsArticle.fecha (ISO de la nota)                     │
// │ usuario (varchar 20)     │ NewsArticle.usuario (Nombre de usuario autenticado)    │
// │ evento (int)             │ NewsArticle.evento (Fijo por defecto: 1)               │
// │ superabstract (vc 200)   │ NewsArticle.superabstract (Encabezado / titular)       │
// │ pendiente (smallint)     │ NewsArticle.pendiente (Editable en UI, 0 o 1)           │
// │ abstract (text)          │ NewsArticle.abstract (URL / permalink de la nota)      │
// │ transcripcion (text)     │ NewsArticle.texto (Texto completo de la nota)          │
// │ analisis (text)          │ NewsArticle.notas (Opcional, comentarios)              │
// │ fecha_log (datetime)     │ Generada en caliente al grabar: new Date().toISOString()│
// └──────────────────────────┴────────────────────────────────────────────────────────┘

// ══════════════════════════════════════════
// CONFIGURACIÓN DE SITIOS
// ══════════════════════════════════════════

interface SiteConfig {
  name: string;           // "Wall Street Journal"
  hostPatterns: string[]; // ["wsj.com"]
  selectors: {
    title: string;
    author: string;
    date: string;
    content: string;
    subtitle?: string;
    section?: string;
    paywall?: string;
  };
}

// ══════════════════════════════════════════
// MENSAJES DE COMUNICACIÓN
// ══════════════════════════════════════════

type ExtensionMessage =
  | { type: 'EXTRACT_ARTICLE' }                                      // Side Panel → SW → CS
  | { type: 'ARTICLE_EXTRACTED'; payload: Partial<NewsArticle> }      // CS → SW → Side Panel
  | { type: 'SAVE_ARTICLE'; payload: NewsArticle }                    // Side Panel → SW (Local cache)
  | { type: 'ARTICLE_SAVED'; payload: { id: string } }               // SW → Side Panel
  | { type: 'GRABAR_API'; payload: NewsArticle }                     // Side Panel → SW → API Medialog
  | { type: 'API_GRABADO_SUCCESS'; payload: { id: string; dbRecordId: number } } // SW → Side Panel
  | { type: 'API_GRABADO_ERROR'; payload: { id: string; error: string } } // SW → Side Panel
  | { type: 'GET_ALL_ARTICLES' }                                      // Side Panel → SW
  | { type: 'ALL_ARTICLES'; payload: NewsArticle[] }                  // SW → Side Panel
  | { type: 'DELETE_ARTICLE'; payload: { id: string } }               // Side Panel → SW
  | { type: 'EXPORT_JSON' }                                           // Side Panel → SW
  | { type: 'EXPORT_CSV' }                                            // Side Panel → SW
  | { type: 'CLEAR_ALL' }                                             // Side Panel → SW
  | { type: 'SITE_DETECTED'; payload: { site: string; name: string } } // CS → SW → Side Panel
  | { type: 'NO_ARTICLE_FOUND' }                                      // CS → SW → Side Panel
  | { type: 'UPDATE_BADGE'; payload: { count: number } };             // SW internal
```

## UI del Side Panel

### Pantalla de Login (Opción B)
Si la extensión no detecta un JWT token válido o si expira, **reemplaza completamente** el formulario del Side Panel por la siguiente pantalla de autenticación:

```
┌──────────────────────────────────────┐
│ 📰 PortalScrapper            v1.0 ⚙️│
│ ──────────────────────────────────── │
│                                      │
│          Iniciar Sesión              │
│          API MEDIALOG                │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Usuario                          │ │
│ │ [ juan.perez                  ]  │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Contraseña                       │ │
│ │ [ **********                  ]  │ │
│ └──────────────────────────────────┘ │
│                                      │
│            [ 🔑 Ingresar ]           │
│                                      │
│ 🔴 Error de credenciales (Opcional)  │
└──────────────────────────────────────┘
```
Al presionar `Ingresar`, realiza un request `POST https://api.medialog.com.mx/v1/auth/token` (usando Basic Auth HTTP headers con usuario y contraseña) para recuperar el `access_token` JWT. Una vez autenticado, guarda el token y el username de manera segura en `chrome.storage.local` y activa la interfaz del formulario de captura de notas. Muestra el usuario logueado en la parte superior con un botón `[Cerrar Sesión]`.

---

### Layout del Formulario (Usuario Autenticado)

```
┌──────────────────────────────────────┐
│ 📰 PortalScrapper            v1.0 ⚙️│
│ ──────────────────────────────────── │
│ 👤 juan.perez          [Cerrar Sesión]│
│ ──────────────────────────────────── │
│ 🟢 elpais.com detectado              │
│ Método: JSON-LD • Confianza: 95%    │
│ Emisora Auto-resuelta: 1256         │
│                                      │
│ ┌──────────────────────────── [📋]┐  │
│ │ Superabstract (Encabezado)     │  │
│ │ España pacta nuevas medidas    │  │
│ └────────────────────────────────┘  │
│ ┌──────────────────────────── [📋]┐  │
│ │ Abstract (URL de la nota)       │  │
│ │ https://elpais.com/noticia.html │  │
│ └────────────────────────────────┘  │
│ ┌──────────┐  ┌──────────────────┐  │
│ │ Emisora  │  │ Pendiente (0 o 1)│  │
│ │ [1256  ] │  │ [1            ]  │  │
│ └──────────┘  └──────────────────┘  │
│ ┌──────────┐  ┌──────────────────┐  │
│ │ Emisión  │  │ Evento (Fijo)    │  │
│ │ [4659889]│  │ [1            ]  │  │
│ └──────────┘  └──────────────────┘  │
│ ┌──────────────────────────── [📋]┐  │
│ │ Fecha de la Nota               │  │
│ │ 2026-05-20T14:30:00            │  │
│ └────────────────────────────────┘  │
│ ┌──────────────────────────── [📋]┐  │
│ │ Medio                          │  │
│ │ El País                        │  │
│ └────────────────────────────────┘  │
│ ┌──────────────────────────── [📋]┐  │
│ │ Autor                          │  │
│ │ Miguel Ángel                   │  │
│ └────────────────────────────────┘  │
│ ┌──────────────────────────── [📋]┐  │
│ │ Texto / Transcripción          │  │
│ │ [textarea con scrollbar]       │  │
│ └────────────────────────────────┘  │
│ ┌────────────────────────────────┐  │
│ │ Clasificaciones [1] [3] [+]   │  │
│ └────────────────────────────────┘  │
│ ┌──────────────────────────── [📋]┐  │
│ │ Notas del investigador /Análisis│  │
│ │                                │  │
│ └────────────────────────────────┘  │
│                                      │
│ [💾 Grabar API]  [🔄 Re-extraer]   │
│ [🔗 Generar Liga]                   │
│                                      │
│ ─────── Historial Local / Drafts ─── │
│ 📄 España pacta n...     (EP)    🗑️│
│ 📄 Fed Signals Tw...     (WSJ)   🗑️│
│                                      │
│ [📤 JSON] [📤 CSV]  2 artículos     │
└──────────────────────────────────────┘
```

### Especificaciones de UI

- **Todos los campos del formulario son editables**.
- **Botón [📋]** al lado de cada campo: copia el contenido del input/textarea correspondiente al clipboard.
- **Auto-Resolución de Emisora**: Cuando se detecta un portal y se procesa su URL, extrae el dominio (ej. `elpais.com`) y realiza de manera asíncrona un `GET https://api.medialog.com.mx/v1/portales/?dominio=elpais.com`. Si la API devuelve portales en su arreglo de datos (`.data[0].emisora`), auto-rellena el campo `Emisora` con este ID numérico de forma inmediata, dejándolo completamente editable por si el usuario desea revisarlo o cambiarlo manualmente.
- **Campo Emisión**: Campo de captura de tipo `number` (int) pre-llenado con el valor por defecto sugerido: `4659889`.
- **Campo Evento**: Fijo en `1` por defecto (campo numérico o deshabilitado).
- **Campo Pendiente**: Campo numérico para capturar `0` (Terminado) o `1` (Pendiente). Pre-llenado por defecto en `1`.
- **Botón [💾 Grabar API]**:
  1. Primero guarda localmente el artículo en `chrome.storage.local` como draft o respaldo (offline-first).
  2. Construye el payload de `POST /v1/medialogs/` y realiza la petición HTTP con el Bearer token JWT activo.
  3. Si la API responde exitosamente, el campo `dbRecordId` se actualiza con el ID de `medialog` devuelto, el estado cambia a `synced` y se muestra un toast. El usuario autenticado (`usuario`) se guarda de forma obligatoria en el payload.
  4. Si la llamada falla, se conserva localmente como `draft` permitiendo reintentar el guardado más tarde.
- **Botón [🔗 Generar Liga]**: Crea un enlace dinámico directo a la API o al visor utilizando el ID numérico de base de datos `dbRecordId` (ej. `https://api.medialog.com.mx/v1/medialogs/hash/{dbRecordId}` si está sincronizado).
- **Botón [🔄 Re-extraer]**: Re-ejecuta la cascada de extracción del DOM y refresca el formulario, solicitando confirmación si el usuario ya realizó modificaciones manuales.
- **Clasificaciones**: Array de chips de identificación de clasificación numérica. Botón `[+]` agrega un número y el click en un chip existente lo remueve.
- **Historial / Artículos guardados**: Panel inferior colapsable con scroll. Click en un item carga todos sus datos para revisión o re-edición. Botón `🗑️` para eliminar.
- **Botones de Exportación Local**: Permiten exportar el historial local completo de `chrome.storage.local` como JSON estructurado o archivo CSV Excel-safe de forma offline en cualquier momento.

### Estilo Visual

- **Dark mode** elegante e inmersivo con estética moderna (glassmorphic).
- Fondo oscuro principal: `#0f0f1b` con acentos de color dinámicos según el medio cargado.
- Controles de UI responsivos que se adaptan al ancho del panel lateral (300px a 600px).
- Animaciones suaves de transición para la pantalla de login y estados de guardado/toast.
- Tipografía limpia usando la fuente Inter o del sistema.

## Estructura del Proyecto

```
portalescrapper/
├── manifest.json
├── package.json
├── tsconfig.json
├── build.mjs
├── .gitignore
├── README.md
├── agents.md
├── src/
│   ├── types.ts                      # NewsArticle, SiteConfig, ExtensionMessage
│   ├── api/
│   │   ├── client.ts                 # Cliente HTTP, GET /v1/portales/ y POST /v1/medialogs/
│   │   ├── auth.ts                   # Flujo de login (Basic Auth → JWT) y logout
│   │   └── types.ts                  # Tipos de datos para requests y responses
│   ├── sidepanel/
│   │   ├── sidepanel.html            # UI de Login y Formulario de Captura
│   │   ├── sidepanel.ts              # Lógica de estados de UI, Auth y Grabado API
│   │   └── sidepanel.css             # Estilos del side panel y toast
│   ├── content/
│   │   ├── index.ts                  # Entry point: observer + message listener
│   │   └── detector.ts               # Detecta si estamos en un portal conocido
│   ├── extractors/
│   │   ├── base.ts                   # Interfaz ExtractorResult + helper functions
│   │   ├── jsonld.ts                 # Extractor JSON-LD universal
│   │   ├── meta.ts                   # Extractor OpenGraph / meta tags
│   │   ├── siteSpecific.ts           # Extractor por selectores de SITE_CONFIGS
│   │   └── cascade.ts               # Orquestador: ejecuta capas y mergea resultados
│   ├── background/
│   │   └── service-worker.ts         # Router de mensajes, storage ops, export
│   ├── storage/
│   │   └── store.ts                  # CRUD sobre chrome.storage.local
│   └── utils/
│       ├── uuid.ts                   # Generador de UUIDs
│       ├── clipboard.ts             # Helper para copiar al clipboard
│       └── export.ts                # Funciones de exportación JSON/CSV
└── dist/                            # Output de esbuild (gitignored)
    ├── content.js
    ├── service-worker.js
    └── sidepanel.js
```

## Build System

Usar esbuild (heredar patrón de xscrapper):

```javascript
const entryPoints = [
  { entryPoints: ["src/content/index.ts"],            outfile: "dist/content.js" },
  { entryPoints: ["src/background/service-worker.ts"], outfile: "dist/service-worker.js" },
  { entryPoints: ["src/sidepanel/sidepanel.ts"],       outfile: "dist/sidepanel.js" },
];
```

- Format: IIFE
- Target: ES2022
- Sourcemaps: enabled
- Watch mode: `--watch` flag
- Auto version bump en builds de producción (mismo patrón de xscrapper)

## Dependencias

```json
{
  "devDependencies": {
    "esbuild": "^0.21.5",
    "typescript": "^5.5.0",
    "rimraf": "^5.0.7"
  }
}
```

> **Nota sobre Readability.js**: Si se incluye como Capa 4, bundlear `@mozilla/readability` con esbuild. Es una librería pequeña (~15KB minified) y no requiere Node.js APIs.

## Patrón de Detección y Extracción Automática

El content script debe:

1. **Al cargar la página**: Verificar si el dominio actual está en la lista de portales soportados.
2. **Enviar `SITE_DETECTED`** al service worker con el nombre del sitio.
3. **Escuchar `EXTRACT_ARTICLE`** del service worker (iniciado por el Side Panel).
4. **Ejecutar la cascada de extracción** y devolver `ARTICLE_EXTRACTED` con los datos parciales.
5. **Observar cambios DOM** (MutationObserver) por si la página carga contenido dinámicamente (SPAs, lazy loading de paywall content).

El Side Panel debe:
1. Al abrirse, consultar el tab activo para ver si hay un sitio detectado.
2. Auto-ejecutar la extracción si detecta un portal conocido.
3. Escuchar cambios de tab (`chrome.tabs.onActivated`) para re-detectar cuando el usuario cambia de pestaña.
4. Escuchar navegación (`chrome.tabs.onUpdated`) para re-detectar cuando la URL cambia.

## Exportación

### JSON
```json
{
  "exportDate": "2025-05-20T18:00:00Z",
  "version": "1.0.0",
  "totalArticles": 3,
  "articles": [ /* NewsArticle[] */ ]
}
```

### CSV
- BOM UTF-8 (`\uFEFF`) para compatibilidad con Excel
- Columnas: Medio, Fecha, Encabezado, Autor, Texto, URL, Sección, Tags, Clasificaciones, Notas, Confianza, Método
- IDs en formato Excel-safe: `="UUID"` para evitar truncamiento
- Descargar vía `chrome.downloads.download()` con blob URL

## Persistencia Directa en la API Medialog

### Conexión e Integración de Red
- **Base URL**: `https://api.medialog.com.mx/v1`
- La extensión de Chrome realiza peticiones HTTP directas a la API Medialog.
- Es indispensable declarar `"https://api.medialog.com.mx/*"` en `host_permissions` de `manifest.json`.

### Flujo de Grabado en Producción
1. El usuario revisa los campos en la UI y presiona **[💾 Grabar API]**.
2. Los datos se guardan de inmediato en `chrome.storage.local` como respaldo local.
3. Se recupera el token JWT almacenado. Si no existe o está vencido, se interrumpe y se muestra la pantalla de login.
4. Se hace la llamada `POST /v1/medialogs/` con el body estructurado y los headers requeridos (`Authorization: Bearer <token>` y `X-Internal-App-ID` o API key si aplica).
5. Al recibir la respuesta exitosa `{"status": "success", "data": { "medialog": 12345, ... }}`:
   - Se actualiza el campo `dbRecordId` local con el número retornado (`medialog`).
   - El estado local del artículo cambia a `'synced'`.
   - Se muestra un toast de éxito con el ID obtenido.
6. El botón **[🔗 Generar Liga]** ahora puede abrir `https://api.medialog.com.mx/v1/medialogs/hash/{dbRecordId}` para acceder a la nota de manera oficial.

### Tratamiento de Errores de Red
- Si la API no está disponible o el usuario no tiene conexión a internet:
  - El registro se mantiene en `chrome.storage.local` en estado `'draft'`.
  - Se muestra una alerta/toast informando el fallo de sincronización.
  - Se habilita un botón visual de reintento para sincronizar a la API cuando regrese la conexión.

## Referencia: Código Existente a Reutilizar/Adaptar

Del proyecto xscrapper, reutilizar estos patrones:

| Patrón | Archivo Original | Adaptación |
|---|---|---|
| Build system esbuild | `xscrapper/build.mjs` | Cambiar entry points a sidepanel |
| MutationObserver | `xscrapper/src/content/observer.ts` | Simplificar para detección de artículos |
| JSON-LD extraction | `xscrapper/elpais/src/content/extractor.ts` | Generalizar para multi-portal |
| Storage manager | `xscrapper/elpais/src/storage/StorageManager.ts` | Agregar más operaciones CRUD |
| CSV export | `xscrapper/src/popup/popup.ts` (líneas de CSV) | Adaptar columnas |
| Version bump | `xscrapper/build.mjs` (incrementVersion) | Reutilizar tal cual |

## Criterios de Aceptación del MVP

- [ ] Side Panel se abre y permanece visible al navegar.
- [ ] Si no hay sesión activa, la Pantalla de Login se muestra bloqueando el acceso al formulario.
- [ ] La autenticación con usuario y password contra `POST /auth/token` funciona y guarda el JWT token localmente.
- [ ] Al visitar un portal soportado, se auto-extraen los datos y se auto-resuelve el campo `Emisora` llamando a la API de portales mediante el dominio de la URL.
- [ ] El formulario pre-llena `Emisión` con el valor por defecto `4659889` y `Evento` con `1`.
- [ ] Todos los campos de la nota (incluyendo emisora, emisión y pendiente) son editables manualmente.
- [ ] El botón Grabar API persiste en local y en la API Medialog (`POST /v1/medialogs/`) con el login del usuario como valor de `usuario`.
- [ ] El historial local (Drafts/Sincronizados) es visible y se puede exportar en formato JSON y CSV de forma offline.
- [ ] Al menos 3 portales (WSJ, NYT, El País) tienen extracción y mapeo funcional validado.
