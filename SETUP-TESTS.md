# 🧪 Configuración de Pruebas de Appwrite

Este documento explica cómo configurar y ejecutar las pruebas automatizadas para la API de proyectos y base de datos de Appwrite.

## 📋 Requisitos Previos

### 1. Servidor Appwrite

- **Appwrite debe estar ejecutándose** en `http://localhost`
- Versión recomendada: 1.4.x o superior
- Puerto por defecto: 80 (HTTP) o 443 (HTTPS)

### 2. Configuración de Proyecto

- **Proyecto de consola** configurado en Appwrite
- **API Key** con permisos de administrador
- **Team ID** válido para crear proyectos

### 3. Base de Datos (para pruebas de DB)

- **Base de datos** creada en Appwrite
- **Colección** con los siguientes atributos:
  - `titulo` (string, required)
  - `descripcion` (string, optional)
  - `estado` (string, optional)
  - `prioridad` (string, optional)
  - `completada` (boolean, optional)
  - `progreso` (integer, optional)

## ⚙️ Configuración

### 1. Variables de Entorno

Edita el archivo `config/test.env`:

```env
# Configuración de Appwrite para pruebas
APPWRITE_ENDPOINT=http://localhost/v1
APPWRITE_PROJECT_ID=tu_project_id_aqui
APPWRITE_API_KEY=tu_api_key_aqui

# Base de datos de pruebas
TEST_DATABASE_ID=tu_database_id_aqui
TEST_COLLECTION_ID=tu_collection_id_aqui

# Configuración de pruebas
TEST_TIMEOUT=10000
TEST_CLEANUP_ENABLED=true
DEBUG_REQUESTS=false
```

### 2. Obtener IDs Necesarios

#### Project ID y API Key:

1. Ve a la consola de Appwrite
2. Selecciona tu proyecto
3. Ve a **Settings** → **API Keys**
4. Crea una nueva API key con permisos de administrador
5. Copia el Project ID y API Key

#### Database ID y Collection ID:

1. Ve a **Databases** en la consola
2. Crea una nueva base de datos (o usa una existente)
3. Copia el Database ID
4. Crea una colección con los atributos mencionados arriba
5. Copia el Collection ID

### 3. Instalar Dependencias

```bash
npm install
```

## 🚀 Ejecutar Pruebas

### Todas las Pruebas

```bash
npm test
```

### Solo Pruebas de Proyectos

```bash
npm test -- --grep "Appwrite Projects API"
```

### Solo Pruebas de Base de Datos

```bash
npm test -- --grep "Operaciones CRUD"
```

### Solo Pruebas con Mocks

```bash
npm test -- --grep "Mocks"
```

### Pruebas Específicas

```bash
# Solo creación de proyectos
npm test -- --grep "POST /v1/projects"

# Solo webhooks
npm test -- --grep "webhooks"

# Solo autorización
npm test -- --grep "Autorización"
```

### Modo Watch (desarrollo)

```bash
npm run test:watch
```

### Con Cobertura

```bash
npm run test:coverage
```

## 🐛 Debugging

### Habilitar Logs de Requests

```env
DEBUG_REQUESTS=true
```

### Aumentar Timeout

```env
TEST_TIMEOUT=30000
```

### Ver Errores Detallados

Los errores incluyen información estructurada:

```javascript
error.appwriteError = {
  status: 400,
  message: "Project name is required",
  code: "project_name_missing",
  type: "project_invalid",
};
```

## 📊 Tipos de Pruebas

### 1. Pruebas de Proyectos (HTTP API)

- ✅ **Casos de éxito**: Creación, listado, actualización, eliminación
- ❌ **Casos de error**: Validaciones, permisos, recursos no encontrados
- 🔐 **Autorización**: API keys inválidas, permisos insuficientes
- ⚡ **Rendimiento**: Operaciones concurrentes

### 2. Pruebas de Base de Datos (SDK)

- ✅ **CRUD básico**: Create, Read, Update, Delete
- ❌ **Validaciones**: Campos requeridos, tipos de datos
- 🔄 **Operaciones complejas**: Secuenciales y concurrentes

### 3. Pruebas con Mocks

- 🎭 **Simulaciones**: Respuestas controladas sin servidor real
- ⚡ **Rendimiento**: Pruebas rápidas sin dependencias externas
- 🧪 **Edge cases**: Timeouts, errores de red, respuestas lentas

## 🧹 Limpieza Automática

Las pruebas incluyen limpieza automática:

- **Proyectos** creados durante las pruebas
- **Webhooks** asociados a proyectos de prueba
- **Plataformas** asociadas a proyectos de prueba
- **Documentos** de base de datos de prueba

## ❌ Solución de Problemas

### Error 401 (Unauthorized)

```
AxiosError: Request failed with status code 401
```

**Solución**: Verifica que la API key sea válida y tenga permisos de administrador.

### Error 404 (Not Found)

```
AppwriteException: Project not found
```

**Solución**: Verifica que el Project ID sea correcto y el proyecto exista.

### Error de Atributos Desconocidos

```
AppwriteException: Invalid document structure: Unknown attribute: "titulo"
```

**Solución**: Crea la colección con los atributos requeridos (ver sección de configuración).

### Error de Conexión

```
AxiosError: connect ECONNREFUSED
```

**Solución**: Verifica que Appwrite esté ejecutándose en `http://localhost`.

### Timeout

```
Error: Timeout of 10000ms exceeded
```

**Solución**: Aumenta el timeout en `config/test.env` o verifica la velocidad del servidor.

## 📈 Resultados Esperados

### Ejecución Exitosa

```
🚀 Appwrite Projects API
  📝 POST /v1/projects - Crear Proyecto
    ✅ Debería crear un proyecto exitosamente con datos válidos
    ✅ Debería crear múltiples proyectos con diferentes escenarios
    ❌ Debería retornar 400 para datos faltantes
    ...

  42 passing (5s)
  0 failing
```

### Con Errores de Configuración

```
23 passing (4s)
23 failing
```

**Acción**: Revisa la configuración siguiendo este documento.

## 🤝 Contribuir

Para agregar nuevas pruebas:

1. **Sigue el patrón AAA** (Arrange-Act-Assert)
2. **Incluye limpieza** de recursos creados
3. **Usa helpers existentes** para generar datos
4. **Documenta casos especiales**
5. **Prueba tanto éxito como errores**

## 📞 Soporte

Si necesitas ayuda:

1. Verifica que sigas todos los pasos de configuración
2. Revisa los logs con `DEBUG_REQUESTS=true`
3. Confirma que Appwrite esté ejecutándose correctamente
4. Verifica permisos de la API key en la consola de Appwrite
