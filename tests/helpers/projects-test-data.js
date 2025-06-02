/**
 * Helper para generar datos de prueba específicos para proyectos
 */

/**
 * Factory para crear datos de proyecto válidos
 * @param {Object} overrides - Propiedades a sobrescribir
 * @returns {Object} Objeto de proyecto
 */
function createValidProjectData(overrides = {}) {
  const timestamp = Date.now();
  const defaultData = {
    projectId: `test_project_${timestamp}_${Math.random()
      .toString(36)
      .substr(2, 9)}`,
    name: `Proyecto de Prueba ${timestamp}`,
    teamId: process.env.APPWRITE_PROJECT_ID || "683b7842002abf76d2e8", // Usar el team del proyecto de prueba
    region: "default",
    description: "Proyecto creado durante las pruebas automatizadas",
    logo: "https://example.com/logo.png",
    url: "https://example.com",
    legalName: "Empresa de Pruebas S.A.",
    legalCountry: "España",
    legalState: "Madrid",
    legalCity: "Madrid",
    legalAddress: "Calle de Prueba 123",
    legalTaxId: "B12345678",
  };

  return { ...defaultData, ...overrides };
}

/**
 * Factory para crear datos de proyecto inválidos
 * @param {string} invalidType - Tipo de invalidez
 * @returns {Object} Objeto de proyecto inválido
 */
function createInvalidProjectData(invalidType = "missing_required") {
  const invalidDataSets = {
    missing_required: {
      // Falta projectId y name (requeridos)
      teamId: "valid_team_id",
      description: "Proyecto sin campos requeridos",
    },
    invalid_types: {
      projectId: 123, // Debería ser string
      name: true, // Debería ser string
      teamId: null, // Debería ser string
      region: 456, // Debería ser string
      description: [], // Debería ser string
    },
    invalid_values: {
      projectId: "", // String vacío
      name: "", // String vacío
      teamId: "team_inexistente",
      region: "region_inexistente",
      description: "a".repeat(300), // Muy largo (max 256)
      url: "url_invalida",
      legalName: "a".repeat(300), // Muy largo
    },
    invalid_project_id: {
      projectId: "console", // ID reservado
      name: "Proyecto con ID reservado",
      teamId: "valid_team_id",
    },
    null_values: {
      projectId: null,
      name: null,
      teamId: null,
    },
  };

  return invalidDataSets[invalidType] || invalidDataSets.missing_required;
}

/**
 * Factory para crear datos de actualización de proyecto
 * @param {Object} updates - Campos a actualizar
 * @returns {Object} Objeto con actualizaciones
 */
function createProjectUpdateData(updates = {}) {
  const defaultUpdates = {
    name: "Proyecto Actualizado",
    description: "Descripción actualizada durante las pruebas",
    logo: "https://example.com/new-logo.png",
    url: "https://updated-example.com",
    legalName: "Empresa Actualizada S.L.",
  };

  return { ...defaultUpdates, ...updates };
}

/**
 * Factory para crear datos de webhook válidos
 * @param {Object} overrides - Propiedades a sobrescribir
 * @returns {Object} Objeto de webhook
 */
function createValidWebhookData(overrides = {}) {
  const defaultData = {
    name: `Webhook de Prueba ${Date.now()}`,
    enabled: true,
    events: ["databases.*.collections.*.documents.*"],
    url: "https://webhook-test.example.com/endpoint",
    security: true,
    httpUser: "test_user",
    httpPass: "test_password",
  };

  return { ...defaultData, ...overrides };
}

/**
 * Factory para crear datos de webhook inválidos
 * @param {string} invalidType - Tipo de invalidez
 * @returns {Object} Objeto de webhook inválido
 */
function createInvalidWebhookData(invalidType = "missing_required") {
  const invalidDataSets = {
    missing_required: {
      enabled: true,
      // Faltan name, events y url (requeridos)
    },
    invalid_types: {
      name: 123, // Debería ser string
      enabled: "true", // Debería ser boolean
      events: "not_array", // Debería ser array
      url: 456, // Debería ser string
      security: "false", // Debería ser boolean
    },
    invalid_values: {
      name: "", // String vacío
      events: [], // Array vacío
      url: "url_invalida",
      httpUser: "a".repeat(300), // Muy largo
      httpPass: "a".repeat(300), // Muy largo
    },
  };

  return invalidDataSets[invalidType] || invalidDataSets.missing_required;
}

/**
 * Factory para crear datos de plataforma válidos
 * @param {Object} overrides - Propiedades a sobrescribir
 * @returns {Object} Objeto de plataforma
 */
function createValidPlatformData(overrides = {}) {
  const defaultData = {
    type: "web",
    name: `Plataforma de Prueba ${Date.now()}`,
    hostname: "test.example.com",
  };

  return { ...defaultData, ...overrides };
}

/**
 * Factory para crear datos de plataforma inválidos
 * @param {string} invalidType - Tipo de invalidez
 * @returns {Object} Objeto de plataforma inválido
 */
function createInvalidPlatformData(invalidType = "missing_required") {
  const invalidDataSets = {
    missing_required: {
      // Faltan type y name (requeridos)
      hostname: "test.example.com",
    },
    invalid_types: {
      type: 123, // Debería ser string
      name: true, // Debería ser string
      hostname: [], // Debería ser string
    },
    invalid_values: {
      type: "tipo_inexistente",
      name: "", // String vacío
      hostname: "hostname_invalido",
    },
  };

  return invalidDataSets[invalidType] || invalidDataSets.missing_required;
}

/**
 * Factory para crear datos de configuración de API
 * @param {Object} overrides - Propiedades a sobrescribir
 * @returns {Object} Objeto de configuración de API
 */
function createAPIConfigData(overrides = {}) {
  const defaultData = {
    api: "account",
    status: true,
  };

  return { ...defaultData, ...overrides };
}

/**
 * Escenarios de prueba predefinidos para proyectos
 */
const projectTestScenarios = {
  // Proyecto básico
  basic: {
    name: "Proyecto Básico",
    description: "Un proyecto simple para pruebas básicas",
  },

  // Proyecto completo con todos los campos
  complete: {
    name: "Proyecto Completo",
    description: "Proyecto con todos los campos opcionales completados",
    logo: "https://example.com/complete-logo.png",
    url: "https://complete-project.example.com",
    legalName: "Empresa Completa S.A.",
    legalCountry: "España",
    legalState: "Cataluña",
    legalCity: "Barcelona",
    legalAddress: "Avenida Completa 456",
    legalTaxId: "A87654321",
  },

  // Proyecto mínimo
  minimal: {
    name: "Proyecto Mínimo",
  },
};

/**
 * Escenarios de prueba para webhooks
 */
const webhookTestScenarios = {
  // Webhook básico
  basic: {
    name: "Webhook Básico",
    events: ["databases.*"],
    url: "https://basic-webhook.example.com",
  },

  // Webhook completo
  complete: {
    name: "Webhook Completo",
    enabled: true,
    events: ["databases.*", "users.*", "storage.*"],
    url: "https://complete-webhook.example.com/endpoint",
    security: true,
    httpUser: "webhook_user",
    httpPass: "secure_password_123",
  },

  // Webhook deshabilitado
  disabled: {
    name: "Webhook Deshabilitado",
    enabled: false,
    events: ["databases.*"],
    url: "https://disabled-webhook.example.com",
  },
};

/**
 * Escenarios de prueba para plataformas
 */
const platformTestScenarios = {
  // Plataforma web
  web: {
    type: "web",
    name: "Aplicación Web",
    hostname: "webapp.example.com",
  },

  // Plataforma móvil
  mobile: {
    type: "flutter-android",
    name: "App Android",
    key: "com.example.testapp",
  },

  // Plataforma iOS
  ios: {
    type: "flutter-ios",
    name: "App iOS",
    key: "com.example.testapp.ios",
  },
};

/**
 * IDs que no existen para pruebas de error
 */
const nonExistentIds = [
  "project_not_found_123",
  "fake_project_456",
  "invalid_project_id",
  "000000000000000000000000",
  "webhook_not_found_789",
  "platform_not_found_101",
];

/**
 * Genera múltiples proyectos para pruebas de carga
 * @param {number} count - Número de proyectos a generar
 * @returns {Array} Array de objetos de proyecto
 */
function generateBulkProjectData(count = 5) {
  const regions = ["default", "fra", "nyc"];

  return Array.from({ length: count }, (_, index) => {
    const timestamp = Date.now() + index;
    return createValidProjectData({
      projectId: `bulk_test_${timestamp}_${index}`,
      name: `Proyecto Masivo ${index + 1}`,
      description: `Proyecto generado automáticamente para pruebas de carga ${
        index + 1
      }`,
      region: regions[Math.floor(Math.random() * regions.length)],
    });
  });
}

module.exports = {
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
  generateBulkProjectData,
};
