import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listProjects } from '../../services/project.service';
import { errorResponse, ok } from '../../utils/http';
import { createLogger } from '../../utils/logger';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const logger = createLogger(event.requestContext.requestId);
  const start = Date.now();

  try {
    const projects = await listProjects();
    const response = ok(projects);

    logger.info('listProjects succeeded', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
    });

    return response;
  } catch (error) {
    const response = errorResponse(error);

    logger.error('listProjects failed', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });

    return response;
  }
};
