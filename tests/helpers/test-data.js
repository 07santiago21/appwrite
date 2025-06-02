/**
 * Helper para generar datos de prueba
 */

/**
 * Factory para crear datos de tarea válidos
 * @param {Object} overrides - Propiedades a sobrescribir
 * @returns {Object} Objeto de tarea
 */
function createValidTaskData(overrides = {}) {
  const defaultData = {
    titulo: "Tarea de prueba",
    descripcion: "Esta es una descripción de prueba para la tarea",
    estado: "pendiente",
    prioridad: "media",
    fechaCreacion: new Date().toISOString(),
    fechaVencimiento: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString(), // 7 días desde ahora
    asignadoA: "usuario_prueba",
    etiquetas: ["prueba", "automatizada"],
    completada: false,
    progreso: 0,
  };

  return { ...defaultData, ...overrides };
}

/**
 * Factory para crear datos de tarea inválidos
 * @param {string} invalidType - Tipo de invalidez
 * @returns {Object} Objeto de tarea inválido
 */
function createInvalidTaskData(invalidType = "missing_required") {
  const invalidDataSets = {
    missing_required: {
      descripcion: "Tarea sin título",
      estado: "pendiente",
      // Falta el campo requerido 'titulo'
    },
    invalid_types: {
      titulo: 123, // Debería ser string
      descripcion: true, // Debería ser string
      estado: "estado_inexistente",
      prioridad: null,
      completada: "no", // Debería ser boolean
      progreso: "cincuenta", // Debería ser number
    },
    invalid_values: {
      titulo: "", // String vacío
      descripcion: "a".repeat(1001), // Muy largo
      estado: "estado_no_valido",
      prioridad: "super_ultra_alta",
      progreso: -10, // Valor negativo
      fechaVencimiento: "fecha_invalida",
    },
    null_values: {
      titulo: null,
      descripcion: null,
      estado: null,
    },
  };

  return invalidDataSets[invalidType] || invalidDataSets.missing_required;
}

/**
 * Factory para crear datos de actualización
 * @param {Object} updates - Campos a actualizar
 * @returns {Object} Objeto con actualizaciones
 */
function createUpdateData(updates = {}) {
  const defaultUpdates = {
    estado: "en_progreso",
    progreso: 50,
    descripcion: "Descripción actualizada en prueba",
  };

  return { ...defaultUpdates, ...updates };
}

/**
 * Datos de prueba para diferentes escenarios
 */
const testScenarios = {
  // Escenario de tarea simple
  simple: {
    titulo: "Tarea Simple",
    descripcion: "Una tarea básica para pruebas",
    estado: "pendiente",
    completada: false,
  },

  // Escenario de tarea compleja
  complex: {
    titulo: "Tarea Compleja con Muchos Campos",
    descripcion:
      "Esta es una tarea más compleja que incluye todos los campos posibles",
    estado: "en_progreso",
    prioridad: "alta",
    fechaCreacion: "2024-01-01T00:00:00.000Z",
    fechaVencimiento: "2024-12-31T23:59:59.000Z",
    asignadoA: "desarrollador_senior",
    etiquetas: ["importante", "urgente", "cliente_vip"],
    completada: false,
    progreso: 75,
    metadata: {
      proyecto: "Proyecto Alpha",
      cliente: "Cliente Premium",
      estimacion: "8 horas",
    },
  },

  // Escenario de tarea completada
  completed: {
    titulo: "Tarea Completada",
    descripcion: "Esta tarea ya fue completada",
    estado: "completada",
    prioridad: "baja",
    completada: true,
    progreso: 100,
    fechaCompletada: new Date().toISOString(),
  },
};

/**
 * IDs de prueba que no existen
 */
const nonExistentIds = [
  "id_que_no_existe_123",
  "fake_id_456",
  "invalid_document_id",
  "000000000000000000000000",
];

/**
 * Genera un conjunto de datos aleatorios para pruebas de carga
 * @param {number} count - Número de elementos a generar
 * @returns {Array} Array de objetos de tarea
 */
function generateBulkTestData(count = 10) {
  const estados = ["pendiente", "en_progreso", "completada", "cancelada"];
  const prioridades = ["baja", "media", "alta", "critica"];
  const usuarios = ["usuario1", "usuario2", "usuario3", "admin"];

  return Array.from({ length: count }, (_, index) => ({
    titulo: `Tarea Masiva ${index + 1}`,
    descripcion: `Descripción generada automáticamente para la tarea ${
      index + 1
    }`,
    estado: estados[Math.floor(Math.random() * estados.length)],
    prioridad: prioridades[Math.floor(Math.random() * prioridades.length)],
    asignadoA: usuarios[Math.floor(Math.random() * usuarios.length)],
    completada: Math.random() > 0.5,
    progreso: Math.floor(Math.random() * 101),
    fechaCreacion: new Date().toISOString(),
  }));
}

module.exports = {
  createValidTaskData,
  createInvalidTaskData,
  createUpdateData,
  testScenarios,
  nonExistentIds,
  generateBulkTestData,
};
