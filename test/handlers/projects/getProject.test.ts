import { handler } from '@src/handlers/projects/getProject';
import * as projectService from '@src/services/project.service';
import type { ProjectEntity } from '@src/types/entities';
import type { APIGatewayProxyEvent } from 'aws-lambda';

jest.mock('@src/services/project.service');

jest.mock('@src/utils/logger', () => ({
  createLogger: (): Record<string, unknown> => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockGetProject = jest.mocked(projectService.getProject);

function makeEvent(projectId: string | null): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    httpMethod: 'GET',
    path: `/projects/${projectId ?? ''}`,
    pathParameters: {
      projectId: projectId ?? '',
    },
    queryStringParameters: null,
    requestContext: {
      requestId: 'test-request-id',
    } as APIGatewayProxyEvent['requestContext'],
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    resource: '',
    stageVariables: null,
  };
}

const mockProject: ProjectEntity = {
  entityType: 'PROJECT',
  PK: 'PROJECT#123',
  SK: 'METADATA',
  projectId: '123',
  name: 'Test Project',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('getProject handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with project when found', async () => {
    mockGetProject.mockResolvedValueOnce(mockProject);
    const result = await handler(makeEvent('123'));
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      data: mockProject,
    });
  });

  it('returns 400 when projectId is missing', async () => {
    const result = await handler(makeEvent(''));
    expect(result.statusCode).toBe(400);
  });

  it('returns 404 when project does not exist', async () => {
    const { NotFoundError } = await import('@src/types/errors');
    mockGetProject.mockRejectedValueOnce(new NotFoundError('Project 999'));
    const result = await handler(makeEvent('999'));
    expect(result.statusCode).toBe(404);
  });
});
