import { ForbiddenError } from '@src/types/errors';
import { assertProjectAccess } from '@src/utils/authContext';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { makeEvent } from '../setup/makeEvent';

type AuthorizerContext = APIGatewayProxyEvent['requestContext']['authorizer'];

function eventWithAuthorizer(
  authorizer: AuthorizerContext,
): APIGatewayProxyEvent {
  return makeEvent({
    requestContext: {
      requestId: 'test-request-id',
      authorizer,
    } as APIGatewayProxyEvent['requestContext'],
  });
}

const PATH_PROJECT_ID = 'project-123';

const deniedContexts: [string, AuthorizerContext][] = [
  ['there is no authorizer context', undefined],
  ['the authorizer context is null', null],
  ['the authorizer context has no projectId', {}],
  ['projectId is a number, not a string', { projectId: 123 }],
  ['projectId is an empty string', { projectId: '' }],
  ['the key belongs to another project', { projectId: 'project-999' }],
  ['projectId differs only by case', { projectId: 'Project-123' }],
];

describe('assertProjectAccess()', () => {
  test('allows the request when the key belongs to the path project', () => {
    const event = eventWithAuthorizer({ projectId: PATH_PROJECT_ID });

    expect(() => {
      assertProjectAccess(event, PATH_PROJECT_ID);
    }).not.toThrow();
  });

  test.each(deniedContexts)(
    'denies with ForbiddenError when %s',
    (_description, authorizer) => {
      const event = eventWithAuthorizer(authorizer);

      expect(() => {
        assertProjectAccess(event, PATH_PROJECT_ID);
      }).toThrow(ForbiddenError);
    },
  );

  test('uses a message that does not reveal which project owns the key', () => {
    const event = eventWithAuthorizer({ projectId: 'project-999' });

    expect(() => {
      assertProjectAccess(event, PATH_PROJECT_ID);
    }).toThrow('API key does not belong to this project');
  });
});
