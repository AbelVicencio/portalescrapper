# 🤖 Guía para Agentes de IA: PortalScrapper

Este documento proporciona contexto y lineamientos para los asistentes de codificación por IA que trabajen en este repositorio.

## 🏗️ Visión General de la Arquitectura

Extensión de Chrome/Edge (Manifest V3) con una UI de **Side Panel** para la captura pasiva de artículos periodísticos desde los principales portales de noticias, con persistencia directa en la base de datos de **Medialog** a través de su API.

1.  **Content Scripts (`src/content/`)**: 
    - Inyectados en todos los sitios HTTPS (`https://*/*`).
    - Detectan si la página actual es un artículo de noticias.
    - Extraen datos estructurados mediante una cascada de 5 capas: JSON-LD → Site-Specific → Meta Tags → Genérico → Manual.
    - Responden solicitudes de extracción del Service Worker (estrictamente bajo demanda, no de forma automática).
    - Incluyen un `MutationObserver` (`setupObservers()`) para detección dinámica en SPAs, **actualmente desactivado** para evitar capturas no deseadas.

2.  **Service Worker (`src/background/`)**: 
    - Broker central de mensajería entre el Content Script, el Side Panel y el Storage/API.
    - Gestiona las operaciones de `chrome.storage.local`.
    - Maneja la exportación (JSON/CSV) y las actualizaciones del badge.

3.  **Side Panel (`src/sidepanel/`)**:
    - UI persistente que se muestra junto al contenido del navegador (Chrome Side Panel API).
    - Cuenta con una pantalla de Login que reemplaza la interfaz si no hay sesión activa.
    - Formulario editable con datos pre-llenados y campos de API resueltos manual o automáticamente.
    - Historial de artículos, controles de exportación y sistema de clasificaciones.
    - Se comunica con el Service Worker mediante `chrome.runtime.sendMessage`.

4.  **Extractores (`src/extractors/`)**: 
    - `jsonld.ts` — Parsea `<script type="application/ld+json">` en busca de esquemas NewsArticle/Article.
    - `meta.ts` — Lee las meta etiquetas de OpenGraph y Twitter Cards.
    - `siteSpecific.ts` — Usa selectores CSS curados por portal.
    - `cascade.ts` — Orquesta las capas y fusiona resultados por nivel de confianza.

5.  **Storage (`src/storage/`)**: 
    - Envuelve `chrome.storage.local` con operaciones CRUD.
    - Gestiona el almacenamiento offline de borradores, listado, eliminación y preparación para exportación.

6.  **API Client (`src/api/`)**:
    - `client.ts` — Maneja operaciones HTTP para `POST /v1/medialogs/`, `PATCH /v1/medialogs/{id}` (para actualizaciones parciales), `GET /v1/portales/`, `GET /v1/emisiones/`, y `POST /v1/relaciones/medialogs`.
    - `auth.ts` — Administra el estado de autenticación JWT (almacenamiento y validación de tokens).
    - `types.ts` — Tipos para los payloads de solicitud y respuesta.

## 🛠️ Módulos Clave y Responsabilidades

- **`src/extractors/cascade.ts`**: Orquesta la cascada de extracción de 5 capas. También aplica limpiadores de texto post-procesamiento por portal (WSJ, Milenio, El Universal, El País).
- **`src/extractors/siteSpecific.ts`**: Contiene `SITE_CONFIGS` con selectores CSS para cada portal de noticias registrado.
- **`src/extractors/generic.ts`**: Extractor heurístico universal por densidad de texto (Capa 4). Funciona en cualquier sitio HTTPS sin configuración previa.
- **`src/extractors/snapshot.ts`**: Genera snapshots HTML/PDF autocontenidos y de alta calidad, con activos incrustados en Base64, hojas de estilos de impresión, filtros de promociones y encabezados Schema/social enriquecidos.
- **`src/extractors/base64Logos.ts`**: Caché de logos pre-codificados en Base64 para portales conocidos. Lo utiliza `snapshot.ts` para incrustar logos de marca de forma confiable en archivos HTML offline sin realizar solicitudes de red.
- **`src/storage/store.ts`**: Maneja las operaciones CRUD de artículos en `chrome.storage.local`.
- **`src/types.ts`**: La fuente de verdad para los tipos `NewsArticle`, `SiteConfig` y `ExtensionMessage`.
- **`src/sidepanel/sidepanel.ts`**: Lógica principal de la UI, manejo del formulario, prevención de duplicados, gestión de sesión y operaciones de portapapeles.
- **`src/api/client.ts`**: Todas las llamadas REST a la API de Medialog (guardar medialog, crear relaciones, resolución de portal/emisión, búsqueda de duplicados).
- **`src/api/auth.ts`**: Gestión de tokens JWT y validación de sesión.
- **`src/config/portalClassifications.ts`**: **Importante** — Define qué clasificaciones se vinculan automáticamente a un medialog según el ID del portal.

## 📋 Lineamientos de Codificación para Agentes

### 1. Comunicación Side Panel ↔ Content Script
- El Side Panel y los Content Scripts **no pueden** comunicarse directamente.
- Todos los mensajes deben pasar por el Service Worker.
- Usa `chrome.runtime.sendMessage` desde el Side Panel → Service Worker.
- Usa `chrome.tabs.sendMessage(tabId, msg)` desde el Service Worker → Content Script.

### 2. Estabilidad de Selectores
- Prefiere `data-testid`, `aria-label` o selectores semánticos (`article p`, `h1`, `time[datetime]`) sobre nombres de clase frágiles.
- JSON-LD y las meta etiquetas son las fuentes más estables. Siempre inténtelas primero.

### 3. Rendimiento y Robustez
- Mantén la lógica del content script lo más ligera posible.
- Usa timeouts + `Promise.race` en todas las llamadas a `chrome.tabs.sendMessage` (el panel se ha congelado varias veces en el pasado por content scripts que no respondían).
- Usa el guardián `isResolving` en `autoResolveEmisora` para prevenir operaciones costosas concurrentes.
- Protege cada llamada de red con `ensureValidSession()`.

### 4. Integridad de Datos y Sincronización con la API
- Siempre normaliza `fecha` a la **hora local de Ciudad de México** (`America/Mexico_City`) antes de guardar o usarla en búsquedas.
- Siempre normaliza el texto de transcripción para preservar los saltos de párrafo usando `\n\n`.
- `abstract` y `url` deben **siempre** contener la URL permanente limpia (resuelta vía etiqueta canonical, og:url, o eliminación de parámetros). Usa `urlWithParams` para conservar la URL cruda con parámetros de consulta.
- Después de un guardado exitoso, crea automáticamente las relaciones si están configuradas en `portalClassifications.ts`.
- Realiza el guardado en dos niveles: primero local (`chrome.storage.local`), luego en la API.

### 5. Prevención de Duplicados (Muy Importante)
- Existe un sistema de duplicados **en dos niveles**:
  1. Verificación local contra `chrome.storage.local` (rápida, basada en URL).
  2. Verificación remota contra la base de datos real de Medialog (por título + fecha y por URL).
- Usa el flag global `(window as any).FORCE_API = true` en la consola para omitir la verificación local durante las pruebas.
- Cuando el formulario ya tiene un `dbRecordId`, la verificación local agresiva generalmente debe omitirse.

### 6. Relaciones Automáticas
- Después de guardar exitosamente un medialog, la extensión crea automáticamente relaciones usando `POST /v1/relaciones/medialogs`.
- El mapeo está definido en `src/config/portalClassifications.ts`.
- `tipo` siempre es `"R"`.
- `fecha` debe ser la hora normalizada de Ciudad de México del artículo.

### 7. Ciclo de Vida de la Autenticación
- JWT es obligatorio.
- `getCurrentUser()` debe ser llamado antes de cualquier operación de red.
- Ante un 401/403 → cerrar sesión y regresar a la pantalla de login de forma controlada.

### 8. Generación de PDF vía Chrome Debugger Protocol
- El Service Worker maneja el mensaje `PRINT_TAB_TO_PDF` usando el permiso `debugger` (Chrome Debugger Protocol v1.3).
- Genera PDFs con **texto real seleccionable** (no renders basados en imagen) adjuntándose a una pestaña de snapshot y llamando a `Page.printToPDF`.
- Antes de capturar el PDF, el Service Worker ejecuta un script que reduce la imagen hero (canvas JPEG, máx 380×220) y elimina las imágenes del cuerpo para mantener el tamaño del archivo en un rango razonable.
- El debugger **siempre se desconecta** en el bloque `finally` para eliminar el banner de depuración de Chrome lo antes posible.
- NO uses el permiso `debugger` para ningún propósito distinto a la captura de PDF.

## 🔄 Tareas Comunes

### Agregar un nuevo portal de noticias
La extensión ahora se inyecta en **todos los sitios HTTPS** (`manifest.json` usa `https://*/*`). Esto significa:
1. **No es necesario modificar `manifest.json`** para nuevos portales — el content script ya está inyectado en todas partes.
2. **Prueba primero con el extractor genérico** — navega a un artículo y dispara la extracción. Si el genérico ofrece ≥80% de calidad, ya terminaste.
3. **Solo si es necesario**, agrega una nueva entrada en `SITE_CONFIGS` dentro de `src/extractors/siteSpecific.ts` con selectores CSS afinados.
4. (Opcional) Agrega clasificaciones automáticas en `src/config/portalClassifications.ts`.

### Procedimiento de Entrenamiento de Portal (iterativo)
Cuando el extractor genérico no es suficiente para un portal específico:

1. **Navega** a un artículo representativo del portal objetivo.
2. **Inspecciona el DOM** — revisa:
   - ¿El sitio tiene JSON-LD `<script type="application/ld+json">`? (Si es así, la Capa 1 lo maneja)
   - ¿Qué selectores CSS identifican: título (`h1`), autor, fecha (`time[datetime]`), cuerpo del contenido?
   - ¿Existe algún elemento de paywall?
3. **Abre el Side Panel** y dispara Re-extraer. Verifica qué captura ya la cascada.
4. **Si faltan campos**, agrega el portal a `SITE_CONFIGS` con selectores específicos.
5. Compila (`npm run build`) y recarga la extensión.

### La Cascada de Extracción de 5 Capas
```
JSON-LD (0.95) → Site-Specific (0.85) → Meta Tags (0.75) → Genérico (0.50) → Manual (0.0)
```
- **JSON-LD** (`jsonld.ts`): La más estable. Parsea `<script type="application/ld+json">` en busca de esquemas `NewsArticle`/`Article`.
- **Site-Specific** (`siteSpecific.ts`): Selectores CSS curados por portal. Solo aplica a los portales registrados en `SITE_CONFIGS`. Se evalúan de forma secuencial (del más específico al más general) para evitar falsos positivos de selectores fallback genéricos.
- **Meta Tags** (`meta.ts`): OpenGraph (`og:title`, `og:description`), Twitter Cards, `article:published_time`.
- **Genérico** (`generic.ts`): Heurísticas de densidad de texto, selectores universales (`article`, `main`, `[itemprop="articleBody"]`), filtrado automático de ruido. Funciona en **cualquier** sitio HTTPS sin configuración previa.
- **Manual** (0.0): El usuario llena el formulario directamente.

Tras el merge de la cascada, `cascade.ts` aplica **limpiadores de texto específicos por portal** (WSJ, Milenio, El Universal, El País) antes de devolver el resultado final.

La regla general del merge es "el primer valor no nulo gana" — las capas de mayor confianza tienen prioridad en los metadatos. Sin embargo, el **contenido de texto (cuerpo del artículo)** usa **Fusión Inteligente de Texto** en `mergeResults()`:
- El contenido curado de `site-specific` tiene prioridad sobre los teasers/previews truncados de `json-ld`.
- Si una capa de menor confianza (como `site-specific` o `generic`) encuentra un cuerpo de texto significativamente más largo (p.ej. >1.3x) que el encontrado por `json-ld` o `meta-tags`, lo sobreescribirá para capturar el artículo completo.
- El texto curado de `site-specific` está protegido contra ser sobreescrito por extracciones ruidosas de `generic` ligeramente más largas, a menos que el nuevo texto sea considerablemente más extenso.

### Agregar clasificaciones automáticas para un portal
Edita `src/config/portalClassifications.ts`:

```ts
export const PORTAL_CLASSIFICATIONS: Record<number, number[]> = {
  4014: [25609],           // El País
  10725: [25872],          // Financial Times (PressReader)
};
```

### Reparar un selector roto
- Actualiza la entrada correspondiente en `SITE_CONFIGS`.
- Prefiere selectores semánticos o `data-testid`.
- Para sitios SPA (como PressReader), usa comodines `[class*="patron"]` ya que los nombres de clase exactos pueden cambiar entre compilaciones.
- **Prioridad de Selectores (Crucial)**: `querySelectorAll` evalúa los selectores separados por coma de forma secuencial de izquierda a derecha. Esto asegura que los selectores más específicos (p.ej. `.v-textview h1`) se evalúen y coincidan primero, evitando que los fallbacks genéricos (p.ej. `h1` desnudo) coincidan con elementos de paginación aleatorios (como "Anterior") que aparecen antes en el DOM. Siempre coloca los selectores más específicos primero.

### Guardar un medialog + crear relaciones / actualizaciones
1. Para artículos nuevos, al hacer clic en "Grabar" se llama a `grabarMedialog(...)`.
2. Cuando se resuelve un `dbRecordId` (mediante extracción, carga del historial o verificaciones de duplicados), el botón "Grabar" cambia dinámicamente a "Actualizar".
3. Al hacer clic en "Actualizar" se realiza una comparación diferencial entre el estado actual del formulario y `lastSavedFormState`, enviando solo los campos modificados vía `patchMedialog(...)` a `PATCH /v1/medialogs/{id}`.
4. Si tiene éxito, se ejecuta `crearRelacionMedialog` para cada clasificación definida para ese portal (solo en la creación inicial del registro).

## ⚠️ Gotchas Conocidos

- **Congelamiento del Side Panel**: Usa siempre timeouts en `chrome.tabs.sendMessage`. El content script en páginas pesadas (especialmente El País) puede quedar sin respuesta.
- **Estado del Formulario Desactualizado**: Cuando se extrae un nuevo artículo, limpia explícitamente el `dbRecordId` y los datos anteriores si cambió la URL.
- **Manejo de Fechas**: El backend de Medialog espera `fecha` en **hora local de Ciudad de México**, no en UTC.
- **Campo Abstract**: Debe contener siempre la URL original (se usa para la búsqueda remota de duplicados).
- **Expiración de Sesión**: Siempre verifica `getCurrentUser()` antes de llamadas de red. Ante un 401, cierra sesión de forma controlada.
- **PressReader es una SPA**: El código fuente HTML está vacío — todo el contenido es renderizado por JavaScript. Nuestro content script se ejecuta en `document_idle` y ve el DOM renderizado, pero puede ser necesario esperar delays del `MutationObserver` para la carga dinámica de artículos.
- **Extractor genérico en sitios que no son noticias**: El content script ahora se inyecta en TODOS los sitios HTTPS. Es pasivo (solo extrae bajo solicitud), pero `detectSite()` devolverá un resultado genérico para cualquier página con una ruta. Esto es por diseño.
- **Extracción Solo Manual**: La extracción es estrictamente bajo demanda (se dispara únicamente cuando el usuario hace clic en 'Extraer' en el sidepanel). `setupObservers()` está definido en el content script pero su llamada está **actualmente comentada** en `init()`, por lo que la extracción automática por mutaciones de página está desactivada.
- **PDF vía Chrome Debugger Protocol**: `PRINT_TAB_TO_PDF` requiere el permiso `debugger` declarado en `manifest.json`. Al adjuntar el debugger aparece un banner visible en la pestaña del navegador — esto es inevitable con CDP y se descarta automáticamente tras la generación del PDF.
- **Activos relativos en SPAs (p.ej. PressReader)**: Las referencias de imagen relativas (`images/be-ft-logo.svg`) pueden resolverse incorrectamente o golpear páginas shell de SPAs que devuelven HTML. Durante el snapshotting, accede siempre a la URL completa desde la propiedad viva del elemento `.src` y verifica los tipos de contenido de la respuesta (rechazando `text/html`) antes de intentar la conversión a Base64.
- **Imágenes Duplicadas en el Cuerpo**: Los portales frecuentemente repiten la imagen hero del artículo dentro del primer párrafo del cuerpo. Usa siempre comparación por base de URL para localizar y eliminar la imagen duplicada del contenido parseado.
- **Estilos de Color Exactos para Impresión**: Los colores de fondo y los rellenos de rutas SVG son eliminados por defecto al imprimir en PDF. Asegúrate de que `print-color-adjust: exact` y `-webkit-print-color-adjust: exact` estén aplicados en los elementos `body` y `header` dentro de `@media print`.
- **Descarga de Archivos HTML y Título de Impresión**: Al generar archivos HTML o imprimir en PDF, el `<title>` del documento antepone automáticamente el dominio principal limpio en mayúsculas seguido de un guion (p.ej. `ELPAIS - Sheinbaum...`). Los elementos de diseño de impresión tienen `.action-bar` eliminado antes de guardarse.
- **Diálogo de Cambios No Guardados**: La advertencia que preguntaba sobre cambios sin guardar al Re-extraer ha sido completamente desactivada para garantizar un flujo de captura más ágil y fluido.

## 🗂️ Proyecto Relacionado

Este proyecto fue inspirado por el proyecto [xscrapper](https://github.com/Kilo-Org/xscrapper) (scraper pasivo de X/Twitter). El extractor de El País de ese proyecto fue el prototipo original para la capa site-specific de aquí.

---

*Actualiza este archivo siempre que agregues un comportamiento significativo nuevo (especialmente cualquier cosa que involucre la API, la lógica de duplicados o la configuración).*