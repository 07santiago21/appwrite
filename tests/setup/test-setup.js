/**
 * Configuración global para las pruebas
 * Este archivo se ejecuta antes y después de todas las pruebas
 */

const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const sinon = require("sinon");
const sinonChai = require("sinon-chai");
const AppwriteTestClient = require("../helpers/appwrite-client");

// Configurar Chai con plugins
chai.use(chaiAsPromised);
chai.use(sinonChai);

// Exportar expect globalmente
global.expect = chai.expect;
global.sinon = sinon;

/**
 * Configuración global de pruebas
 */
class TestSetup {
  constructor() {
    this.appwriteClient = null;
    this.createdDocuments = [];
    this.testStartTime = null;
  }

  /**
   * Configuración inicial antes de todas las pruebas
   */
  async globalSetup() {
    console.log("🚀 Iniciando configuración global de pruebas...");
    this.testStartTime = Date.now();

    try {
      // Inicializar cliente de Appwrite
      this.appwriteClient = new AppwriteTestClient();

      // Verificar conexión con Appwrite
      await this.verifyAppwriteConnection();

      // Configurar base de datos y colección de prueba si no existen
      await this.setupTestDatabase();

      console.log("✅ Configuración global completada exitosamente");
    } catch (error) {
      console.error("❌ Error en configuración global:", error.message);
      throw error;
    }
  }

  /**
   * Limpieza después de todas las pruebas
   */
  async globalTeardown() {
    console.log("🧹 Iniciando limpieza global...");

    try {
      // Limpiar documentos creados durante las pruebas
      await this.cleanupTestDocuments();

      // Mostrar estadísticas de pruebas
      this.showTestStatistics();

      console.log("✅ Limpieza global completada");
    } catch (error) {
      console.error("❌ Error en limpieza global:", error.message);
    }
  }

  /**
   * Verifica la conexión con Appwrite
   */
  async verifyAppwriteConnection() {
    try {
      const config = this.appwriteClient.getConfig();

      // Verificar que tenemos la configuración básica
      if (!config.projectId || !config.databaseId || !config.collectionId) {
        throw new Error(
          "Configuración incompleta: faltan IDs de proyecto, base de datos o colección"
        );
      }

      console.log(
        `📡 Cliente Appwrite configurado (Proyecto: ${config.projectId})`
      );
      console.log(`📊 Base de datos: ${config.databaseId}`);
      console.log(`📋 Colección: ${config.collectionId}`);
    } catch (error) {
      throw new Error(`Error en configuración de Appwrite: ${error.message}`);
    }
  }

  /**
   * Configura la base de datos y colección de prueba
   */
  async setupTestDatabase() {
    const databases = this.appwriteClient.getDatabases();
    const config = this.appwriteClient.getConfig();

    console.log("🔧 Verificando configuración de base de datos y colección...");
    console.log(`   📊 Database ID: ${config.databaseId}`);
    console.log(`   📋 Collection ID: ${config.collectionId}`);

    // Nota: Las verificaciones de existencia se harán durante las pruebas reales
    // Si la base de datos o colección no existen, las pruebas fallarán con mensajes claros
    console.log(
      "⚠️  Asegúrate de que la base de datos y colección existan en Appwrite"
    );
    console.log('   Campos requeridos para la colección "tareas":');
    console.log("   - titulo (string, required)");
    console.log("   - descripcion (string, optional)");
    console.log("   - estado (string, optional)");
    console.log("   - prioridad (string, optional)");
    console.log("   - completada (boolean, optional)");
    console.log("   - progreso (integer, optional)");
  }

  /**
   * Registra un documento creado para limpieza posterior
   */
  registerCreatedDocument(documentId) {
    this.createdDocuments.push(documentId);
  }

  /**
   * Limpia todos los documentos creados durante las pruebas
   */
  async cleanupTestDocuments() {
    if (this.createdDocuments.length === 0) {
      console.log("📝 No hay documentos de prueba para limpiar");
      return;
    }

    console.log(
      `🗑️  Limpiando ${this.createdDocuments.length} documentos de prueba...`
    );

    const databases = this.appwriteClient.getDatabases();
    const config = this.appwriteClient.getConfig();
    let cleanedCount = 0;

    for (const documentId of this.createdDocuments) {
      try {
        await databases.deleteDocument(
          config.databaseId,
          config.collectionId,
          documentId
        );
        cleanedCount++;
      } catch (error) {
        // Ignorar errores de documentos que ya no existen
        if (error.code !== 404) {
          console.warn(
            `⚠️  No se pudo eliminar documento ${documentId}:`,
            error.message
          );
        }
      }
    }

    console.log(`✅ ${cleanedCount} documentos limpiados exitosamente`);
    this.createdDocuments = [];
  }

  /**
   * Muestra estadísticas de las pruebas ejecutadas
   */
  showTestStatistics() {
    const duration = Date.now() - this.testStartTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    console.log("\n📊 Estadísticas de Pruebas:");
    console.log(`   ⏱️  Duración total: ${minutes}m ${seconds}s`);
    console.log(`   📄 Documentos procesados: ${this.createdDocuments.length}`);
    console.log(
      `   🔧 Cliente Appwrite: ${this.appwriteClient.getConfig().projectId}`
    );
  }

  /**
   * Obtiene el cliente de Appwrite configurado
   */
  getAppwriteClient() {
    return this.appwriteClient;
  }
}

// Crear instancia global
const testSetup = new TestSetup();

// Hooks globales de Mocha
before(async function () {
  this.timeout(30000); // 30 segundos para setup
  await testSetup.globalSetup();
});

after(async function () {
  this.timeout(30000); // 30 segundos para cleanup
  await testSetup.globalTeardown();
});

// Exportar para uso en pruebas individuales
module.exports = testSetup;
