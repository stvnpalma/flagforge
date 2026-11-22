import { handler } from '@src/handlers/evaluation/evaluateFlags';
import * as evaluationService from '@src/services/evaluation.service';
import type { APIGatewayProxyEvent } from 'aws-lambda';

jest.mock('@src/services/evaluation.service');

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

jest.mock('@src/utils/logger', () => ({
  createLogger: (): typeof mockLogger => mockLogger,
}));

const mockEvaluateFlags = jest.mocked(evaluationService.evaluateFlags);

type AuthorizerContext = APIGatewayProxyEvent['requestContext']['authorizer'];

function makeEvent(
  projectId: string | null,
  envId: string | null,
  authorizer: AuthorizerContext = { projectId: 'project-123' },
): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    httpMethod: 'GET',
    path: `/projects/${projectId ?? ''}/environments/${envId ?? ''}/evaluate`,
    pathParameters: projectId && envId ? { projectId, envId } : null,
    queryStringParameters: null,
    requestContext: {
      requestId: 'test-request-id',
      authorizer,
    } as APIGatewayProxyEvent['requestContext'],
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    resource: '',
    stageVariables: null,
  };
}

describe('evaluateFlags handler', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with the flag map', async () => {
    mockEvaluateFlags.mockResolvedValueOnce({ 'dark-mode': true });
    const result = await handler(makeEvent('project-123', 'env-456'));
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      data: { 'dark-mode': true },
    });
  });

  it('returns 400 when path parameters are missing', async () => {
    const result = await handler(makeEvent(null, null));
    expect(result.statusCode).toBe(400);
  });

  it('returns 403 and evaluates nothing when the key belongs to another project', async () => {
    const result = await handler(
      makeEvent('project-123', 'env-456', { projectId: 'project-999' }),
    );

    expect(result.statusCode).toBe(403);
    expect(mockEvaluateFlags).not.toHaveBeenCalled();
  });

  it('returns 403 and evaluates nothing when there is no authorizer context', async () => {
    const result = await handler(makeEvent('project-123', 'env-456', null));

    expect(result.statusCode).toBe(403);
    expect(mockEvaluateFlags).not.toHaveBeenCalled();
  });

  it('logs a denied request with logger.error', async () => {
    await handler(
      makeEvent('project-123', 'env-456', { projectId: 'project-999' }),
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      'evaluateFlags failed',
      expect.objectContaining({ statusCode: 403 }),
    );
  });
});
