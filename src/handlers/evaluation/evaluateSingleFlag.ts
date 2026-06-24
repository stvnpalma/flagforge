import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { evaluateSingleFlag } from '../../services/evaluation.service';
import { ValidationError } from '../../types/errors';
import { errorResponse, ok } from '../../utils/http';
import { createLogger } from '../../utils/logger';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const logger = createLogger(event.requestContext.requestId);
  const start = Date.now();

  try {
    const projectId = event.pathParameters?.projectId;
    const envId = event.pathParameters?.envId;
    const flagKey = event.pathParameters?.flagKey;

    if (!projectId || !envId || !flagKey) {
      throw new ValidationError(
        'projectId, envId, and flagKey path parameters are required',
      );
    }
    const enabled = await evaluateSingleFlag(projectId, envId, flagKey);
    const response = ok({ flagKey, enabled });

    logger.info('evaluateSingleFlag succeeded', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
    });
    return response;
  } catch (error) {
    const response = errorResponse(error);
    logger.info('evaluateSingleFlag failed', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    return response;
  }
};
