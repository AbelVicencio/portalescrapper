# 🚀 API Medialog v2.2.1
### *La Inteligencia Aplicada al Monitoreo de Medios de Comunicación*

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![SQL Server](https://img.shields.io/badge/SQL_Server-CC2927?style=for-the-badge&logo=microsoft-sql-server&logoColor=white)](https://www.microsoft.com/sql-server)
[![Clean Architecture](https://img.shields.io/badge/Clean-Architecture-blue?style=for-the-badge)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

## 📋 Descripción General

**API Medialog v2.2.1** es una plataforma profesional de alto rendimiento rediseñada bajo principios de **Clean Architecture** y **SOLID**. Está optimizada para la gestión, consulta y análisis inteligente de contenidos de monitoreo en Radio, Televisión y Prensa.

Esta versión implementa orquestación avanzada de servicios, inyección de dependencias y un motor de visualización basado en IA de última generación.

---

## ✨ Características Principales (v2.2.1)

### 🔄 Estándares y Orquestación
*   **Versionado Explícito**: Continuidad del prefijo `/v1/` para estabilidad de contratos.
*   **Orquestación Interna**: Soporte nativo para consumo S2S mediante `X-Internal-App-ID` y `X-API-Key`.
*   **Field Masking Proyectivo**: Optimización de carga mediante proyección de columnas SQL dinámicas (`?fields=nota.id,analisis_ia.sentimiento`).
*   **Paginación de un solo viaje**: Implementación con `COUNT(*) OVER()` para eficiencia máxima en MSSQL.

### 🛡️ Arquitectura y Seguridad
*   **Clean Architecture**: Separación estricta en capas (Presentación, Dominio, Infraestructura, Utilidades).
*   **Seguridad Multimodal**: Protección vía JWT (OAuth2) para humanos y llaves permanentes para sistemas.
*   **Resiliencia Nativa**: Estrategias de reintento automático mediante `tenacity` para conexiones a base de datos.

### 📊 Análisis Nucleado y Visualización
*   **Análisis Nucleado Refinado**: Agrupación temática IA con soporte para `precisiones` (refinamiento narrativo).
*   **Gráficos IA**: Soporte para **Joyplot (Crestas)**, **Heatmap (Matriz de Calor)** y **Sismógrafos de Reputación**.
*   **Generación de Documentos**: Motor de síntesis ejecutiva multiplataforma (HTML y DOCX).

---

## 🏗️ Estructura del Proyecto

```text
api/
├── dominio/               # Lógica de Negocio (Core)
│   ├── modelos/          # Entidades de datos y Schemas Pydantic
│   ├── repositorios/     # Acceso a datos (SQL nativo optimizado)
│   └── servicios/        # Motores de IA y Orquestadores
├── infraestructura/      # Detalles técnicos (Conexión BD)
├── presentacion/         # Capa de API (FastAPI)
│   ├── rutas/           # Endpoints segmentados
│   └── middleware/      # Seguridad y Trazabilidad
├── utilidades/           # Logging, Fechas, Proyecciones y Cache
├── tests/                # Suite de pruebas unitarias
└── main.py              # Punto de entrada optimizado
```

---

## 🚀 Inicio Rápido

### 1. Instalación
```bash
python -m venv venv
source venv/bin/activate  # o venv\Scripts\activate en Windows
pip install -r requirements.txt
```

### 2. Configuración
Cree un archivo `.env` basado en `.env.example` incluyendo sus llaves de IA y BD.

### 3. Ejecución
```bash
# Modo Desarrollo
python main.py --debug --nossl --reload

# Modo Producción
python main.py --environment production --workers 6 --loglevel INFO
```

---

## 📡 Endpoints Destacados

| Recurso | Endpoint | Descripción |
| :--- | :--- | :--- |
| **Documentación** | `/docs` | Interfaz **Scalar** interactiva profesional. |
| **Salud** | `/v1/health` | Estado detallado de API, BD y versión. |
| **Prensa** | `/v1/prensa/` | Notas con autocultivo de abstracts IA. |
| **Radio/TV (Listado)** | `/v1/medialogs/` | Listado y búsqueda de monitoreo electrónico (Radio/TV). |
| **Radio/TV (Hash)** | `/v1/medialogs/hash/{id}` | Obtener hash MD5 y metadatos de acceso de un Medialog. |
| **Radio/TV (Captura)** | `POST /v1/medialogs/` | Capturar registro de monitoreo electrónico (emisora, emisión, fecha, evento…). |
| **Radio/TV (Actualizar)** | `PATCH /v1/medialogs/{id}` | Actualizar campos de un Medialog existente. |
| **Análisis Nucleado** | `/v1/{modulo}/.../nucleado` | Síntesis narrativa agrupada con refinamiento vía `precisiones`. |
| **Transcripciones** | `/v1/transcripciones/` | Consulta y búsqueda de transcripciones Speech-to-Text. |
| **Portales** | `/v1/portales/` | Captura y listado paginado de portales web con filtros de dominio y nombre. |
| **Relaciones** | `/v1/relaciones/medialogs` | Vinculaciones entre Medialogs y Clasificaciones con paginación y ordenamiento. |
| **Clasificaciones** | `/v1/clasificaciones/` | Rankings y detalle de actores, instituciones, temas y más. |
| **Mediarchivos** | `POST /v1/mediarchivos/cargapdf` | Carga y valida un PDF asociado a un Medialog (máx. 10.5 MB). |
| **Mediarchivos** | `POST /v1/mediarchivos/cargar` | Carga un archivo de cualquier extensión en carpeta configurada por función. |
| **Catálogos** | `/v1/catalogos/` | Catálogos de eventos, tipos de prensa, prompts IA, emisoras, clientes y usuarios. |
| **Prompts IA** | `/v1/catalogos/prompts` | Catálogo de prompts de análisis IA con filtros por ID, Tipo y Variante. |
| **Emisiones** | `/v1/emisiones/` | Parrilla de programación y detalle de emisiones. |
| **Síntesis** | `POST /v1/sintesis/generar` | Generador orquestado de reportes ejecutivos (HTML/DOCX). |

---

## 📖 Centro de Documentación

Para profundizar en el desarrollo y uso de la API, consulte los siguientes documentos:

*   🛠️ **[CONFIGURACION.md](./CONFIGURACION.md)**: Parámetros y variables de entorno.
*   🤖 **[AGENTS.md](./AGENTS.md)**: Guía de estándares para IAs y desarrolladores.
*   📘 **[GUIA_API_V2.md](./GUIA_API_V2.md)**: Guía integral de capacidades v2.2.1.
*   📘 **[ApiMedialog.txt](./ApiMedialog.txt)**: Referencia técnica compacta (zero-shot).
*   🏗️ **[ESTRUCTURA.md](./ESTRUCTURA.md)**: Detalle de Clean Architecture y flujo de datos.
*   📊 **[metricas.md](./metricas.md)**: **Fuente única de verdad** para todas las métricas de análisis IA (`sentimiento`, `relevancia`, `cobertura`, `agresividad`, `riesgo`, `viralidad`, `objetividad`, `tópico`). Lectura **obligatoria** antes de diseñar o modificar cualquier prompt de análisis.

---

**© 2026 Medialog MX** - *Líderes en Inteligencia de Medios* | **v2.2.1**