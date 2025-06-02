/**
 * Helper para configurar el cliente de Appwrite para pruebas
 */

const { Client, Databases, ID, Permission, Role } = require("node-appwrite");
require("dotenv").config({ path: "./config/test.env" });

/**
 * Configuración del cliente de Appwrite
 */
class AppwriteTestClient {
  constructor() {
    this.client = new Client();
    this.databases = null;
    this.projectId = process.env.APPWRITE_PROJECT_ID;
    this.databaseId = process.env.TEST_DATABASE_ID;
    this.collectionId = process.env.TEST_COLLECTION_ID;

    this.setupClient();
  }

  /**
   * Configura el cliente de Appwrite
   */
  setupClient() {
    this.client
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(this.projectId)
      .setKey(process.env.APPWRITE_API_KEY);

    this.databases = new Databases(this.client);
  }

  /**
   * Obtiene una instancia del cliente de base de datos
   * @returns {Databases} Instancia de Databases
   */
  getDatabases() {
    return this.databases;
  }

  /**
   * Genera un ID único para documentos de prueba
   * @returns {string} ID único
   */
  generateTestId() {
    return ID.unique();
  }

  /**
   * Obtiene los IDs de configuración
   * @returns {Object} Objeto con los IDs de configuración
   */
  getConfig() {
    return {
      databaseId: this.databaseId,
      collectionId: this.collectionId,
      projectId: this.projectId,
    };
  }

  /**
   * Crea permisos de prueba
   * @returns {Array} Array de permisos
   */
  getTestPermissions() {
    return [
      Permission.read(Role.any()),
      Permission.write(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any()),
    ];
  }
}

module.exports = AppwriteTestClient;
