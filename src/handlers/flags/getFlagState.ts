import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getFlagState } from '../../services/flag.service';
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
    const envId = event.pathParameters?.envId;

    if (!projectId || !flagKey || !envId) {
      throw new ValidationError(
        'projectId, flagKey, and envId path parameters are required',
      );
    }

    const state = await getFlagState(projectId, flagKey, envId);
    const response = ok(state);

    logger.info('getFlagState succeeded', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
    });

    return response;
  } catch (error) {
    const response = errorResponse(error);
    logger.error('getFlagState failed', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    return response;
  }
};
