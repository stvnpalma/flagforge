import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listEnvironments } from '../../services/environment.service';
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

    if (!projectId) {
      throw new ValidationError('projectId path parameter is required');
    }

    const environments = await listEnvironments(projectId);
    const response = ok(environments);

    logger.info('listEnvironments succeeded', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
    });

    return response;
  } catch (error) {
    const response = errorResponse(error);

    logger.error('listEnvironments failed', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });

    return response;
  }
};
