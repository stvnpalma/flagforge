import { handler } from '@src/handlers/projects/listProjects';
import * as projectService from '@src/services/project.service';
import type { ProjectEntity } from '@src/types/entities';
import { makeEvent } from '../../setup/makeEvent';

jest.mock('@src/services/project.service');
jest.mock('@src/utils/logger', () => ({
  createLogger: (): Record<string, unknown> => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockListProjects = jest.mocked(projectService.listProjects);

const mockProject: ProjectEntity = {
  entityType: 'PROJECT',
  PK: 'PROJECT#123',
  SK: 'METADATA',
  GSI1PK: 'PROJECT',
  GSI1SK: 'PROJECT#123',
  projectId: '123',
  name: 'Test Project',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('listProjects handler', () => {
  test('returns 200 with the list of projects', async () => {
    mockListProjects.mockResolvedValueOnce([mockProject]);
    const result = await handler(
      makeEvent({ httpMethod: 'GET', path: '/projects' }),
    );
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      data: [mockProject],
    });
  });

  test('returns 200 with an empty array when there are no projects', async () => {
    mockListProjects.mockResolvedValueOnce([]);
    const result = await handler(
      makeEvent({ httpMethod: 'GET', path: '/projects' }),
    );
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      data: [],
    });
  });

  test('returns 500 when the service throws an Error', async () => {
    mockListProjects.mockRejectedValueOnce(new Error('boom'));
    const result = await handler(
      makeEvent({ httpMethod: 'GET', path: '/projects' }),
    );
    expect(result.statusCode).toBe(500);
  });

  test('returns 500 when the service rejects with a non-Error value', async () => {
    mockListProjects.mockRejectedValueOnce('boom');
    const result = await handler(
      makeEvent({ httpMethod: 'GET', path: '/projects' }),
    );
    expect(result.statusCode).toBe(500);
  });
});
