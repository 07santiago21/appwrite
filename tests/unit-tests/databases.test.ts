// Importamos axios para simular peticiones HTTP
import axios from 'axios';

// Aplicamos un TEST DOUBLE simulando axios con Jest
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Databases Module', () => {

  // Cada prueba sigue el patrón AAA: Arrange – Act – Assert
  it('debería crear una base de datos', async () => {
    // ✅ Arrange
    const body = { databaseId: 'db1', name: 'MiDB' };
    const mockResponse = { data: { $id: 'db1', name: 'MiDB' } };
    mockedAxios.post.mockResolvedValue(mockResponse); // Test Double

    // Act
    const response = await axios.post('/v1/databases', body);

    // Assert — FLUENT ASSERTIONS
    expect(response.data.$id).toBe('db1');
  });

  it('debería eliminar una base de datos', async () => {
    // Arrange
    mockedAxios.delete.mockResolvedValue({ status: 204 }); // Test Double

    // Act
    const response = await axios.delete('/v1/databases/db1');

    // Assert
    expect(response.status).toBe(204); // Fluent Assertion
  });

  it('debería crear una colección', async () => {
    const body = { collectionId: 'col1', name: 'Usuarios' };
    const mockResponse = { data: { $id: 'col1', name: 'Usuarios' } };
    mockedAxios.post.mockResolvedValue(mockResponse); // Test Double

    const response = await axios.post('/v1/databases/db1/collections', body);

    expect(response.data.name).toBe('Usuarios'); // Fluent
  });

  it('debería actualizar una colección', async () => {
    const body = { name: 'Usuarios Actualizada' };
    const mockResponse = { data: { $id: 'col1', name: 'Usuarios Actualizada' } };
    mockedAxios.patch.mockResolvedValue(mockResponse); // Test Double

    const response = await axios.patch('/v1/databases/db1/collections/col1', body);

    expect(response.data.name).toBe('Usuarios Actualizada'); // Fluent
  });

  it('debería listar colecciones', async () => {
    const mockResponse = {
      data: {
        total: 2,
        collections: [
          { $id: 'col1', name: 'Usuarios' },
          { $id: 'col2', name: 'Productos' }
        ]
      }
    };
    mockedAxios.get.mockResolvedValue(mockResponse); // Test Double

    const response = await axios.get('/v1/databases/db1/collections');

    expect(response.data.collections).toHaveLength(2);           // Fluent
    expect(response.data.collections[1].name).toBe('Productos'); // Fluent
  });

});
