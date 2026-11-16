import { handler } from '@src/handlers/environments/listEnvironments';
import * as environmentService from '@src/services/environment.service';
import type { EnvironmentEntity } from '@src/types/entities';
import { NotFoundError } from '@src/types/errors';
import { makeEvent } from '../../setup/makeEvent';

jest.mock('@src/services/environment.service');
jest.mock('@src/utils/logger', () => ({
  createLogger: (): { info: jest.Mock; warn: jest.Mock; error: jest.Mock } => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockListEnvironments = jest.mocked(environmentService.listEnvironments);

const mockEnvironment: EnvironmentEntity = {
  entityType: 'ENVIRONMENT',
  PK: 'PROJECT#project-123',
  SK: 'ENV#env-456',
  projectId: 'project-123',
  envId: 'env-456',
  name: 'Production',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('listEnvironments handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 200 with the environments for the project', async () => {
    mockListEnvironments.mockResolvedValueOnce([mockEnvironment]);

    const result = await handler(
      makeEvent({ pathParameters: { projectId: 'project-123' } }),
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      data: [mockEnvironment],
    });
    expect(mockListEnvironments).toHaveBeenCalledWith('project-123');
  });

  test('returns 200 with an empty array when there are no environments', async () => {
    mockListEnvironments.mockResolvedValueOnce([]);

    const result = await handler(
      makeEvent({ pathParameters: { projectId: 'project-123' } }),
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      data: [],
    });
  });

  test('returns 400 when pathParameters is null', async () => {
    const result = await handler(makeEvent());

    expect(result.statusCode).toBe(400);
    expect(mockListEnvironments).not.toHaveBeenCalled();
  });

  test('returns 400 when projectId is missing from pathParameters', async () => {
    const result = await handler(makeEvent({ pathParameters: {} }));

    expect(result.statusCode).toBe(400);
    expect(mockListEnvironments).not.toHaveBeenCalled();
  });

  test('returns 404 when the project does not exist', async () => {
    mockListEnvironments.mockRejectedValueOnce(
      new NotFoundError('Project project-123'),
    );

    const result = await handler(
      makeEvent({ pathParameters: { projectId: 'project-123' } }),
    );

    expect(result.statusCode).toBe(404);
  });

  test('returns 500 when the service throws an Error', async () => {
    mockListEnvironments.mockRejectedValueOnce(new Error('boom'));

    const result = await handler(
      makeEvent({ pathParameters: { projectId: 'project-123' } }),
    );

    expect(result.statusCode).toBe(500);
  });

  test('returns 500 when the service rejects with a non-Error value', async () => {
    mockListEnvironments.mockRejectedValueOnce('boom');

    const result = await handler(
      makeEvent({ pathParameters: { projectId: 'project-123' } }),
    );

    expect(result.statusCode).toBe(500);
  });
});
