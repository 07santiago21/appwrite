/**
 * Pruebas para la API de Proyectos de Appwrite
 *
 * Este archivo contiene pruebas automatizadas para validar todos los endpoints
 * de la API de proyectos usando el patrón AAA (Arrange-Act-Assert).
 */

const ProjectsAPIClient = require("../helpers/projects-client");
const {
  createValidProjectData,
  createInvalidProjectData,
  createProjectUpdateData,
  createValidWebhookData,
  createInvalidWebhookData,
  createValidPlatformData,
  createInvalidPlatformData,
  createAPIConfigData,
  projectTestScenarios,
  webhookTestScenarios,
  platformTestScenarios,
  nonExistentIds,
} = require("../helpers/projects-test-data");

describe("🚀 Appwrite Projects API", function () {
  let apiClient;
  let createdProjects = [];
  let createdWebhooks = [];
  let createdPlatforms = [];

  // Configuración antes de todas las pruebas del suite
  before(function () {
    apiClient = new ProjectsAPIClient();
    console.log("🔧 Cliente API configurado:", apiClient.getConfig());
  });

  // Limpieza después de cada prueba individual
  afterEach(async function () {
    // Limpiar webhooks creados
    for (const { projectId, webhookId } of createdWebhooks) {
      try {
        await apiClient.client.delete(
          `/projects/${projectId}/webhooks/${webhookId}`
        );
      } catch (error) {
        // Ignorar errores si el webhook ya fue eliminado
        if (error.response?.status !== 404) {
          console.warn(
            `⚠️  Error limpiando webhook ${webhookId}:`,
            error.message
          );
        }
      }
    }

    // Limpiar plataformas creadas
    for (const { projectId, platformId } of createdPlatforms) {
      try {
        await apiClient.client.delete(
          `/projects/${projectId}/platforms/${platformId}`
        );
      } catch (error) {
        // Ignorar errores si la plataforma ya fue eliminada
        if (error.response?.status !== 404) {
          console.warn(
            `⚠️  Error limpiando plataforma ${platformId}:`,
            error.message
          );
        }
      }
    }

    // Limpiar proyectos creados
    for (const projectId of createdProjects) {
      try {
        await apiClient.deleteProject(projectId);
      } catch (error) {
        // Ignorar errores si el proyecto ya fue eliminado
        if (error.response?.status !== 404) {
          console.warn(
            `⚠️  Error limpiando proyecto ${projectId}:`,
            error.message
          );
        }
      }
    }

    // Resetear arrays
    createdProjects = [];
    createdWebhooks = [];
    createdPlatforms = [];
  });

  describe("📝 POST /v1/projects - Crear Proyecto", function () {
    it("✅ Debería crear un proyecto exitosamente con datos válidos", async function () {
      // Arrange - Preparar datos de prueba
      const projectData = createValidProjectData({
        name: "Proyecto de Prueba CREATE",
        description: "Proyecto creado durante las pruebas automatizadas",
      });

      // Act - Ejecutar la operación
      const result = await apiClient.createProject(projectData);

      // Assert - Verificar resultados
      expect(result).to.exist;
      expect(result.$id).to.equal(projectData.projectId);
      expect(result.name).to.equal(projectData.name);
      expect(result.description).to.equal(projectData.description);
      expect(result.teamId).to.equal(projectData.teamId);
      expect(result.region).to.equal(projectData.region);
      expect(result.$createdAt).to.exist;
      expect(result.$updatedAt).to.exist;

      // Registrar para limpieza
      createdProjects.push(result.$id);
    });

    it("✅ Debería crear múltiples proyectos con diferentes escenarios", async function () {
      const scenarios = Object.entries(projectTestScenarios);
      const createdIds = [];

      for (const [scenarioName, scenarioData] of scenarios) {
        // Arrange
        const projectData = createValidProjectData(scenarioData);

        // Act
        const result = await apiClient.createProject(projectData);

        // Assert
        expect(result.$id).to.equal(projectData.projectId);
        expect(result.name).to.equal(projectData.name);

        createdIds.push(result.$id);
      }

      // Verificar que se crearon todos los proyectos
      expect(createdIds).to.have.length(scenarios.length);
      createdProjects.push(...createdIds);
    });

    it("❌ Debería retornar 400 para datos faltantes", async function () {
      // Arrange
      const invalidData = createInvalidProjectData("missing_required");

      // Act & Assert
      try {
        await apiClient.createProject(invalidData);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.appwriteError).to.exist;
      }
    });

    it("❌ Debería retornar 400 para tipos de datos incorrectos", async function () {
      // Arrange
      const invalidData = createInvalidProjectData("invalid_types");

      // Act & Assert
      try {
        await apiClient.createProject(invalidData);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.appwriteError).to.exist;
      }
    });

    it("❌ Debería retornar 400 para valores inválidos", async function () {
      // Arrange
      const invalidData = createInvalidProjectData("invalid_values");

      // Act & Assert
      try {
        await apiClient.createProject(invalidData);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.appwriteError).to.exist;
      }
    });

    it("❌ Debería retornar 400 para ID de proyecto reservado", async function () {
      // Arrange
      const invalidData = createInvalidProjectData("invalid_project_id");

      // Act & Assert
      try {
        await apiClient.createProject(invalidData);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.appwriteError).to.exist;
      }
    });

    it("❌ Debería retornar 409 para ID de proyecto duplicado", async function () {
      // Arrange
      const projectData = createValidProjectData();

      // Crear primer proyecto
      const firstProject = await apiClient.createProject(projectData);
      createdProjects.push(firstProject.$id);

      // Act & Assert - Intentar crear proyecto con mismo ID
      try {
        await apiClient.createProject({
          ...projectData,
          name: "Proyecto Duplicado",
        });
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(409);
        expect(error.appwriteError).to.exist;
      }
    });
  });

  describe("📖 GET /v1/projects - Listar Proyectos", function () {
    let testProjects = [];

    beforeEach(async function () {
      // Crear algunos proyectos de prueba para cada test de listado
      const projectsData = [
        createValidProjectData({ name: "Proyecto Lista 1" }),
        createValidProjectData({ name: "Proyecto Lista 2" }),
        createValidProjectData({ name: "Proyecto Lista 3" }),
      ];

      for (const projectData of projectsData) {
        const project = await apiClient.createProject(projectData);
        testProjects.push(project);
        createdProjects.push(project.$id);
      }
    });

    afterEach(function () {
      testProjects = [];
    });

    it("✅ Debería listar proyectos exitosamente", async function () {
      // Act
      const result = await apiClient.listProjects();

      // Assert
      expect(result).to.exist;
      expect(result.projects).to.be.an("array");
      expect(result.total).to.be.a("number");
      expect(result.projects.length).to.be.at.least(testProjects.length);

      // Verificar que nuestros proyectos de prueba están en la lista
      const projectIds = result.projects.map((p) => p.$id);
      for (const testProject of testProjects) {
        expect(projectIds).to.include(testProject.$id);
      }
    });

    it("✅ Debería soportar búsqueda por nombre", async function () {
      // Arrange
      const searchTerm = "Lista 1";

      // Act
      const result = await apiClient.listProjects({ search: searchTerm });

      // Assert
      expect(result).to.exist;
      expect(result.projects).to.be.an("array");

      // Verificar que los resultados contienen el término de búsqueda
      const foundProject = result.projects.find((p) =>
        p.name.includes(searchTerm)
      );
      expect(foundProject).to.exist;
    });

    it("✅ Debería soportar paginación con límite", async function () {
      // Arrange
      const limit = 2;

      // Act
      const result = await apiClient.listProjects({
        queries: [`limit(${limit})`],
      });

      // Assert
      expect(result).to.exist;
      expect(result.projects).to.be.an("array");
      expect(result.projects.length).to.be.at.most(limit);
    });
  });

  describe("📖 GET /v1/projects/:projectId - Obtener Proyecto Específico", function () {
    let testProject;

    beforeEach(async function () {
      // Crear proyecto de prueba para cada test de obtención
      const projectData = createValidProjectData({
        name: "Proyecto para Obtener",
        description:
          "Este proyecto se usa para probar operaciones de obtención",
      });
      testProject = await apiClient.createProject(projectData);
      createdProjects.push(testProject.$id);
    });

    it("✅ Debería obtener un proyecto por ID existente", async function () {
      // Act
      const result = await apiClient.getProject(testProject.$id);

      // Assert
      expect(result).to.exist;
      expect(result.$id).to.equal(testProject.$id);
      expect(result.name).to.equal(testProject.name);
      expect(result.description).to.equal(testProject.description);
      expect(result.teamId).to.equal(testProject.teamId);
      expect(result.$createdAt).to.exist;
      expect(result.$updatedAt).to.exist;
    });

    it("❌ Debería retornar 404 para proyecto inexistente", async function () {
      // Arrange
      const nonExistentId = nonExistentIds[0];

      // Act & Assert
      try {
        await apiClient.getProject(nonExistentId);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(404);
        expect(error.appwriteError).to.exist;
      }
    });

    it("❌ Debería retornar 400 para ID inválido", async function () {
      // Arrange
      const invalidId = "id_invalido_123";

      // Act & Assert
      try {
        await apiClient.getProject(invalidId);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.be.oneOf([400, 404]);
        expect(error.appwriteError).to.exist;
      }
    });
  });

  describe("🔄 PATCH /v1/projects/:projectId - Actualizar Proyecto", function () {
    let testProject;

    beforeEach(async function () {
      // Crear proyecto de prueba para cada test de actualización
      const projectData = createValidProjectData({
        name: "Proyecto para Actualizar",
        description:
          "Este proyecto se usa para probar operaciones de actualización",
      });
      testProject = await apiClient.createProject(projectData);
      createdProjects.push(testProject.$id);
    });

    it("✅ Debería actualizar un proyecto exitosamente", async function () {
      // Arrange
      const updateData = createProjectUpdateData({
        name: "Proyecto Actualizado",
        description: "Descripción actualizada durante las pruebas",
      });

      // Act
      const result = await apiClient.updateProject(testProject.$id, updateData);

      // Assert
      expect(result).to.exist;
      expect(result.$id).to.equal(testProject.$id);
      expect(result.name).to.equal(updateData.name);
      expect(result.description).to.equal(updateData.description);
      expect(result.$updatedAt).to.not.equal(testProject.$updatedAt);
    });

    it("✅ Debería actualizar campos individuales", async function () {
      // Arrange
      const updateData = { name: "Solo Nombre Actualizado" };

      // Act
      const result = await apiClient.updateProject(testProject.$id, updateData);

      // Assert
      expect(result).to.exist;
      expect(result.name).to.equal(updateData.name);
      expect(result.description).to.equal(testProject.description); // No debería cambiar
    });

    it("❌ Debería retornar 404 para proyecto inexistente", async function () {
      // Arrange
      const nonExistentId = nonExistentIds[0];
      const updateData = createProjectUpdateData();

      // Act & Assert
      try {
        await apiClient.updateProject(nonExistentId, updateData);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(404);
        expect(error.appwriteError).to.exist;
      }
    });

    it("❌ Debería retornar 400 para datos inválidos", async function () {
      // Arrange
      const invalidData = {
        name: "", // Nombre vacío
        url: "url_invalida",
      };

      // Act & Assert
      try {
        await apiClient.updateProject(testProject.$id, invalidData);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.appwriteError).to.exist;
      }
    });
  });

  describe("🗑️  DELETE /v1/projects/:projectId - Eliminar Proyecto", function () {
    let testProject;

    beforeEach(async function () {
      // Crear proyecto de prueba para cada test de eliminación
      const projectData = createValidProjectData({
        name: "Proyecto para Eliminar",
        description:
          "Este proyecto se usa para probar operaciones de eliminación",
      });
      testProject = await apiClient.createProject(projectData);
      // No agregamos a createdProjects porque lo eliminaremos manualmente
    });

    it("✅ Debería eliminar un proyecto exitosamente", async function () {
      // Act
      const result = await apiClient.deleteProject(testProject.$id);

      // Assert
      expect(result).to.be.true;

      // Verificar que el proyecto ya no existe
      try {
        await apiClient.getProject(testProject.$id);
        expect.fail("El proyecto debería haber sido eliminado");
      } catch (error) {
        expect(error.response.status).to.equal(404);
      }
    });

    it("❌ Debería retornar 404 para proyecto inexistente", async function () {
      // Arrange
      const nonExistentId = nonExistentIds[0];

      // Act & Assert
      try {
        await apiClient.deleteProject(nonExistentId);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(404);
        expect(error.appwriteError).to.exist;
      }
    });

    afterEach(async function () {
      // Limpiar el proyecto de prueba si aún existe
      try {
        await apiClient.deleteProject(testProject.$id);
      } catch (error) {
        // Ignorar errores si ya fue eliminado
      }
    });
  });

  describe("🔧 PATCH /v1/projects/:projectId/api - Actualizar Estado de APIs", function () {
    let testProject;

    beforeEach(async function () {
      // Crear proyecto de prueba para cada test de API
      const projectData = createValidProjectData({
        name: "Proyecto para APIs",
        description: "Este proyecto se usa para probar configuración de APIs",
      });
      testProject = await apiClient.createProject(projectData);
      createdProjects.push(testProject.$id);
    });

    it("✅ Debería actualizar configuración de API exitosamente", async function () {
      // Arrange
      const apiConfig = createAPIConfigData({
        api: "account",
        status: false,
      });

      // Act
      const result = await apiClient.updateProjectAPI(
        testProject.$id,
        apiConfig
      );

      // Assert
      expect(result).to.exist;
      expect(result.$id).to.equal(testProject.$id);
      // Verificar que la configuración se aplicó
      expect(result.services).to.exist;
    });

    it("✅ Debería habilitar múltiples APIs", async function () {
      // Arrange
      const apis = ["account", "databases", "storage"];

      // Act & Assert
      for (const api of apis) {
        const apiConfig = createAPIConfigData({ api, status: true });
        const result = await apiClient.updateProjectAPI(
          testProject.$id,
          apiConfig
        );
        expect(result).to.exist;
        expect(result.$id).to.equal(testProject.$id);
      }
    });

    it("❌ Debería retornar 404 para proyecto inexistente", async function () {
      // Arrange
      const nonExistentId = nonExistentIds[0];
      const apiConfig = createAPIConfigData();

      // Act & Assert
      try {
        await apiClient.updateProjectAPI(nonExistentId, apiConfig);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(404);
        expect(error.appwriteError).to.exist;
      }
    });

    it("❌ Debería retornar 400 para configuración inválida", async function () {
      // Arrange
      const invalidConfig = {
        api: "api_inexistente",
        status: "not_boolean",
      };

      // Act & Assert
      try {
        await apiClient.updateProjectAPI(testProject.$id, invalidConfig);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.appwriteError).to.exist;
      }
    });
  });

  describe("🪝 POST /v1/projects/:projectId/webhooks - Crear Webhooks", function () {
    let testProject;

    beforeEach(async function () {
      // Crear proyecto de prueba para cada test de webhook
      const projectData = createValidProjectData({
        name: "Proyecto para Webhooks",
        description: "Este proyecto se usa para probar webhooks",
      });
      testProject = await apiClient.createProject(projectData);
      createdProjects.push(testProject.$id);
    });

    it("✅ Debería crear un webhook exitosamente", async function () {
      // Arrange
      const webhookData = createValidWebhookData({
        name: "Webhook de Prueba",
        url: "https://test-webhook.example.com/endpoint",
      });

      // Act
      const result = await apiClient.createWebhook(
        testProject.$id,
        webhookData
      );

      // Assert
      expect(result).to.exist;
      expect(result.$id).to.exist;
      expect(result.name).to.equal(webhookData.name);
      expect(result.url).to.equal(webhookData.url);
      expect(result.events).to.deep.equal(webhookData.events);
      expect(result.enabled).to.equal(webhookData.enabled);
      expect(result.projectId).to.equal(testProject.$id);

      // Registrar para limpieza
      createdWebhooks.push({
        projectId: testProject.$id,
        webhookId: result.$id,
      });
    });

    it("✅ Debería crear múltiples webhooks con diferentes configuraciones", async function () {
      const scenarios = Object.entries(webhookTestScenarios);
      const createdWebhookIds = [];

      for (const [scenarioName, scenarioData] of scenarios) {
        // Arrange
        const webhookData = createValidWebhookData(scenarioData);

        // Act
        const result = await apiClient.createWebhook(
          testProject.$id,
          webhookData
        );

        // Assert
        expect(result.$id).to.exist;
        expect(result.name).to.equal(webhookData.name);

        createdWebhookIds.push(result.$id);
        createdWebhooks.push({
          projectId: testProject.$id,
          webhookId: result.$id,
        });
      }

      // Verificar que se crearon todos los webhooks
      expect(createdWebhookIds).to.have.length(scenarios.length);
    });

    it("❌ Debería retornar 404 para proyecto inexistente", async function () {
      // Arrange
      const nonExistentId = nonExistentIds[0];
      const webhookData = createValidWebhookData();

      // Act & Assert
      try {
        await apiClient.createWebhook(nonExistentId, webhookData);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(404);
        expect(error.appwriteError).to.exist;
      }
    });

    it("❌ Debería retornar 400 para datos de webhook inválidos", async function () {
      // Arrange
      const invalidData = createInvalidWebhookData("missing_required");

      // Act & Assert
      try {
        await apiClient.createWebhook(testProject.$id, invalidData);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.appwriteError).to.exist;
      }
    });

    it("❌ Debería retornar 400 para URL de webhook inválida", async function () {
      // Arrange
      const invalidData = createInvalidWebhookData("invalid_values");

      // Act & Assert
      try {
        await apiClient.createWebhook(testProject.$id, invalidData);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.appwriteError).to.exist;
      }
    });
  });

  describe("📱 POST /v1/projects/:projectId/platforms - Crear Plataformas", function () {
    let testProject;

    beforeEach(async function () {
      // Crear proyecto de prueba para cada test de plataforma
      const projectData = createValidProjectData({
        name: "Proyecto para Plataformas",
        description: "Este proyecto se usa para probar plataformas",
      });
      testProject = await apiClient.createProject(projectData);
      createdProjects.push(testProject.$id);
    });

    it("✅ Debería crear una plataforma web exitosamente", async function () {
      // Arrange
      const platformData = createValidPlatformData({
        type: "web",
        name: "Aplicación Web de Prueba",
        hostname: "test-app.example.com",
      });

      // Act
      const result = await apiClient.createPlatform(
        testProject.$id,
        platformData
      );

      // Assert
      expect(result).to.exist;
      expect(result.$id).to.exist;
      expect(result.name).to.equal(platformData.name);
      expect(result.type).to.equal(platformData.type);
      expect(result.hostname).to.equal(platformData.hostname);

      // Registrar para limpieza
      createdPlatforms.push({
        projectId: testProject.$id,
        platformId: result.$id,
      });
    });

    it("✅ Debería crear múltiples plataformas de diferentes tipos", async function () {
      const scenarios = Object.entries(platformTestScenarios);
      const createdPlatformIds = [];

      for (const [scenarioName, scenarioData] of scenarios) {
        // Arrange
        const platformData = createValidPlatformData(scenarioData);

        // Act
        const result = await apiClient.createPlatform(
          testProject.$id,
          platformData
        );

        // Assert
        expect(result.$id).to.exist;
        expect(result.name).to.equal(platformData.name);
        expect(result.type).to.equal(platformData.type);

        createdPlatformIds.push(result.$id);
        createdPlatforms.push({
          projectId: testProject.$id,
          platformId: result.$id,
        });
      }

      // Verificar que se crearon todas las plataformas
      expect(createdPlatformIds).to.have.length(scenarios.length);
    });

    it("❌ Debería retornar 404 para proyecto inexistente", async function () {
      // Arrange
      const nonExistentId = nonExistentIds[0];
      const platformData = createValidPlatformData();

      // Act & Assert
      try {
        await apiClient.createPlatform(nonExistentId, platformData);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(404);
        expect(error.appwriteError).to.exist;
      }
    });

    it("❌ Debería retornar 400 para datos de plataforma inválidos", async function () {
      // Arrange
      const invalidData = createInvalidPlatformData("missing_required");

      // Act & Assert
      try {
        await apiClient.createPlatform(testProject.$id, invalidData);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.appwriteError).to.exist;
      }
    });

    it("❌ Debería retornar 400 para tipo de plataforma inválido", async function () {
      // Arrange
      const invalidData = createInvalidPlatformData("invalid_values");

      // Act & Assert
      try {
        await apiClient.createPlatform(testProject.$id, invalidData);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.appwriteError).to.exist;
      }
    });
  });

  describe("🔐 Pruebas de Autorización", function () {
    it("❌ Debería retornar 401 sin API key", async function () {
      // Arrange
      const unauthorizedClient = new ProjectsAPIClient();
      unauthorizedClient.client.defaults.headers["X-Appwrite-Key"] = "";

      const projectData = createValidProjectData();

      // Act & Assert
      try {
        await unauthorizedClient.createProject(projectData);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(401);
        expect(error.appwriteError).to.exist;
      }
    });

    it("❌ Debería retornar 401 con API key inválida", async function () {
      // Arrange
      const unauthorizedClient = new ProjectsAPIClient();
      unauthorizedClient.client.defaults.headers["X-Appwrite-Key"] =
        "invalid_key";

      const projectData = createValidProjectData();

      // Act & Assert
      try {
        await unauthorizedClient.createProject(projectData);
        expect.fail("Debería haber lanzado un error");
      } catch (error) {
        expect(error.response.status).to.equal(401);
        expect(error.appwriteError).to.exist;
      }
    });
  });

  describe("⚡ Pruebas de Rendimiento", function () {
    it("✅ Debería manejar múltiples operaciones concurrentes", async function () {
      this.timeout(30000); // Aumentar timeout para pruebas de rendimiento

      // Arrange
      const projectsData = Array.from({ length: 3 }, (_, index) =>
        createValidProjectData({
          name: `Proyecto Concurrente ${index + 1}`,
        })
      );

      // Act - Crear proyectos concurrentemente
      const createPromises = projectsData.map((data) =>
        apiClient.createProject(data)
      );
      const results = await Promise.all(createPromises);

      // Assert
      expect(results).to.have.length(projectsData.length);
      results.forEach((result, index) => {
        expect(result.$id).to.equal(projectsData[index].projectId);
        expect(result.name).to.equal(projectsData[index].name);
        createdProjects.push(result.$id);
      });

      // Act - Obtener proyectos concurrentemente
      const getPromises = results.map((result) =>
        apiClient.getProject(result.$id)
      );
      const getResults = await Promise.all(getPromises);

      // Assert
      expect(getResults).to.have.length(results.length);
      getResults.forEach((result, index) => {
        expect(result.$id).to.equal(results[index].$id);
      });
    });
  });
});
