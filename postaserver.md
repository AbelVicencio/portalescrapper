# Arquitectura e Integración de Transferencia de Archivos PDF a Medialog

Este documento detalla la especificación técnica para transferir archivos PDF de manera remota al servidor real de **Medialog** (`https://www.medialog.com.mx/`), consumiendo el endpoint clásico en ASP (`CargaPDF.asp`). 

El objetivo es proveer toda la información necesaria (URL de destino, parámetros multipart, ciclo de vida de la sesión y ejemplos de código cliente) para que cualquier sistema cliente (como una extensión de Chrome/Edge o un script de automatización) pueda subir archivos de forma 100% funcional.

---

## 1. Endpoint y Conductos de Comunicación

Para subir archivos al backend de Medialog, se debe realizar una petición HTTP con las siguientes especificaciones:

*   **URL de Destino (POST Endpoint)**: 
    ```http
    https://www.medialog.com.mx/portales/CargaPDF.asp?Func=2
    ```
*   **Método**: `POST`
*   **Tipo de Codificación (Encoding Type)**: `multipart/form-data`
*   **Límites de Tamaño**:
    *   **Límite técnico en código**: **10.5 MB** (`10,500,000` bytes).
    *   *Nota*: El script ASP muestra un mensaje informando un límite de 5 MB en caso de fallo, pero la validación interna en código (`noBytes > 10500000`) permite hasta 10.5 MB.

---

## 2. Requisitos de Autenticación y Sesión (Crítico)

El backend en ASP clásico depende de variables de sesión del servidor (`Session`) para asociar la carga al cliente y usuario correctos. Específicamente, en la base de datos se insertan:
*   `session("Cliente")` (ID del cliente)
*   `session("nombreCliente")` (Nombre del cliente)
*   `session("Usuario")` (Usuario autenticado)

> [!IMPORTANT]
> **Cualquier petición POST remota debe incluir las cookies de sesión activa** (normalmente `ASPSESSIONID...`). 
> - **Desde el Navegador/Extensión**: Si el script de subida se ejecuta en el contexto del sitio o desde una extensión con permisos adecuados, asegúrate de enviar la petición utilizando `credentials: 'include'` en Fetch API o Axios.
> - **Desde Scripts Externos (Python, etc.)**: Debes capturar las cookies de inicio de sesión previamente y adjuntarlas a la petición HTTP de subida.

---

## 3. Especificación de Parámetros del Formulario (FormData)

El cuerpo de la petición `multipart/form-data` debe contener los siguientes campos para que el parser del servidor (`CargaPDF.asp`) procese y guarde la información de manera correcta:

| Nombre del Campo | Tipo de Dato | ¿Obligatorio? | Descripción |
| :--- | :--- | :---: | :--- |
| `file1` | Archivo (Binario) | **Sí** | El archivo PDF que se desea almacenar. Debe tener el encabezado `Content-Disposition` con su respectivo `filename` (ej. `filename="reporte.pdf"`). |
| `nomArchivo` | Texto (String) | **Sí** | **Nombre físico de destino**. Debe renombrarse dinámicamente con el identificador del Medialog seguido de su extensión. <br>Formato: `[IdMedialog].[extension]` (ej: `12345.pdf`). El servidor usará este nombre exacto para guardar el archivo en el disco. |
| `tamanio` | Texto (String) | **Sí** | Tamaño exacto del archivo en bytes (ej: `152340`). Se guarda en la base de datos para control de cuotas. |
| `extension` | Texto (String) | **Sí** | Extensión del archivo en minúsculas y sin punto (ej: `pdf`). |
| `texto` | Texto (String) | **Sí** | Descripción o nombre original del archivo (ej. `reporte_mensual.pdf`). Se almacena en la columna `Texto` de la tabla `DocsClientes`. |
| `cabeza` | Texto (String) | No | Identificador de cabecera en caso de aplicar. Se almacena en la columna `Cabeza`. Puede enviarse vacío (`""`). |
| `fDocumento` | Texto (String) | No | Fecha del documento. Se almacena en la columna `FechaDocumento`. Puede enviarse vacío (`""`). |

---

## 4. Comportamiento en el Servidor (Backend ASP)

Cuando `CargaPDF.asp?Func=2` recibe una petición correcta:

1. **Almacenamiento Físico**:
   El archivo binario se extrae y se guarda en la ruta física correspondiente al directorio virtual `\mediarchivos\medialogs\` con el nombre especificado en el parámetro `nomArchivo` (ej: `12345.pdf`).
   
2. **Registro en la Base de Datos**:
   Se inserta un registro en la tabla `DocsClientes` con la siguiente estructura de datos:
   - `Cliente`: ID del cliente desde `session("Cliente")`.
   - `nCliente`: Nombre del cliente desde `session("nombreCliente")`.
   - `Usuario`: Nombre del usuario desde `session("Usuario")`.
   - `Visible`: `'SI'`.
   - `Cabeza`: El valor de `ParseForm("cabeza")`.
   - `Adjunto`: El **nombre de archivo original** (ej. `reporte.pdf`) extraído de la cabecera `filename` del multipart.
   - `Extensión`: El valor de `ParseForm("extension")`.
   - `FechaDocumento`: El valor de `ParseForm("fDocumento")`.
   - `FechaCarga`: `getDate()` (Fecha y hora actual del servidor).
   - `Tamaño`: El valor de `ParseForm("tamanio")`.
   - `Virtual`: `'/mediarchivos/medialogs'`.
   - `Texto`: El valor de `ParseForm("texto")`.

---

## 5. Ejemplos de Implementación del Cliente

### A. Lado del Cliente en JavaScript (Fetch API para Navegadores/Extensiones)

```javascript
/**
 * Sube un archivo PDF al servidor real de Medialog.
 * @param {File} file - Objeto File (obtenido de un <input type="file"> o generado dinámicamente).
 * @param {string|number} idMedialog - ID de la Nota/Medialog de destino (ej: 12345).
 * @returns {Promise<{success: boolean, html: string}>}
 */
async function subirPDF(file, idMedialog) {
  const extension = file.name.split('.').pop().toLowerCase();
  const nomArchivo = `${idMedialog}.${extension}`; // Formato destino requerido por el servidor

  const formData = new FormData();
  
  // 1. Agregar el archivo binario
  formData.append('file1', file);
  
  // 2. Agregar los parámetros requeridos por el backend ASP
  formData.append('nomArchivo', nomArchivo);
  formData.append('tamanio', file.size.toString());
  formData.append('extension', extension);
  formData.append('texto', file.name); // Nombre original del archivo
  formData.append('cabeza', '');       // Puede ir vacío
  formData.append('fDocumento', '');   // Puede ir vacío

  try {
    // Petición POST al script clásico
    const response = await fetch('https://www.medialog.com.mx/portales/CargaPDF.asp?Func=2', {
      method: 'POST',
      body: formData,
      // CRÍTICO: Envía las cookies de sesión activa para que el servidor reconozca al usuario
      credentials: 'include' 
    });

    if (!response.ok) {
      throw new Error(`Error en el servidor HTTP: ${response.status}`);
    }

    const responseText = await response.text();
    
    // Analizar la respuesta HTML del servidor para comprobar si se guardó
    if (responseText.includes("archivo adjunto cargado") || responseText.includes("Guardando Adjunto")) {
      return { success: true, html: responseText };
    } else {
      return { success: false, html: responseText };
    }
  } catch (error) {
    console.error("Error en la subida:", error);
    return { success: false, error: error.message };
  }
}
```

### B. Ejemplo de Cliente en Python (Script de Automatización)

```python
import os
import requests

def subir_pdf_medialog(file_path, id_medialog, session_cookies):
    """
    Sube un archivo PDF de forma remota al servidor de Medialog usando Python.
    
    :param file_path: Ruta local del archivo PDF a subir.
    :param id_medialog: Identificador numérico del Medialog.
    :param session_cookies: Diccionario con las cookies de sesión activa (ej. {'ASPSESSIONIDXXXXXXXX': 'YYYYYYYYYYYY'})
    """
    url = "https://www.medialog.com.mx/portales/CargaPDF.asp?Func=2"
    
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)
    extension = file_name.split('.')[-1].lower()
    nom_archivo = f"{id_medialog}.{extension}"
    
    # 1. Definición del archivo binario
    files = {
        'file1': (file_name, open(file_path, 'rb'), 'application/pdf')
    }
    
    # 2. Parámetros del formulario
    data = {
        'nomArchivo': nom_archivo,
        'tamanio': str(file_size),
        'extension': extension,
        'texto': file_name,
        'cabeza': '',
        'fDocumento': ''
    }
    
    try:
        # Petición HTTP POST incluyendo las cookies de sesión
        response = requests.post(url, files=files, data=data, cookies=session_cookies)
        
        # Validar la respuesta del script ASP
        if "archivo adjunto cargado" in response.text or "Guardando Adjunto" in response.text:
            print("Carga exitosa en Medialog.")
            return True, response.text
        else:
            print("Fallo en la carga. El servidor no procesó el archivo.")
            return False, response.text
            
    except Exception as e:
        print(f"Error de conexión: {e}")
        return False, str(e)
```

---

## 6. Referencia: Servidor de Simulación (Para pruebas de integración local)

Si necesitas emular el comportamiento del backend clásico ASP en un entorno de desarrollo moderno (sin depender del servidor de producción), puedes usar este mock rápido en **Node.js/Express**:

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'mediarchivos', 'medialogs'));
  },
  filename: function (req, file, cb) {
    // El servidor ASP usa el parámetro nomArchivo para guardar físicamente en disco
    const nomArchivo = req.body.nomArchivo;
    cb(null, nomArchivo);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10.5 * 1024 * 1024 } // Límite de 10.5 MB
});

app.post('/portales/CargaPDF.asp', upload.single('file1'), (req, res) => {
  // Simular la respuesta HTML de éxito del script ASP
  const nomArchivo = req.body.nomArchivo;
  const texto = req.body.texto || (req.file ? req.file.originalname : '');
  
  res.send(`
    <html>
      <body>
        Nombre del archivo origen: <strong>${texto}</strong><br>
        Nombre del archivo destino: <strong>${nomArchivo}</strong><br>
        <strong>1 archivo adjunto cargado</strong>
      </body>
    </html>
  `);
});

app.listen(3000, () => console.log('Mock Server ASP corriendo en el puerto 3000'));
```
