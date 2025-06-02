// Se importa axios para simular peticiones HTTP
import axios from 'axios';

// Se aplica un TEST DOUBLE (mock): simulamos el comportamiento real de axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Projects Module', () => {

  // Cada test sigue el patrón AAA: Arrange, Act, Assert
  it('debería obtener detalles del proyecto', async () => {
    // Arrange
    const mockResponse = { data: { $id: 'project123', name: 'Proyecto A' } };
    mockedAxios.get.mockResolvedValue(mockResponse); // Test Double simulando respuesta de axios

    // Act
    const response = await axios.get('/v1/projects');

    // Assert — FLUENT ASSERTIONS
    expect(response.data.$id).toBe('project123');
    expect(response.data.name).toBe('Proyecto A');
    // Principios FIRST: es rápido, aislado, repetible, claro y temporal
  });

  it('debería actualizar el nombre del proyecto', async () => {
    const updated = { name: 'Nuevo Nombre' };
    const mockResponse = { data: { $id: 'project123', name: 'Nuevo Nombre' } };
    mockedAxios.patch.mockResolvedValue(mockResponse); // Test Double

    const response = await axios.patch('/v1/projects', updated);

    expect(response.data.name).toBe('Nuevo Nombre'); // Fluent Assertion
  });

  it('debería eliminar un proyecto', async () => {
    mockedAxios.delete.mockResolvedValue({ status: 204 }); // Test Double

    const response = await axios.delete('/v1/projects/project123');

    expect(response.status).toBe(204); // Fluent Assertion
  });

  it('debería listar todos los proyectos', async () => {
    const mockResponse = {
      data: {
        total: 2,
        projects: [
          { $id: 'p1', name: 'P1' },
          { $id: 'p2', name: 'P2' }
        ]
      }
    };
    mockedAxios.get.mockResolvedValue(mockResponse); // Test Double

    const response = await axios.get('/v1/projects');

    expect(response.data.total).toBe(2);               // Fluent
    expect(response.data.projects[1].name).toBe('P2'); // Fluent
  });

  it('debería actualizar descripción del proyecto', async () => {
    const update = { description: 'Actualizado' };
    const mockResponse = { data: { $id: 'project123', description: 'Actualizado' } };
    mockedAxios.patch.mockResolvedValue(mockResponse); // Test Double

    const response = await axios.patch('/v1/projects/project123', update);

    expect(response.data.description).toBe('Actualizado'); // Fluent
  });

});
