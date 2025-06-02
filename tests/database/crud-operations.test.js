/**
 * Pruebas CRUD para el módulo de base de datos de Appwrite
 *
 * Este archivo contiene pruebas automatizadas para validar las operaciones
 * Create, Read, Update y Delete en una colección de tareas usando el SDK de Appwrite.
 */

const testSetup = require("../setup/test-setup");
const {
  createValidTaskData,
  createInvalidTaskData,
  createUpdateData,
  testScenarios,
  nonExistentIds,
} = require("../helpers/test-data");

describe("🗄️  Operaciones CRUD - Base de Datos Appwrite", function () {
  let appwriteClient;
  let databases;
  let config;
  let createdDocuments = [];

  // Configuración antes de todas las pruebas del suite
  before(function () {
    appwriteClient = testSetup.getAppwriteClient();
    databases = appwriteClient.getDatabases();
    config = appwriteClient.getConfig();
  });

  // Limpieza después de cada prueba individual
  afterEach(async function () {
    // Limpiar documentos creados en la prueba actual
    for (const documentId of createdDocuments) {
      try {
        await databases.deleteDocument(
          config.databaseId,
          config.collectionId,
          documentId
        );
      } catch (error) {
        // Ignorar errores si el documento ya fue eliminado
        if (error.code !== 404) {
          console.warn(
            `⚠️  Error limpiando documento ${documentId}:`,
            error.message
          );
        }
      }
    }
    createdDocuments = [];
  });

  describe("📝 CREATE - Crear Documentos", function () {
    it("✅ Debería crear un documento con datos válidos", async function () {
      // Arrange - Preparar datos de prueba
      const taskData = createValidTaskData({
        titulo: "Tarea de Prueba CREATE",
        descripcion: "Esta tarea fue creada durante las pruebas automatizadas",
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
      expect(result.descripcion).to.equal(taskData.descripcion);
      expect(result.estado).to.equal(taskData.estado);
      expect(result.completada).to.equal(taskData.completada);
      expect(result.$createdAt).to.exist;
      expect(result.$updatedAt).to.exist;

      // Registrar para limpieza
      createdDocuments.push(documentId);
    });

    it("✅ Debería crear múltiples documentos con diferentes escenarios", async function () {
      const scenarios = Object.entries(testScenarios);
      const createdIds = [];

      for (const [scenarioName, scenarioData] of scenarios) {
        // Arrange
        const documentId = appwriteClient.generateTestId();
        const taskData = createValidTaskData(scenarioData);

        // Act
        const result = await databases.createDocument(
          config.databaseId,
          config.collectionId,
          documentId,
          taskData
        );

        // Assert
        expect(result.$id).to.equal(documentId);
        expect(result.titulo).to.equal(taskData.titulo);

        createdIds.push(documentId);
      }

      // Verificar que se crearon todos los documentos
      expect(createdIds).to.have.length(scenarios.length);
      createdDocuments.push(...createdIds);
    });

    it("❌ Debería fallar al crear documento con datos faltantes", async function () {
      // Arrange
      const invalidData = createInvalidTaskData("missing_required");
      const documentId = appwriteClient.generateTestId();

      // Act & Assert
      await expect(
        databases.createDocument(
          config.databaseId,
          config.collectionId,
          documentId,
          invalidData
        )
      ).to.be.rejected;
    });

    it("❌ Debería fallar al crear documento con tipos de datos incorrectos", async function () {
      // Arrange
      const invalidData = createInvalidTaskData("invalid_types");
      const documentId = appwriteClient.generateTestId();

      // Act & Assert
      await expect(
        databases.createDocument(
          config.databaseId,
          config.collectionId,
          documentId,
          invalidData
        )
      ).to.be.rejected;
    });

    it("❌ Debería fallar al crear documento con ID duplicado", async function () {
      // Arrange
      const taskData = createValidTaskData();
      const documentId = appwriteClient.generateTestId();

      // Crear primer documento
      await databases.createDocument(
        config.databaseId,
        config.collectionId,
        documentId,
        taskData
      );
      createdDocuments.push(documentId);

      // Act & Assert - Intentar crear documento con mismo ID
      await expect(
        databases.createDocument(
          config.databaseId,
          config.collectionId,
          documentId,
          createValidTaskData({ titulo: "Documento Duplicado" })
        )
      ).to.be.rejected;
    });
  });

  describe("📖 READ - Leer Documentos", function () {
    let testDocumentId;
    let testDocumentData;

    beforeEach(async function () {
      // Crear documento de prueba para cada test de lectura
      testDocumentData = createValidTaskData({
        titulo: "Documento para Lectura",
        descripcion: "Este documento se usa para probar operaciones de lectura",
      });
      testDocumentId = appwriteClient.generateTestId();

      await databases.createDocument(
        config.databaseId,
        config.collectionId,
        testDocumentId,
        testDocumentData
      );
      createdDocuments.push(testDocumentId);
    });

    it("✅ Debería leer un documento por ID existente", async function () {
      // Act
      const result = await databases.getDocument(
        config.databaseId,
        config.collectionId,
        testDocumentId
      );

      // Assert
      expect(result).to.exist;
      expect(result.$id).to.equal(testDocumentId);
      expect(result.titulo).to.equal(testDocumentData.titulo);
      expect(result.descripcion).to.equal(testDocumentData.descripcion);
      expect(result.estado).to.equal(testDocumentData.estado);
      expect(result.$createdAt).to.exist;
      expect(result.$updatedAt).to.exist;
    });

    it("✅ Debería listar documentos de la colección", async function () {
      // Act
      const result = await databases.listDocuments(
        config.databaseId,
        config.collectionId
      );

      // Assert
      expect(result).to.exist;
      expect(result.documents).to.be.an("array");
      expect(result.total).to.be.a("number");
      expect(result.total).to.be.at.least(1);

      // Verificar que nuestro documento está en la lista
      const foundDocument = result.documents.find(
        (doc) => doc.$id === testDocumentId
      );
      expect(foundDocument).to.exist;
      expect(foundDocument.titulo).to.equal(testDocumentData.titulo);
    });

    it("✅ Debería filtrar documentos por criterios específicos", async function () {
      // Arrange - Crear documento adicional con estado diferente
      const additionalData = createValidTaskData({
        titulo: "Tarea Completada para Filtro",
        estado: "completada",
        completada: true,
      });
      const additionalId = appwriteClient.generateTestId();

      await databases.createDocument(
        config.databaseId,
        config.collectionId,
        additionalId,
        additionalData
      );
      createdDocuments.push(additionalId);

      // Act - Filtrar por estado
      const result = await databases.listDocuments(
        config.databaseId,
        config.collectionId,
        [
          // Filtrar documentos con estado 'completada'
          `estado:equal:completada`,
        ]
      );

      // Assert
      expect(result.documents).to.be.an("array");
      expect(result.documents.length).to.be.at.least(1);

      // Verificar que todos los documentos tienen estado 'completada'
      result.documents.forEach((doc) => {
        expect(doc.estado).to.equal("completada");
      });
    });

    it("❌ Debería fallar al leer documento con ID inexistente", async function () {
      // Arrange
      const nonExistentId = nonExistentIds[0];

      // Act & Assert
      await expect(
        databases.getDocument(
          config.databaseId,
          config.collectionId,
          nonExistentId
        )
      ).to.be.rejected;
    });

    it("❌ Debería fallar al leer documento con ID inválido", async function () {
      // Arrange
      const invalidId = "";

      // Act & Assert
      await expect(
        databases.getDocument(config.databaseId, config.collectionId, invalidId)
      ).to.be.rejected;
    });
  });

  describe("✏️  UPDATE - Actualizar Documentos", function () {
    let testDocumentId;
    let originalData;

    beforeEach(async function () {
      // Crear documento de prueba para cada test de actualización
      originalData = createValidTaskData({
        titulo: "Documento Original",
        descripcion: "Datos originales antes de actualizar",
        estado: "pendiente",
        progreso: 0,
      });
      testDocumentId = appwriteClient.generateTestId();

      await databases.createDocument(
        config.databaseId,
        config.collectionId,
        testDocumentId,
        originalData
      );
      createdDocuments.push(testDocumentId);
    });

    it("✅ Debería actualizar campos específicos de un documento", async function () {
      // Arrange
      const updateData = createUpdateData({
        estado: "en_progreso",
        progreso: 75,
        descripcion: "Descripción actualizada durante la prueba",
      });

      // Act
      const result = await databases.updateDocument(
        config.databaseId,
        config.collectionId,
        testDocumentId,
        updateData
      );

      // Assert
      expect(result).to.exist;
      expect(result.$id).to.equal(testDocumentId);
      expect(result.estado).to.equal(updateData.estado);
      expect(result.progreso).to.equal(updateData.progreso);
      expect(result.descripcion).to.equal(updateData.descripcion);

      // Verificar que campos no actualizados permanecen igual
      expect(result.titulo).to.equal(originalData.titulo);

      // Verificar que $updatedAt cambió
      expect(result.$updatedAt).to.not.equal(result.$createdAt);
    });

    it("✅ Debería actualizar documento completo", async function () {
      // Arrange
      const completeUpdateData = createValidTaskData({
        titulo: "Título Completamente Actualizado",
        descripcion: "Descripción completamente nueva",
        estado: "completada",
        prioridad: "alta",
        completada: true,
        progreso: 100,
      });

      // Act
      const result = await databases.updateDocument(
        config.databaseId,
        config.collectionId,
        testDocumentId,
        completeUpdateData
      );

      // Assert
      expect(result.titulo).to.equal(completeUpdateData.titulo);
      expect(result.descripcion).to.equal(completeUpdateData.descripcion);
      expect(result.estado).to.equal(completeUpdateData.estado);
      expect(result.prioridad).to.equal(completeUpdateData.prioridad);
      expect(result.completada).to.equal(completeUpdateData.completada);
      expect(result.progreso).to.equal(completeUpdateData.progreso);
    });

    it("✅ Debería actualizar solo un campo sin afectar otros", async function () {
      // Arrange
      const singleFieldUpdate = { progreso: 25 };

      // Act
      const result = await databases.updateDocument(
        config.databaseId,
        config.collectionId,
        testDocumentId,
        singleFieldUpdate
      );

      // Assert
      expect(result.progreso).to.equal(25);
      expect(result.titulo).to.equal(originalData.titulo);
      expect(result.descripcion).to.equal(originalData.descripcion);
      expect(result.estado).to.equal(originalData.estado);
    });

    it("❌ Debería fallar al actualizar documento inexistente", async function () {
      // Arrange
      const nonExistentId = nonExistentIds[0];
      const updateData = createUpdateData();

      // Act & Assert
      await expect(
        databases.updateDocument(
          config.databaseId,
          config.collectionId,
          nonExistentId,
          updateData
        )
      ).to.be.rejected;
    });

    it("❌ Debería fallar al actualizar con datos inválidos", async function () {
      // Arrange
      const invalidUpdateData = createInvalidTaskData("invalid_types");

      // Act & Assert
      await expect(
        databases.updateDocument(
          config.databaseId,
          config.collectionId,
          testDocumentId,
          invalidUpdateData
        )
      ).to.be.rejected;
    });
  });

  describe("🗑️  DELETE - Eliminar Documentos", function () {
    let testDocumentId;

    beforeEach(async function () {
      // Crear documento de prueba para cada test de eliminación
      const testData = createValidTaskData({
        titulo: "Documento para Eliminar",
        descripcion: "Este documento será eliminado durante la prueba",
      });
      testDocumentId = appwriteClient.generateTestId();

      await databases.createDocument(
        config.databaseId,
        config.collectionId,
        testDocumentId,
        testData
      );
      // No agregamos a createdDocuments porque será eliminado en la prueba
    });

    it("✅ Debería eliminar un documento existente", async function () {
      // Arrange - Verificar que el documento existe antes de eliminar
      const documentBeforeDelete = await databases.getDocument(
        config.databaseId,
        config.collectionId,
        testDocumentId
      );
      expect(documentBeforeDelete).to.exist;

      // Act
      const result = await databases.deleteDocument(
        config.databaseId,
        config.collectionId,
        testDocumentId
      );

      // Assert
      expect(result).to.exist;

      // Verificar que el documento ya no existe
      await expect(
        databases.getDocument(
          config.databaseId,
          config.collectionId,
          testDocumentId
        )
      ).to.be.rejected;
    });

    it("✅ Debería eliminar múltiples documentos", async function () {
      // Arrange - Crear múltiples documentos
      const documentIds = [];
      for (let i = 0; i < 3; i++) {
        const docId = appwriteClient.generateTestId();
        const docData = createValidTaskData({
          titulo: `Documento ${i + 1} para Eliminación Masiva`,
        });

        await databases.createDocument(
          config.databaseId,
          config.collectionId,
          docId,
          docData
        );
        documentIds.push(docId);
      }

      // Act - Eliminar todos los documentos
      const deletePromises = documentIds.map((docId) =>
        databases.deleteDocument(config.databaseId, config.collectionId, docId)
      );
      const results = await Promise.all(deletePromises);

      // Assert
      expect(results).to.have.length(3);
      results.forEach((result) => expect(result).to.exist);

      // Verificar que ningún documento existe
      for (const docId of documentIds) {
        await expect(
          databases.getDocument(config.databaseId, config.collectionId, docId)
        ).to.be.rejected;
      }
    });

    it("❌ Debería fallar al eliminar documento inexistente", async function () {
      // Arrange
      const nonExistentId = nonExistentIds[0];

      // Act & Assert
      await expect(
        databases.deleteDocument(
          config.databaseId,
          config.collectionId,
          nonExistentId
        )
      ).to.be.rejected;
    });

    it("❌ Debería fallar al eliminar documento con ID inválido", async function () {
      // Arrange
      const invalidId = "";

      // Act & Assert
      await expect(
        databases.deleteDocument(
          config.databaseId,
          config.collectionId,
          invalidId
        )
      ).to.be.rejected;
    });

    it("❌ Debería fallar al eliminar el mismo documento dos veces", async function () {
      // Act - Primera eliminación (debería funcionar)
      await databases.deleteDocument(
        config.databaseId,
        config.collectionId,
        testDocumentId
      );

      // Assert - Segunda eliminación (debería fallar)
      await expect(
        databases.deleteDocument(
          config.databaseId,
          config.collectionId,
          testDocumentId
        )
      ).to.be.rejected;
    });
  });

  describe("🔄 Operaciones Complejas y Edge Cases", function () {
    it("✅ Debería manejar operaciones CRUD en secuencia", async function () {
      const documentId = appwriteClient.generateTestId();

      // CREATE
      const createData = createValidTaskData({
        titulo: "Tarea para Secuencia CRUD",
        estado: "pendiente",
        progreso: 0,
      });

      const created = await databases.createDocument(
        config.databaseId,
        config.collectionId,
        documentId,
        createData
      );
      expect(created.$id).to.equal(documentId);

      // READ
      const read = await databases.getDocument(
        config.databaseId,
        config.collectionId,
        documentId
      );
      expect(read.titulo).to.equal(createData.titulo);

      // UPDATE
      const updateData = { estado: "completada", progreso: 100 };
      const updated = await databases.updateDocument(
        config.databaseId,
        config.collectionId,
        documentId,
        updateData
      );
      expect(updated.estado).to.equal("completada");
      expect(updated.progreso).to.equal(100);

      // DELETE
      await databases.deleteDocument(
        config.databaseId,
        config.collectionId,
        documentId
      );

      // Verificar que fue eliminado
      await expect(
        databases.getDocument(
          config.databaseId,
          config.collectionId,
          documentId
        )
      ).to.be.rejected;
    });

    it("✅ Debería manejar operaciones concurrentes", async function () {
      // Arrange
      const concurrentOperations = [];
      const documentIds = [];

      // Crear múltiples operaciones de creación concurrentes
      for (let i = 0; i < 5; i++) {
        const docId = appwriteClient.generateTestId();
        const docData = createValidTaskData({
          titulo: `Tarea Concurrente ${i + 1}`,
        });

        documentIds.push(docId);
        concurrentOperations.push(
          databases.createDocument(
            config.databaseId,
            config.collectionId,
            docId,
            docData
          )
        );
      }

      // Act
      const results = await Promise.all(concurrentOperations);

      // Assert
      expect(results).to.have.length(5);
      results.forEach((result, index) => {
        expect(result.$id).to.equal(documentIds[index]);
        expect(result.titulo).to.include("Tarea Concurrente");
      });

      // Cleanup
      createdDocuments.push(...documentIds);
    });
  });
});
