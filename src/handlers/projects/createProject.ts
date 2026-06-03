import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createProject } from '../../services/project.service';
import { created, errorResponse } from '../../utils/http';
import { parseBody, requireString } from '../../utils/validation';

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const body = parseBody(event.body);
    const name = requireString(body, 'name');

    const project = await createProject(name);

    return created(project);
  } catch (error) {
    return errorResponse(error);
  }
};
