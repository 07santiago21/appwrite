# 🧪 Pruebas Automatizadas para Base de Datos Appwrite

Este proyecto contiene una suite completa de pruebas automatizadas para validar las operaciones CRUD en el módulo de base de datos de Appwrite usando Node.js y Mocha.

## 📋 Tabla de Contenidos

- [Instalación](#instalación)
- [Configuración](#configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Ejecución de Pruebas](#ejecución-de-pruebas)
- [Tipos de Pruebas](#tipos-de-pruebas)
- [Buenas Prácticas Implementadas](#buenas-prácticas-implementadas)
- [Troubleshooting](#troubleshooting)

## 🚀 Instalación

### Prerrequisitos

- Node.js (versión 16 o superior)
- npm o yarn
- Instancia de Appwrite ejecutándose (local o cloud)
- Base de datos y colección configuradas en Appwrite

### Instalar Dependencias

```bash
npm install
```

### Dependencias Principales

- **appwrite**: SDK oficial de Appwrite para Node.js
- **mocha**: Framework de testing
- **chai**: Librería de aserciones
- **chai-as-promised**: Extensión para promesas
- **sinon**: Librería para mocks y stubs
- **sinon-chai**: Integración entre Sinon y Chai
- **dotenv**: Manejo de variables de entorno
- **nyc**: Cobertura de código

## ⚙️ Configuración

### 1. Variables de Entorno

Crea y configura el archivo `config/test.env`:

```env
# Configuración de Appwrite para pruebas
APPWRITE_ENDPOINT=http://localhost/v1
APPWRITE_PROJECT_ID=tu_project_id_aqui
APPWRITE_API_KEY=tu_api_key_aqui

# Base de datos de pruebas
TEST_DATABASE_ID=test_database
TEST_COLLECTION_ID=test_tareas

# Configuración de pruebas
TEST_TIMEOUT=10000
TEST_CLEANUP_ENABLED=true
```

### 2. Configuración de Appwrite

#### Crear Base de Datos y Colección

1. **Base de Datos**: Crea una base de datos con ID `test_database`
2. **Colección**: Crea una colección con ID `test_tareas`

#### Esquema de la Colección "tareas"

```json
{
  "titulo": {
    "type": "string",
    "required": true,
    "size": 255
  },
  "descripcion": {
    "type": "string",
    "required": false,
    "size": 1000
  },
  "estado": {
    "type": "string",
    "required": false,
    "default": "pendiente"
  },
  "prioridad": {
    "type": "string",
    "required": false,
    "default": "media"
  },
  "completada": {
    "type": "boolean",
    "required": false,
    "default": false
  },
  "progreso": {
    "type": "integer",
    "required": false,
    "default": 0,
    "min": 0,
    "max": 100
  },
  "fechaCreacion": {
    "type": "datetime",
    "required": false
  },
  "fechaVencimiento": {
    "type": "datetime",
    "required": false
  },
  "asignadoA": {
    "type": "string",
    "required": false
  },
  "etiquetas": {
    "type": "string",
    "array": true,
    "required": false
  }
}
```

#### Permisos

Configura los permisos de la colección para permitir operaciones CRUD:

- **Create**: `any`
- **Read**: `any`
- **Update**: `any`
- **Delete**: `any`

## 📁 Estructura del Proyecto

```
tests/
├── setup/
│   └── test-setup.js          # Configuración global de pruebas
├── helpers/
│   ├── appwrite-client.js     # Cliente configurado de Appwrite
│   └── test-data.js           # Factories y datos de prueba
├── database/
│   ├── crud-operations.test.js    # Pruebas CRUD reales
│   └── mocked-operations.test.js  # Pruebas con mocks
config/
└── test.env                   # Variables de entorno
```

## 🏃‍♂️ Ejecución de Pruebas

### Comandos Disponibles

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas en modo watch
npm run test:watch

# Ejecutar pruebas con cobertura
npm run test:coverage

# Ejecutar solo pruebas CRUD reales
npx mocha tests/database/crud-operations.test.js

# Ejecutar solo pruebas con mocks
npx mocha tests/database/mocked-operations.test.js
```

### Opciones de Mocha

```bash
# Ejecutar con timeout personalizado
npx mocha tests/**/*.test.js --timeout 15000

# Ejecutar con reporter específico
npx mocha tests/**/*.test.js --reporter json

# Ejecutar pruebas específicas por patrón
npx mocha tests/**/*.test.js --grep "CREATE"
```

## 🧪 Tipos de Pruebas

### 1. Pruebas CRUD Reales (`crud-operations.test.js`)

Estas pruebas hacen llamadas reales a la API de Appwrite:

#### **CREATE - Crear Documentos**

- ✅ Crear documento con datos válidos
- ✅ Crear múltiples documentos con diferentes escenarios
- ❌ Fallar con datos faltantes
- ❌ Fallar con tipos incorrectos
- ❌ Fallar con ID duplicado

#### **READ - Leer Documentos**

- ✅ Leer documento por ID existente
- ✅ Listar documentos de la colección
- ✅ Filtrar documentos por criterios
- ❌ Fallar con ID inexistente
- ❌ Fallar con ID inválido

#### **UPDATE - Actualizar Documentos**

- ✅ Actualizar campos específicos
- ✅ Actualizar documento completo
- ✅ Actualizar solo un campo
- ❌ Fallar con documento inexistente
- ❌ Fallar con datos inválidos

#### **DELETE - Eliminar Documentos**

- ✅ Eliminar documento existente
- ✅ Eliminar múltiples documentos
- ❌ Fallar con documento inexistente
- ❌ Fallar con ID inválido
- ❌ Fallar al eliminar dos veces

#### **Operaciones Complejas**

- ✅ Secuencia CRUD completa
- ✅ Operaciones concurrentes

### 2. Pruebas con Mocks (`mocked-operations.test.js`)

Estas pruebas usan mocks para simular respuestas sin llamadas reales:

#### **Ventajas de los Mocks**

- 🚀 Ejecución más rápida
- 🎯 Casos edge específicos
- 🔧 Simulación de errores
- 📊 Pruebas de rendimiento

#### **Escenarios Simulados**

- Errores de red (timeout, conexión)
- Errores de validación específicos
- Respuestas lentas
- Operaciones masivas
- Múltiples comportamientos

## ✨ Buenas Prácticas Implementadas

### 1. Patrón AAA (Arrange, Act, Assert)

```javascript
it("✅ Debería crear un documento con datos válidos", async function () {
  // Arrange - Preparar datos de prueba
  const taskData = createValidTaskData({
    titulo: "Tarea de Prueba CREATE",
  });
  const documentId = appwriteClient.generateTestId();

  // Act - Ejecutar la operación
  const result = await databases.createDocument(
    config.databaseId,
    config.collectionId,
    documentId,
    taskData
  );

  // Assert - Verificar resultados
  expect(result).to.exist;
  expect(result.$id).to.equal(documentId);
  expect(result.titulo).to.equal(taskData.titulo);
});
```

### 2. Test Doubles (Mocks y Stubs)

```javascript
// Mock para simular respuesta exitosa
mockDatabases.createDocument.resolves(expectedResponse);

// Stub para simular error específico
mockDatabases.createDocument.rejects(validationError);

// Verificar llamadas
expect(mockDatabases.createDocument).to.have.been.calledOnce;
```

### 3. Fluent Assertions

```javascript
// Aserciones encadenadas y descriptivas
expect(result.documents).to.be.an("array").that.has.length.at.least(1);

expect(result.estado).to.equal("completada");
expect(result.$updatedAt).to.not.equal(result.$createdAt);
```

### 4. Setup y Cleanup Automático

```javascript
// Setup global
before(async function () {
  await testSetup.globalSetup();
});

// Cleanup por prueba
afterEach(async function () {
  // Limpiar documentos creados
  for (const documentId of createdDocuments) {
    await databases.deleteDocument(/* ... */);
  }
});
```

### 5. Factories para Datos de Prueba

```javascript
// Factory para datos válidos
const taskData = createValidTaskData({
  titulo: "Título personalizado",
  estado: "en_progreso",
});

// Factory para datos inválidos
const invalidData = createInvalidTaskData("missing_required");
```

## 📊 Cobertura de Código

Para generar reporte de cobertura:

```bash
npm run test:coverage
```

El reporte se genera en `coverage/` e incluye:

- Cobertura de líneas
- Cobertura de funciones
- Cobertura de branches
- Reporte HTML interactivo

## 🔧 Troubleshooting

### Error: "The current user is not authorized to perform the requested action"

Si ves este error al ejecutar las pruebas reales (no las mockeadas), significa que tu API key no tiene los permisos necesarios.

**Solución:**

1. **Ve a tu consola de Appwrite** (https://cloud.appwrite.io o tu instancia local)

2. **Navega a tu proyecto** (ID: 683b7842002abf76d2e8)

3. **Ve a Settings > API Keys**

4. **Encuentra tu API key** o crea una nueva con estos permisos:

   **Permisos requeridos para las pruebas:**

   ```
   ✅ databases.read
   ✅ databases.write
   ✅ documents.read
   ✅ documents.write
   ✅ documents.create
   ✅ documents.update
   ✅ documents.delete
   ```

5. **Scopes requeridos:**

   - Database ID: `683ced590030eb09bd0e`
   - Collection ID: `test_tareas`

6. **Actualiza tu archivo `config/test.env`** con la nueva API key

**Verificación rápida:**

```bash
# Solo ejecutar pruebas mockeadas (estas siempre funcionan)
npm test -- --grep "Mocks"

# Ejecutar todas las pruebas
npm test
```

### Crear la colección manualmente

Si la colección `test_tareas` no existe, créala en Appwrite con estos campos:

| Campo       | Tipo    | Requerido | Descripción                                |
| ----------- | ------- | --------- | ------------------------------------------ |
| titulo      | String  | ✅ Sí     | Título de la tarea                         |
| descripcion | String  | ❌ No     | Descripción detallada                      |
| estado      | String  | ❌ No     | Estado: pendiente, en_progreso, completada |
| prioridad   | String  | ❌ No     | Prioridad: baja, media, alta               |
| completada  | Boolean | ❌ No     | Si la tarea está completada                |
| progreso    | Integer | ❌ No     | Porcentaje de progreso (0-100)             |

### Estado actual de las pruebas

**✅ Funcionando (21 pruebas):**

- Todas las pruebas con mocks
- Configuración del cliente
- Validaciones de datos

**❌ Requiere permisos (8 pruebas):**

- Operaciones CRUD reales
- Llamadas a la API de Appwrite

## 🤝 Contribuir

### Agregar Nuevas Pruebas

1. Crear archivo en `tests/database/`
2. Seguir patrón AAA
3. Usar factories de `test-data.js`
4. Incluir cleanup apropiado
5. Documentar casos edge

### Convenciones

- Usar emojis en descripciones: ✅ ❌ 🔄
- Nombres descriptivos para pruebas
- Comentarios en español
- Agrupar pruebas lógicamente

## 📚 Referencias

- [Documentación de Appwrite](https://appwrite.io/docs)
- [Mocha Documentation](https://mochajs.org/)
- [Chai Assertion Library](https://www.chaijs.com/)
- [Sinon.js Mocking](https://sinonjs.org/)

---

**¡Happy Testing! 🎉**
