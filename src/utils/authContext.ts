import type { APIGatewayProxyEvent } from 'aws-lambda';
import { ForbiddenError } from '../types/errors';

export function assertProjectAccess(
  event: APIGatewayProxyEvent,
  projectId: string,
): void {
  const authorizedProjectId: unknown =
    event.requestContext.authorizer?.projectId;

  if (
    typeof authorizedProjectId !== 'string' ||
    authorizedProjectId !== projectId
  ) {
    throw new ForbiddenError('API key does not belong to this project');
  }
}
