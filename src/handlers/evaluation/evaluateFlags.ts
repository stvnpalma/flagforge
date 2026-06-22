import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { evaluateFlags } from '../../services/evaluation.service';
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

    if (!projectId || !envId) {
      throw new ValidationError(
        'projectId and envId path path parameters are required',
      );
    }

    const flags = await evaluateFlags(projectId, envId);
    const response = ok(flags);

    logger.info('evaluateFlags succeeded', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
      flagCount: Object.keys(flags).length,
    });
    return response;
  } catch (error) {
    const response = errorResponse(error);
    logger.error('evaluateFlags failed', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    return response;
  }
};
