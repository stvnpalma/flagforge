import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { setFlagState } from '../../services/flag.service';
import { ValidationError } from '../../types/errors';
import { errorResponse, ok } from '../../utils/http';
import { createLogger } from '../../utils/logger';
import { parseBody, requireBoolean } from '../../utils/validation';

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

    const body = parseBody(event.body);
    const enabled = requireBoolean(body, 'enabled');

    const state = await setFlagState(projectId, flagKey, envId, enabled);
    const response = ok(state);

    logger.info('setFlagState succeeded', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
    });

    return response;
  } catch (error) {
    const response = errorResponse(error);
    logger.error('setFlagState failed', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    return response;
  }
};
