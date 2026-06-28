import { handler } from '@src/handlers/projects/createProject';
import * as projectService from '@src/services/project.service';
import type { ProjectEntity } from '@src/types/entities';
import type { APIGatewayProxyEvent } from 'aws-lambda';

jest.mock('@src/services/project.service');

const mockCreateProject = jest.mocked(projectService.createProject);

function makeEvent(body: unknown): APIGatewayProxyEvent {
  return {
    body: body === null ? null : JSON.stringify(body),
    headers: {},
    httpMethod: 'POST',
    path: '/projects',
    pathParameters: null,
    queryStringParameters: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
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

describe('createProject handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 201 with created project', async () => {
    mockCreateProject.mockResolvedValueOnce(mockProject);

    const result = await handler(makeEvent({ name: 'Test Project' }));

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      data: mockProject,
    });
    expect(mockCreateProject).toHaveBeenCalledWith('Test Project');
  });

  it('returns 400 when body is null', async () => {
    const result = await handler(makeEvent(null));
    expect(result.statusCode).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const result = await handler(makeEvent({}));
    expect(result.statusCode).toBe(400);
  });

  it('returns 400 when name is empty string', async () => {
    const result = await handler(makeEvent({ name: '' }));
    expect(result.statusCode).toBe(400);
  });

  it('returns 500 when service throws unexpected error', async () => {
    mockCreateProject.mockRejectedValueOnce(new Error('DynamoDB unreachable'));
    const spy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const result = await handler(makeEvent({ name: 'Test' }));

    expect(result.statusCode).toBe(500);
    spy.mockRestore();
  });
});
