import { handler } from '@src/handlers/auth/apiKeyAuthorizer';
import * as apiKeyService from '@src/services/apikey.service';
import type { ApiKeyEntity } from '@src/types/entities';
import { NotFoundError } from '@src/types/errors';
import type { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';

jest.mock('@src/services/apikey.service');
jest.mock('@src/utils/logger', () => ({
  createLogger: (): { info: jest.Mock; warn: jest.Mock; error: jest.Mock } => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockVerifyApiKey = jest.mocked(apiKeyService.verifyApiKey);

const METHOD_ARN =
  'arn:aws:execute-api:us-east-1:123456789012:abc123/prod/GET/projects/p1/environments/e1/evaluate';

const mockApiKey: ApiKeyEntity = {
  entityType: 'API_KEY',
  PK: 'APIKEY#hash123',
  SK: 'METADATA',
  keyHash: 'hash123',
  projectId: 'project-123',
  createdAt: '2024-01-01T00:00:00.000Z',
};

function makeAuthorizerEvent(
  overrides: Partial<APIGatewayRequestAuthorizerEvent> = {},
): APIGatewayRequestAuthorizerEvent {
  return {
    type: 'REQUEST',
    methodArn: METHOD_ARN,
    resource: '',
    path: '/projects/p1/environments/e1/evaluate',
    httpMethod: 'GET',
    headers: { 'x-api-key': 'ffk_test-key' },
    multiValueHeaders: null,
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      requestId: 'test-request-id',
    } as unknown as APIGatewayRequestAuthorizerEvent['requestContext'],
    ...overrides,
  };
}

describe('apiKeyAuthorizer handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns an Allow policy scoped to the stage when the key is valid', async () => {
    mockVerifyApiKey.mockResolvedValueOnce(mockApiKey);

    const result = await handler(makeAuthorizerEvent());

    expect(result).toEqual({
      principalId: mockApiKey.keyHash,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource:
              'arn:aws:execute-api:us-east-1:123456789012:abc123/prod/*',
          },
        ],
      },
      context: {
        projectId: mockApiKey.projectId,
      },
    });
    expect(mockVerifyApiKey).toHaveBeenCalledWith('ffk_test-key');
  });

  test('falls back to a wildcard stage when the method ARN has no stage segment', async () => {
    mockVerifyApiKey.mockResolvedValueOnce(mockApiKey);

    const result = await handler(
      makeAuthorizerEvent({
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abc123',
      }),
    );

    const statement = result.policyDocument.Statement[0] as {
      Resource: string;
    };
    expect(statement.Resource).toBe(
      'arn:aws:execute-api:us-east-1:123456789012:abc123/*/*',
    );
  });

  test('throws Unauthorized when the x-api-key header is missing', async () => {
    await expect(handler(makeAuthorizerEvent({ headers: {} }))).rejects.toThrow(
      'Unauthorized',
    );

    expect(mockVerifyApiKey).not.toHaveBeenCalled();
  });

  test('throws Unauthorized when headers is null', async () => {
    await expect(
      handler(makeAuthorizerEvent({ headers: null })),
    ).rejects.toThrow('Unauthorized');

    expect(mockVerifyApiKey).not.toHaveBeenCalled();
  });

  test('throws Unauthorized when the key fails verification', async () => {
    mockVerifyApiKey.mockRejectedValueOnce(new NotFoundError('Api Key'));

    await expect(handler(makeAuthorizerEvent())).rejects.toThrow(
      'Unauthorized',
    );
  });
});
