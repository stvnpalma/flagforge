import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createFlag } from '../../services/flag.service';
import { ValidationError } from '../../types/errors';
import { created, errorResponse } from '../../utils/http';
import { createLogger } from '../../utils/logger';
import {
  optionalString,
  parseBody,
  requireString,
  validateFlagKey,
} from '../../utils/validation';

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

    const body = parseBody(event.body);
    const flagKey = validateFlagKey(requireString(body, 'flagKey'));
    const name = requireString(body, 'name');
    const description = optionalString(body, 'description');

    const flag = await createFlag(projectId, flagKey, name, description);
    const response = created(flag);

    logger.info('createFlag succeeded', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
    });

    return response;
  } catch (error) {
    const response = errorResponse(error);
    logger.error('createFlag failed', {
      path: event.path,
      method: event.httpMethod,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    return response;
  }
};
