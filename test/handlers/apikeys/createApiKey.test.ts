import { handler } from '@src/handlers/apikeys/createApiKey';
import * as apiKeyService from '@src/services/apikey.service';
import * as projectService from '@src/services/project.service';
import type { ApiKeyEntity, ProjectEntity } from '@src/types/entities';
import { NotFoundError } from '@src/types/errors';
import { makeEvent } from '../../setup/makeEvent';

jest.mock('@src/services/apikey.service');
jest.mock('@src/services/project.service');
jest.mock('@src/utils/logger', () => ({
  createLogger: (): { info: jest.Mock; warn: jest.Mock; error: jest.Mock } => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterAll(() => {
  jest.restoreAllMocks();
});

const mockCreateApiKey = jest.mocked(apiKeyService.createApiKey);
const mockGetProject = jest.mocked(projectService.getProject);

const RAW_KEY = 'ffk_0123456789abcdef0123456789abcdef0123456789abcdef';

const mockEntity: ApiKeyEntity = {
  entityType: 'API_KEY',
  PK: 'APIKEY#hash-must-not-leak',
  SK: 'METADATA',
  keyHash: 'hash-must-not-leak',
  projectId: 'project-123',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const mockProject: ProjectEntity = {
  entityType: 'PROJECT',
  PK: 'PROJECT#project-123',
  SK: 'METADATA',
  GSI1PK: 'PROJECT',
  GSI1SK: 'PROJECT#project-123',
  projectId: 'project-123',
  name: 'Test Project',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const postEvent = (): ReturnType<typeof makeEvent> =>
  makeEvent({
    httpMethod: 'POST',
    pathParameters: { projectId: 'project-123' },
  });

describe('createApiKey handler', () => {
  test('returns 201 with exactly the raw key, projectId and createdAt', async () => {
    mockGetProject.mockResolvedValueOnce(mockProject);
    mockCreateApiKey.mockResolvedValueOnce({
      rawKey: RAW_KEY,
      entity: mockEntity,
    });

    const event = postEvent();
    const response = await handler(event);

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toEqual({
      success: true,
      data: {
        apiKey: RAW_KEY,
        projectId: 'project-123',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(mockGetProject).toHaveBeenCalledWith('project-123');
    expect(mockCreateApiKey).toHaveBeenCalledWith('project-123');
  });

  test('never exposes the stored hash or table keys in the response', async () => {
    mockGetProject.mockResolvedValueOnce(mockProject);
    mockCreateApiKey.mockResolvedValueOnce({
      rawKey: RAW_KEY,
      entity: mockEntity,
    });

    const event = postEvent();
    const response = await handler(event);

    expect(response.statusCode).toBe(201);
    expect(response.body).not.toContain('hash-must-not-leak');
    expect(response.body).not.toContain('METADATA');
  });

  test('returns 404 and creates no key when the project does not exist', async () => {
    mockGetProject.mockRejectedValueOnce(
      new NotFoundError('Project project-123'),
    );

    const event = postEvent();
    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    expect(mockCreateApiKey).not.toHaveBeenCalled();
  });

  test('looks up the project from the path before creating the key', async () => {
    mockGetProject.mockResolvedValueOnce(mockProject);
    mockCreateApiKey.mockResolvedValueOnce({
      rawKey: RAW_KEY,
      entity: mockEntity,
    });

    const event = postEvent();
    await handler(event);

    expect(mockGetProject).toHaveBeenCalledWith('project-123');
  });

  test('returns 400 when pathParameters is null', async () => {
    const event = makeEvent({ httpMethod: 'POST' });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(mockGetProject).not.toHaveBeenCalled();
    expect(mockCreateApiKey).not.toHaveBeenCalled();
  });

  test('returns 400 when projectId is missing from pathParameters', async () => {
    const event = makeEvent({ httpMethod: 'POST', pathParameters: {} });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(mockGetProject).not.toHaveBeenCalled();
    expect(mockCreateApiKey).not.toHaveBeenCalled();
  });

  test('returns 500 when the service throws an Error', async () => {
    mockGetProject.mockResolvedValueOnce(mockProject);
    mockCreateApiKey.mockRejectedValueOnce(new Error('boom'));

    const event = postEvent();
    const response = await handler(event);

    expect(response.statusCode).toBe(500);
  });

  test('returns 500 when the service rejects with a non-Error value', async () => {
    mockGetProject.mockResolvedValueOnce(mockProject);
    mockCreateApiKey.mockRejectedValueOnce('boom');

    const event = postEvent();
    const response = await handler(event);

    expect(response.statusCode).toBe(500);
  });
});
