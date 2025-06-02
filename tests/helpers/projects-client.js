/**
 * Helper para realizar peticiones HTTP a la API de proyectos de Appwrite
 */

const axios = require("axios");
require("dotenv").config({ path: "./config/test.env" });

/**
 * Cliente HTTP para pruebas de la API de proyectos
 */
class ProjectsAPIClient {
  constructor() {
    this.baseURL = process.env.APPWRITE_ENDPOINT;
    this.projectId = "console"; // Para operaciones de proyectos se usa console
    this.apiKey = process.env.APPWRITE_API_KEY;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(process.env.TEST_TIMEOUT) || 10000,
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": this.projectId,
        "X-Appwrite-Key": this.apiKey,
      },
    });

    // Interceptor para logging de requests en modo debug
    this.client.interceptors.request.use((config) => {
      if (process.env.DEBUG_REQUESTS === "true") {
        console.log(`🔄 ${config.method?.toUpperCase()} ${config.url}`);
      }
      return config;
    });

    // Interceptor para manejo de errores
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // El servidor respondió con un código de error
          const errorData = {
            status: error.response.status,
            message: error.response.data?.message || error.message,
            code: error.response.data?.code,
            type: error.response.data?.type,
          };
          error.appwriteError = errorData;
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Crear un nuevo proyecto
   * @param {Object} projectData - Datos del proyecto
   * @returns {Promise<Object>} Respuesta de la API
   */
  async createProject(projectData) {
    const response = await this.client.post("/projects", projectData);
    return response.data;
  }

  /**
   * Listar proyectos
   * @param {Object} params - Parámetros de consulta
   * @returns {Promise<Object>} Respuesta de la API
   */
  async listProjects(params = {}) {
    const response = await this.client.get("/projects", { params });
    return response.data;
  }

  /**
   * Obtener un proyecto específico
   * @param {string} projectId - ID del proyecto
   * @returns {Promise<Object>} Respuesta de la API
   */
  async getProject(projectId) {
    const response = await this.client.get(`/projects/${projectId}`);
    return response.data;
  }

  /**
   * Actualizar un proyecto
   * @param {string} projectId - ID del proyecto
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Respuesta de la API
   */
  async updateProject(projectId, updateData) {
    const response = await this.client.patch(
      `/projects/${projectId}`,
      updateData
    );
    return response.data;
  }

  /**
   * Eliminar un proyecto
   * @param {string} projectId - ID del proyecto
   * @returns {Promise<void>} Respuesta de la API
   */
  async deleteProject(projectId) {
    const response = await this.client.delete(`/projects/${projectId}`);
    return response.status === 204;
  }

  /**
   * Actualizar estado de APIs del proyecto
   * @param {string} projectId - ID del proyecto
   * @param {Object} apiData - Configuración de APIs
   * @returns {Promise<Object>} Respuesta de la API
   */
  async updateProjectAPI(projectId, apiData) {
    const response = await this.client.patch(
      `/projects/${projectId}/api`,
      apiData
    );
    return response.data;
  }

  /**
   * Crear webhook en un proyecto
   * @param {string} projectId - ID del proyecto
   * @param {Object} webhookData - Datos del webhook
   * @returns {Promise<Object>} Respuesta de la API
   */
  async createWebhook(projectId, webhookData) {
    const response = await this.client.post(
      `/projects/${projectId}/webhooks`,
      webhookData
    );
    return response.data;
  }

  /**
   * Crear plataforma en un proyecto
   * @param {string} projectId - ID del proyecto
   * @param {Object} platformData - Datos de la plataforma
   * @returns {Promise<Object>} Respuesta de la API
   */
  async createPlatform(projectId, platformData) {
    const response = await this.client.post(
      `/projects/${projectId}/platforms`,
      platformData
    );
    return response.data;
  }

  /**
   * Generar un ID único para pruebas
   * @returns {string} ID único
   */
  generateTestId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtener configuración del cliente
   * @returns {Object} Configuración
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      projectId: this.projectId,
      timeout: this.client.defaults.timeout,
    };
  }
}

module.exports = ProjectsAPIClient;
