import { handler } from '@src/handlers/environments/createEnvironment';
import * as environmentService from '@src/services/environment.service';
import type { EnvironmentEntity } from '@src/types/entities';
import { NotFoundError } from '@src/types/errors';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

jest.mock('@src/services/environment.service');
jest.mock('@src/utils/logger', () => ({
  // FIXED: Added an explicit return type object structure for the arrow function mock factory
  createLogger: (): { info: jest.Mock; warn: jest.Mock; error: jest.Mock } => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockCreateEnvironment = jest.mocked(environmentService.createEnvironment);

function makeEvent(
  projectId: string | null,
  body: unknown,
): APIGatewayProxyEvent {
  return {
    body: body === null ? null : JSON.stringify(body),
    headers: {},
    httpMethod: 'POST',
    path: `/projects/${projectId ?? ''}/environments`,
    pathParameters: projectId ? { projectId } : null,
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

const mockEnvironment: EnvironmentEntity = {
  entityType: 'ENVIRONMENT',
  PK: 'PROJECT#project-123',
  SK: 'ENV#env-456',
  projectId: 'project-123',
  envId: 'env-456',
  name: 'Production',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('createEnvironment handler', (): void => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  it('returns 201 with created environment', async (): Promise<void> => {
    mockCreateEnvironment.mockResolvedValueOnce(mockEnvironment);

    const result: APIGatewayProxyResult = await handler(
      makeEvent('project-123', { name: 'Production' }),
    );

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      data: mockEnvironment,
    });
    expect(mockCreateEnvironment).toHaveBeenCalledWith(
      'project-123',
      'Production',
    );
  });

  it('returns 400 when projectId is missing', async (): Promise<void> => {
    const result: APIGatewayProxyResult = await handler(
      makeEvent(null, { name: 'Production' }),
    );
    expect(result.statusCode).toBe(400);
  });

  it('returns 400 when name is missing', async (): Promise<void> => {
    const result: APIGatewayProxyResult = await handler(
      makeEvent('project-123', {}),
    );
    expect(result.statusCode).toBe(400);
  });

  it('returns 404 when project does not exist', async (): Promise<void> => {
    mockCreateEnvironment.mockRejectedValueOnce(
      new NotFoundError('Project project-123'),
    );

    const result: APIGatewayProxyResult = await handler(
      makeEvent('project-123', { name: 'Production' }),
    );
    expect(result.statusCode).toBe(404);
  });
});
