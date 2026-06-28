import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getFlag } from '../../services/flag.service';
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
    const flagKey = event.pathParameters?.flagKey;
    if (!projectId || !flagKey) {
      throw new ValidationError(
        'projectId and flagKey path parameters are required',
      );
    }

    const flag = await getFlag(projectId, flagKey);
    const response = ok(flag);

    logger.info('getFlag succeeded', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
    });

    return response;
  } catch (error) {
    const response = errorResponse(error);
    logger.error('getFlag failed', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    return response;
  }
};
