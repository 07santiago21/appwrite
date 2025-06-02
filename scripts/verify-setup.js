#!/usr/bin/env node

/**
 * Script para verificar la configuración de pruebas de Appwrite
 *
 * Este script verifica que:
 * - Las variables de entorno estén configuradas
 * - El servidor Appwrite esté accesible
 * - La API key tenga permisos correctos
 * - La base de datos y colección existan
 */

const axios = require("axios");
const { Client, Databases } = require("node-appwrite");
require("dotenv").config({ path: "./config/test.env" });

class SetupVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = [];
  }

  log(type, message) {
    const timestamp = new Date().toISOString();
    const prefix =
      {
        error: "❌",
        warning: "⚠️ ",
        success: "✅",
        info: "ℹ️ ",
      }[type] || "ℹ️ ";

    console.log(`${prefix} ${message}`);

    if (type === "error") this.errors.push(message);
    if (type === "warning") this.warnings.push(message);
    if (type === "success") this.success.push(message);
  }

  async verifyEnvironmentVariables() {
    this.log("info", "Verificando variables de entorno...");

    const required = [
      "APPWRITE_ENDPOINT",
      "APPWRITE_PROJECT_ID",
      "APPWRITE_API_KEY",
      "TEST_DATABASE_ID",
      "TEST_COLLECTION_ID",
    ];

    const optional = ["TEST_TIMEOUT", "DEBUG_REQUESTS"];

    for (const variable of required) {
      if (!process.env[variable]) {
        this.log("error", `Variable requerida faltante: ${variable}`);
      } else {
        this.log("success", `Variable configurada: ${variable}`);
      }
    }

    for (const variable of optional) {
      if (!process.env[variable]) {
        this.log("warning", `Variable opcional no configurada: ${variable}`);
      } else {
        this.log("success", `Variable opcional configurada: ${variable}`);
      }
    }
  }

  async verifyAppwriteConnection() {
    this.log("info", "Verificando conexión con Appwrite...");

    try {
      const response = await axios.get(
        `${process.env.APPWRITE_ENDPOINT}/health`,
        {
          timeout: 5000,
        }
      );

      if (response.status === 200) {
        this.log("success", "Servidor Appwrite accesible");
        this.log("info", `Endpoint: ${process.env.APPWRITE_ENDPOINT}`);
      }
    } catch (error) {
      this.log("error", `No se puede conectar a Appwrite: ${error.message}`);
      this.log(
        "error",
        `Verifica que Appwrite esté ejecutándose en: ${process.env.APPWRITE_ENDPOINT}`
      );
    }
  }

  async verifyProjectsAPI() {
    this.log("info", "Verificando API de proyectos...");

    try {
      const response = await axios.get(
        `${process.env.APPWRITE_ENDPOINT}/projects`,
        {
          headers: {
            "X-Appwrite-Project": "console",
            "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
          },
          timeout: 5000,
        }
      );

      if (response.status === 200) {
        this.log("success", "API de proyectos accesible");
        this.log("info", `Proyectos encontrados: ${response.data.total || 0}`);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        this.log("error", "API key inválida o sin permisos de administrador");
      } else {
        this.log("error", `Error en API de proyectos: ${error.message}`);
      }
    }
  }

  async verifyDatabase() {
    this.log("info", "Verificando base de datos...");

    try {
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const databases = new Databases(client);

      // Verificar base de datos
      const database = await databases.get(process.env.TEST_DATABASE_ID);
      this.log("success", `Base de datos encontrada: ${database.name}`);

      // Verificar colección
      const collection = await databases.getCollection(
        process.env.TEST_DATABASE_ID,
        process.env.TEST_COLLECTION_ID
      );
      this.log("success", `Colección encontrada: ${collection.name}`);

      // Verificar atributos
      const requiredAttributes = ["titulo"];
      const optionalAttributes = [
        "descripcion",
        "estado",
        "prioridad",
        "completada",
        "progreso",
      ];

      for (const attr of requiredAttributes) {
        const found = collection.attributes.find((a) => a.key === attr);
        if (found) {
          this.log(
            "success",
            `Atributo requerido encontrado: ${attr} (${found.type})`
          );
        } else {
          this.log("error", `Atributo requerido faltante: ${attr}`);
        }
      }

      for (const attr of optionalAttributes) {
        const found = collection.attributes.find((a) => a.key === attr);
        if (found) {
          this.log(
            "success",
            `Atributo opcional encontrado: ${attr} (${found.type})`
          );
        } else {
          this.log("warning", `Atributo opcional faltante: ${attr}`);
        }
      }
    } catch (error) {
      this.log("error", `Error verificando base de datos: ${error.message}`);
    }
  }

  async verifyTestExecution() {
    this.log("info", "Verificando ejecución de pruebas...");

    try {
      // Verificar que mocha esté instalado
      const { execSync } = require("child_process");
      execSync("npx mocha --version", { stdio: "pipe" });
      this.log("success", "Mocha instalado correctamente");

      // Verificar que las dependencias estén instaladas
      const fs = require("fs");
      if (fs.existsSync("./node_modules")) {
        this.log("success", "Dependencias instaladas");
      } else {
        this.log("error", "Dependencias no instaladas. Ejecuta: npm install");
      }
    } catch (error) {
      this.log(
        "error",
        `Error verificando herramientas de prueba: ${error.message}`
      );
    }
  }

  printSummary() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 RESUMEN DE VERIFICACIÓN");
    console.log("=".repeat(60));

    console.log(`✅ Verificaciones exitosas: ${this.success.length}`);
    console.log(`⚠️  Advertencias: ${this.warnings.length}`);
    console.log(`❌ Errores: ${this.errors.length}`);

    if (this.errors.length === 0) {
      console.log(
        "\n🎉 ¡Configuración completa! Las pruebas deberían ejecutarse correctamente."
      );
      console.log("\n🚀 Para ejecutar las pruebas:");
      console.log("   npm test");
      console.log('   npm test -- --grep "Projects"');
    } else {
      console.log("\n🔧 Se encontraron errores que deben corregirse:");
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      console.log(
        "\n📖 Consulta SETUP-TESTS.md para instrucciones detalladas."
      );
    }

    if (this.warnings.length > 0) {
      console.log("\n⚠️  Advertencias (opcionales):");
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
  }

  async run() {
    console.log("🔍 VERIFICADOR DE CONFIGURACIÓN DE PRUEBAS APPWRITE");
    console.log("=".repeat(60));

    await this.verifyEnvironmentVariables();
    await this.verifyAppwriteConnection();
    await this.verifyProjectsAPI();
    await this.verifyDatabase();
    await this.verifyTestExecution();

    this.printSummary();

    // Exit code para CI/CD
    process.exit(this.errors.length > 0 ? 1 : 0);
  }
}

// Ejecutar verificación
if (require.main === module) {
  const verifier = new SetupVerifier();
  verifier.run().catch((error) => {
    console.error("❌ Error ejecutando verificación:", error.message);
    process.exit(1);
  });
}

module.exports = SetupVerifier;
