import { handler } from '@src/handlers/evaluation/evaluateFlags';
import * as evaluationService from '@src/services/evaluation.service';
import type { APIGatewayProxyEvent } from 'aws-lambda';

jest.mock('@src/services/evaluation.service');

jest.mock('@src/utils/logger', () => ({
  createLogger: (): { info: jest.Mock; warn: jest.Mock; error: jest.Mock } => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockEvaluateFlags = jest.mocked(evaluationService.evaluateFlags);

function makeEvent(
  projectId: string | null,
  envId: string | null,
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
});
