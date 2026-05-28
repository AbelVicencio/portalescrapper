# Estructuración de Ligas en Medialog

Este documento detalla la forma en que se estructuran y generan las diferentes ligas utilizadas en los servicios de alertas de **Medialog** (tanto en el envío por correo como en el envío por WhatsApp), explicando con precisión sus elementos constitutivos y el origen de sus valores, especialmente el cálculo criptográfico del **Hash**.

---

## 1. Ligas de Acceso Rápido (`mx.asp`)

Estas ligas son el mecanismo principal para visualizar notas multimedia en el portal y se construyen principalmente en el flujo de envío de correos (`alertas-correo.py`).

### Estructura de la URL
```text
https://www.medialog.com.mx/mx.asp?h={hash_final}&E={empresa}&X={token}
```

### Componentes de la URL

| Parámetro | Nombre / Función | Descripción y Obtención |
| :--- | :--- | :--- |
| **`h`** | **Hash de la nota** (`hash_final`) | Identificador criptográfico único de la nota. Es un hash MD5 en minúsculas obtenido mediante base de datos o cálculo algorítmico local (ver sección detallada abajo). |
| **`E`** | **Empresa** | Identificador de empresa codificado en Base64.<br>• *Valor por defecto:* `e2ZpZG9idHQ=` (que decodifica a `{fidobtt`). |
| **`X`** | **Token** | Token de seguridad/acceso codificado en Base64.<br>• *Valor por defecto:* `VVlocG1iamVmbg==` (que decodifica a `UYhpmbjefn`). |

### ¿De dónde se obtiene y cómo se calcula el Hash (`h`)?

Existen dos vías para obtener el valor del parámetro `h`:

#### Vía A: Consulta Directa a Base de Datos (Recomendado)
Se ejecuta el procedimiento almacenado `HashMedialog` pasando como argumento el identificador numérico de la nota (`IDNota` / `Medialog`):
```sql
EXEC HashMedialog @id_nota = <IDNota>
```
Este procedimiento devuelve directamente un conjunto de datos que incluye la columna `Hash` ya calculado desde el motor de SQL Server.

#### Vía B: Cálculo Programático Local (Paridad con SQL Server)
Si la base de datos no proporciona el hash o se desea calcular localmente, se realiza un proceso de hash criptográfico que replique exactamente la función `HASHBYTES('MD5', ...)` sobre un campo `NVARCHAR` en SQL Server:

1. **Sanitización:** Se convierte el identificador numérico de la nota (`id_nota`) a cadena y se limpian los espacios en blanco de los extremos.
   ```python
   id_str = str(id_nota).strip()
   ```
2. **Codificación a UTF-16 Little Endian (LE):** Dado que SQL Server almacena los datos de tipo `NVARCHAR` como UTF-16, para lograr la coincidencia exacta de bytes que procesa `HASHBYTES`, **es mandatorio codificar la cadena usando UTF-16 LE** (2 bytes por carácter, sin BOM).
   ```python
   bytes_codificados = id_str.encode('utf-16-le')
   ```
3. **Generación del Hash MD5:** Se genera el hash MD5 a partir del arreglo de bytes y se obtiene su representación hexadecimal en minúsculas.
   ```python
   import hashlib
   hash_final = hashlib.md5(bytes_codificados).hexdigest().lower()
   ```

---

## 2. Ligas Encriptadas Alternativas (`m.asp` - LigaXT)

En el servicio de WhatsApp (`alertas-whatsapp-server.py`) y en otros flujos alternativos, se utiliza la función `ligaXT` para generar enlaces parametrizados seguros.

### Estructura de la URL
```text
https://www.medialog.com.mx/m.asp?m={medialog_encriptado}&E={empresa_encriptada}&X={token_encriptado}
```

### El Algoritmo de Encriptación y Reversa
A diferencia de `mx.asp` que usa MD5, `ligaXT` implementa un cifrado reversible personalizado:
1. **Desplazamiento de caracteres:** A cada carácter de la cadena original se le suma `1` en su valor ASCII (`ord(c) + 1`).
2. **Reversa:** Se invierte el orden de la cadena resultante.
3. **Base64:** El resultado se codifica en Base64 UTF-8.

#### Implementación en Python:
```python
def reverseString(s): 
    return "".join([s[i] for i in range(len(s)-1, -1, -1)]) if s else ''

def Encripta(cadena): 
    return reverseString("".join([chr(ord(c)+1) for c in cadena]))
```

### Parámetros Generados:
- **`m`**: El identificador de la nota (`IDNota`) encriptado y en Base64.
- **`E`**: La constante `'medialogxt'` encriptada y en Base64 (genera siempre `e2ZpZG9idHQ=`, que coincide con el valor de empresa de la liga rápida).
- **`X`**: La constante `'medialogtw'` encriptada y en Base64 (genera siempre `eF1nZGJpYmZl`, equivalente encriptado para el token de este flujo).

---

## 3. Ligas para Monitoreo de Video (`mlg.asp`)

Para servicios específicos (como el **Servicio 112**), se construye un enlace con enmascaramiento numérico.

### Estructura de la URL
```text
https://www.medialog.com.mx/mvl/mlg.asp?m={codigo_enmascarado}
```

### Lógica de Enmascaramiento:
1. **Multiplicación:** Se multiplica el ID numérico de la nota por un **Factor fijo** (por ejemplo, `331`).
2. **Padding:** Se rellena con ceros a la izquierda hasta completar 15 dígitos.
3. **Permutación de Posiciones:** Se reorganizan los dígitos de la cadena de 15 caracteres según un mapeo de índices específico:
   `nueva_cadena = digito[14] + digito[0] + digito[13] + digito[1] + digito[12] + digito[2] + ...`
4. **Sustitución de Dígitos por Letras:** Se reemplazan los dígitos por pares de letras específicos:
   - `1` $\to$ `"QW"`
   - `2` $\to$ `"ER"`
   - `3` $\to$ `"TY"`
   - `4` $\to$ `"UI"`
   - `5` $\to$ `"OP"`
   - `6` $\to$ `"AS"`
   - `7` $\to$ `"BF"`
   - `9` $\to$ `"JK"`
   - `0` $\to$ `"MD"`

---

## 4. Ligas para Notas de Prensa (`externo-nota.php`)

Para el módulo de prensa escrita, las ligas apuntan al subdominio de prensa.

### Estructura de la URL
```text
https://prensa.medialog.com.mx/externo/externo-nota.php?idN={id_base64}
```

### Componente:
- **`idN`**: Corresponde al ID numérico de la nota de prensa convertido a texto ASCII y codificado directamente en Base64 estándar.
