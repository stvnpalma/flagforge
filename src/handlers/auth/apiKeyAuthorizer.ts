import type {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerEvent,
} from 'aws-lambda';
import { verifyApiKey } from '../../services/apikey.service';
import { createLogger } from '../../utils/logger';

function buildPolicy(
  effect: 'Allow' | 'Deny',
  resource: string,
  principalId: string,
  context?: Record<string, string>,
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    ...(context ? { context } : {}),
  };
}

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent,
): Promise<APIGatewayAuthorizerResult> => {
  const logger = createLogger(event.requestContext.requestId);
  const rawKey = event.headers?.['x-api-key'];

  if (!rawKey) {
    logger.warn('apiKeyAuthorizer denied — missing x-api-key header');
    throw new Error('Unauthorized');
  }

  try {
    const apiKeyEntity = await verifyApiKey(rawKey);

    const methodArn = event.methodArn;
    const arnParts = methodArn.split('/');

    const baseArn = arnParts[0] ?? '';
    const stage = arnParts[1] ?? '*';
    const wildcardResource = `${baseArn}/${stage}/*`;

    logger.info('apiKeyAuthorizer allowed with broad stage scope', {
      projectId: apiKeyEntity.projectId,
      resource: wildcardResource,
    });

    return buildPolicy('Allow', wildcardResource, apiKeyEntity.keyHash, {
      projectId: apiKeyEntity.projectId,
    });
  } catch {
    logger.warn('apiKeyAuthorizer denied — invalid key');
    throw new Error('Unauthorized');
  }
};
