#!/usr/bin/env node

/**
 * Script de diagnóstico detallado para problemas de conexión con Appwrite
 */

const axios = require("axios");
const { Client, Databases } = require("node-appwrite");
require("dotenv").config({ path: "./config/test.env" });

class ConnectionDebugger {
  constructor() {
    this.endpoint = process.env.APPWRITE_ENDPOINT;
    this.projectId = process.env.APPWRITE_PROJECT_ID;
    this.apiKey = process.env.APPWRITE_API_KEY;
  }

  log(emoji, message, data = null) {
    console.log(`${emoji} ${message}`);
    if (data) {
      console.log("   ", JSON.stringify(data, null, 2));
    }
  }

  async testBasicConnection() {
    console.log("\n🔍 PASO 1: Verificando conexión básica con Appwrite");
    console.log("=".repeat(60));

    try {
      // Test 1: Health endpoint (sin autenticación)
      this.log("🏥", "Probando endpoint de salud...");
      const healthResponse = await axios.get(`${this.endpoint}/health`, {
        timeout: 5000,
      });
      this.log(
        "✅",
        `Servidor Appwrite respondiendo: ${healthResponse.status}`
      );

      // Test 2: Verificar que el endpoint es correcto
      this.log("🌐", `Endpoint configurado: ${this.endpoint}`);

      return true;
    } catch (error) {
      this.log("❌", `Error de conexión básica: ${error.message}`);
      if (error.code === "ECONNREFUSED") {
        this.log(
          "💡",
          "Solución: Verifica que Appwrite esté ejecutándose en el puerto correcto"
        );
      }
      return false;
    }
  }

  async testProjectAccess() {
    console.log("\n🔍 PASO 2: Verificando acceso al proyecto específico");
    console.log("=".repeat(60));

    try {
      // Test con el proyecto específico (no console)
      this.log("📋", `Probando acceso al proyecto: ${this.projectId}`);

      const client = new Client()
        .setEndpoint(this.endpoint)
        .setProject(this.projectId)
        .setKey(this.apiKey);

      const databases = new Databases(client);

      // Esto debería funcionar si la API key tiene permisos en el proyecto
      const dbList = await databases.list();
      this.log(
        "✅",
        `Acceso al proyecto exitoso. Bases de datos: ${dbList.total}`
      );

      return true;
    } catch (error) {
      this.log("❌", `Error accediendo al proyecto: ${error.message}`);
      this.log(
        "🔑",
        `API Key (primeros 20 chars): ${this.apiKey.substring(0, 20)}...`
      );
      this.log("📋", `Project ID: ${this.projectId}`);

      if (error.message.includes("401")) {
        this.log("💡", "La API key no tiene permisos en este proyecto");
      }
      return false;
    }
  }

  async testConsoleAccess() {
    console.log(
      "\n🔍 PASO 3: Verificando acceso a la consola (para API de proyectos)"
    );
    console.log("=".repeat(60));

    try {
      // Test 1: Verificar headers
      this.log("📤", "Headers que se están enviando:");
      const headers = {
        "X-Appwrite-Project": "console",
        "X-Appwrite-Key": this.apiKey,
        "Content-Type": "application/json",
      };
      this.log("📋", "", headers);

      // Test 2: Probar endpoint de proyectos
      this.log("🚀", "Probando endpoint de proyectos...");
      const response = await axios.get(`${this.endpoint}/projects`, {
        headers,
        timeout: 10000,
      });

      this.log("✅", `API de proyectos accesible: ${response.status}`);
      this.log("📊", `Proyectos encontrados: ${response.data.total}`);

      return true;
    } catch (error) {
      this.log("❌", `Error en API de proyectos: ${error.message}`);

      if (error.response) {
        this.log("📄", `Status: ${error.response.status}`);
        this.log("📄", `Response:`, error.response.data);

        if (error.response.status === 401) {
          this.log(
            "💡",
            "PROBLEMA IDENTIFICADO: La API key no tiene permisos de ADMINISTRADOR"
          );
          this.log("🔧", "SOLUCIÓN:");
          console.log("   1. Ve a la consola de Appwrite");
          console.log("   2. Selecciona tu proyecto");
          console.log("   3. Ve a Settings → API Keys");
          console.log(
            "   4. Crea una nueva API key con TODOS los scopes/permisos"
          );
          console.log('   5. Asegúrate de marcar "Admin" o todos los permisos');
          console.log(
            "   6. Copia la nueva API key al archivo config/test.env"
          );
        }
      }
      return false;
    }
  }

  async testSpecificEndpoints() {
    console.log("\n🔍 PASO 4: Probando endpoints específicos");
    console.log("=".repeat(60));

    const endpoints = [
      { name: "Health", url: "/health", needsAuth: false },
      {
        name: "Account",
        url: "/account",
        needsAuth: true,
        project: this.projectId,
      },
      {
        name: "Projects",
        url: "/projects",
        needsAuth: true,
        project: "console",
      },
    ];

    for (const endpoint of endpoints) {
      try {
        this.log("🔍", `Probando ${endpoint.name}...`);

        const config = {
          timeout: 5000,
        };

        if (endpoint.needsAuth) {
          config.headers = {
            "X-Appwrite-Project": endpoint.project,
            "X-Appwrite-Key": this.apiKey,
          };
        }

        const response = await axios.get(
          `${this.endpoint}${endpoint.url}`,
          config
        );
        this.log("✅", `${endpoint.name}: ${response.status}`);
      } catch (error) {
        this.log(
          "❌",
          `${endpoint.name}: ${error.response?.status || error.message}`
        );
      }
    }
  }

  async checkAPIKeyFormat() {
    console.log("\n🔍 PASO 5: Verificando formato de API Key");
    console.log("=".repeat(60));

    this.log("🔑", `Longitud de API Key: ${this.apiKey.length} caracteres`);
    this.log("🔑", `Primeros 20 chars: ${this.apiKey.substring(0, 20)}...`);
    this.log(
      "🔑",
      `Últimos 10 chars: ...${this.apiKey.substring(this.apiKey.length - 10)}`
    );

    // Verificar formato típico de API key de Appwrite
    if (this.apiKey.length < 100) {
      this.log(
        "⚠️",
        "La API key parece muy corta. Las API keys de Appwrite suelen ser más largas."
      );
    }

    if (!this.apiKey.includes("_")) {
      this.log(
        "⚠️",
        "La API key no contiene guiones bajos. Verifica que sea correcta."
      );
    }

    if (this.apiKey.startsWith("standard_")) {
      this.log("✅", "Formato de API key parece correcto (standard_...)");
    } else {
      this.log(
        "⚠️",
        'La API key no empieza con "standard_". Verifica que sea una API key válida.'
      );
    }
  }

  async run() {
    console.log("🔍 DIAGNÓSTICO DETALLADO DE CONEXIÓN APPWRITE");
    console.log("=".repeat(60));
    console.log(`Endpoint: ${this.endpoint}`);
    console.log(`Project ID: ${this.projectId}`);
    console.log(`API Key: ${this.apiKey.substring(0, 20)}...`);

    await this.testBasicConnection();
    await this.testProjectAccess();
    await this.testConsoleAccess();
    await this.testSpecificEndpoints();
    await this.checkAPIKeyFormat();

    console.log("\n🎯 RESUMEN Y PRÓXIMOS PASOS");
    console.log("=".repeat(60));
    console.log("Si ves errores 401 en la API de proyectos:");
    console.log("1. 🔑 Crea una nueva API key con permisos de ADMINISTRADOR");
    console.log("2. 📋 Verifica que el Project ID sea correcto");
    console.log("3. 🌐 Confirma que el endpoint sea el correcto");
    console.log("4. 🔄 Reinicia el servidor Appwrite si es necesario");
  }
}

// Ejecutar diagnóstico
if (require.main === module) {
  const connectionDebugger = new ConnectionDebugger();
  connectionDebugger.run().catch((error) => {
    console.error("❌ Error ejecutando diagnóstico:", error.message);
    process.exit(1);
  });
}

module.exports = ConnectionDebugger;
