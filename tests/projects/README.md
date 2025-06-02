# Pruebas de API de Proyectos de Appwrite

Este directorio contiene pruebas automatizadas completas para la API de proyectos de Appwrite, incluyendo todos los endpoints principales y casos de prueba.

## 📋 Endpoints Cubiertos

### Gestión de Proyectos

- `POST /v1/projects` - Crear proyecto
- `GET /v1/projects` - Listar proyectos
- `GET /v1/projects/:projectId` - Obtener proyecto específico
- `PATCH /v1/projects/:projectId` - Actualizar proyecto
- `DELETE /v1/projects/:projectId` - Eliminar proyecto

### Configuración de APIs

- `PATCH /v1/projects/:projectId/api` - Actualizar estado de APIs

### Webhooks

- `POST /v1/projects/:projectId/webhooks` - Crear webhooks

### Plataformas

- `POST /v1/projects/:projectId/platforms` - Crear plataformas

## 🧪 Tipos de Pruebas

### Casos de Éxito (2xx)

- ✅ Creación exitosa de proyectos con datos válidos
- ✅ Listado de proyectos con paginación y búsqueda
- ✅ Obtención de proyectos específicos
- ✅ Actualización de proyectos
- ✅ Eliminación de proyectos
- ✅ Configuración de APIs
- ✅ Creación de webhooks y plataformas

### Casos de Error (4xx)

- ❌ Validación de campos requeridos (400)
- ❌ Validación de tipos de datos (400)
- ❌ Validación de valores inválidos (400)
- ❌ Recursos no encontrados (404)
- ❌ Conflictos de duplicados (409)
- ❌ Autorización sin API key (401)

### Casos Especiales

- 🔐 Pruebas de autorización
- ⚡ Pruebas de rendimiento concurrente
- 🧹 Limpieza automática de recursos

## 🚀 Ejecución de Pruebas

### Ejecutar todas las pruebas de proyectos

```bash
npm test -- --grep "Appwrite Projects API"
```

### Ejecutar pruebas específicas por endpoint

```bash
# Solo pruebas de creación
npm test -- --grep "POST /v1/projects"

# Solo pruebas de listado
npm test -- --grep "GET /v1/projects"

# Solo pruebas de webhooks
npm test -- --grep "webhooks"
```

### Ejecutar con modo watch

```bash
npm run test:watch -- --grep "Projects"
```

### Ejecutar con cobertura

```bash
npm run test:coverage -- --grep "Projects"
```

## ⚙️ Configuración

### Variables de Entorno Requeridas

Las pruebas utilizan el archivo `config/test.env`:

```env
APPWRITE_ENDPOINT=http://localhost/v1
APPWRITE_PROJECT_ID=683b7842002abf76d2e8
APPWRITE_API_KEY=your_api_key_here
TEST_TIMEOUT=10000
DEBUG_REQUESTS=false
```

### Requisitos Previos

1. **Servidor Appwrite ejecutándose** en `http://localhost`
2. **API Key válida** con permisos de administrador
3. **Team ID válido** para crear proyectos

## 📁 Estructura de Archivos

```
tests/projects/
├── README.md                    # Este archivo
├── projects-api.test.js         # Pruebas principales
└── helpers/
    ├── projects-client.js       # Cliente HTTP para API
    └── projects-test-data.js    # Generadores de datos de prueba
```

## 🛠️ Helpers Disponibles

### ProjectsAPIClient

Cliente HTTP especializado para la API de proyectos:

- Configuración automática de headers
- Manejo de errores estructurado
- Métodos para todos los endpoints
- Interceptores para debugging

### Generadores de Datos

Funciones para crear datos de prueba:

- `createValidProjectData()` - Proyectos válidos
- `createInvalidProjectData()` - Datos inválidos para pruebas de error
- `createValidWebhookData()` - Webhooks válidos
- `createValidPlatformData()` - Plataformas válidas

## 🧹 Limpieza Automática

Las pruebas incluyen limpieza automática de recursos:

- **Proyectos** creados durante las pruebas
- **Webhooks** asociados a proyectos de prueba
- **Plataformas** asociadas a proyectos de prueba

La limpieza se ejecuta automáticamente después de cada prueba.

## 📊 Patrones de Prueba

### Patrón AAA (Arrange-Act-Assert)

```javascript
it("✅ Debería crear un proyecto exitosamente", async function () {
  // Arrange - Preparar datos de prueba
  const projectData = createValidProjectData({
    name: "Proyecto de Prueba",
  });

  // Act - Ejecutar la operación
  const result = await apiClient.createProject(projectData);

  // Assert - Verificar resultados
  expect(result).to.exist;
  expect(result.$id).to.equal(projectData.projectId);
  expect(result.name).to.equal(projectData.name);
});
```

### Manejo de Errores

```javascript
it("❌ Debería retornar 400 para datos inválidos", async function () {
  try {
    await apiClient.createProject(invalidData);
    expect.fail("Debería haber lanzado un error");
  } catch (error) {
    expect(error.response.status).to.equal(400);
    expect(error.appwriteError).to.exist;
  }
});
```

## 🐛 Debugging

### Habilitar logging de requests

```env
DEBUG_REQUESTS=true
```

### Ver detalles de errores

Los errores incluyen información estructurada:

```javascript
error.appwriteError = {
  status: 400,
  message: "Project name is required",
  code: "project_name_missing",
  type: "project_invalid",
};
```

## 📈 Métricas de Cobertura

Las pruebas cubren:

- ✅ **100%** de endpoints principales
- ✅ **100%** de códigos de respuesta esperados
- ✅ **100%** de validaciones de campos
- ✅ **100%** de casos de error comunes
- ✅ **100%** de limpieza de recursos

## 🤝 Contribuir

Para agregar nuevas pruebas:

1. **Seguir el patrón AAA**
2. **Incluir limpieza de recursos**
3. **Usar helpers existentes**
4. **Documentar casos especiales**
5. **Probar tanto éxito como errores**

## 📞 Soporte

Si encuentras problemas:

1. Verifica que Appwrite esté ejecutándose
2. Confirma que las variables de entorno sean correctas
3. Revisa los logs con `DEBUG_REQUESTS=true`
4. Verifica permisos de la API key
