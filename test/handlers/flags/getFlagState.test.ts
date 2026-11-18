import { handler } from '@src/handlers/flags/getFlagState';
import * as flagService from '@src/services/flag.service';
import type { FlagEnvironmentEntity } from '@src/types/entities';
import { NotFoundError } from '@src/types/errors';
import { makeEvent } from '../../setup/makeEvent';

jest.mock('@src/services/flag.service');
jest.mock('@src/utils/logger', () => ({
  createLogger: (): { info: jest.Mock; warn: jest.Mock; error: jest.Mock } => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterAll(() => {
  jest.restoreAllMocks();
});

const mockGetFlagState = jest.mocked(flagService.getFlagState);

const mockState: FlagEnvironmentEntity = {
  entityType: 'FLAG_ENVIRONMENT',
  PK: 'PROJECT#project-123',
  SK: 'FLAGENV#dark-mode#env-456',
  GSI1PK: 'ENV#project-123#env-456',
  GSI1SK: 'FLAG#dark-mode',
  projectId: 'project-123',
  envId: 'env-456',
  flagKey: 'dark-mode',
  enabled: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const fullPathParameters = {
  projectId: 'project-123',
  flagKey: 'dark-mode',
  envId: 'env-456',
};

const getEvent = (): ReturnType<typeof makeEvent> =>
  makeEvent({
    httpMethod: 'GET',
    pathParameters: fullPathParameters,
  });

const missingPathParameters: [string, Record<string, string>][] = [
  ['projectId is missing', { flagKey: 'dark-mode', envId: 'env-456' }],
  ['flagKey is missing', { projectId: 'project-123', envId: 'env-456' }],
  ['envId is missing', { projectId: 'project-123', flagKey: 'dark-mode' }],
];

describe('getFlagState handler', () => {
  test('returns 200 with the flag state', async () => {
    mockGetFlagState.mockResolvedValueOnce(mockState);

    const event = getEvent();
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      success: true,
      data: mockState,
    });
    expect(mockGetFlagState).toHaveBeenCalledWith(
      'project-123',
      'dark-mode',
      'env-456',
    );
  });

  test('returns 400 when pathParameters is null', async () => {
    const event = makeEvent({
      httpMethod: 'GET',
    });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(mockGetFlagState).not.toHaveBeenCalled();
  });

  test.each(missingPathParameters)(
    'returns 400 when %s',
    async (_label, pathParameters) => {
      const event = makeEvent({
        httpMethod: 'GET',
        pathParameters,
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(mockGetFlagState).not.toHaveBeenCalled();
    },
  );

  test('returns 404 when the flag state does not exist', async () => {
    mockGetFlagState.mockRejectedValueOnce(new NotFoundError('Flag dark-mode'));
    const response = await handler(getEvent());

    expect(response.statusCode).toBe(404);
  });

  test('returns 500 when the service throws an Error', async () => {
    mockGetFlagState.mockRejectedValueOnce(new Error('boom'));
    const response = await handler(getEvent());

    expect(response.statusCode).toBe(500);
  });

  test('returns 500 when the service rejects with a non-Error value', async () => {
    mockGetFlagState.mockRejectedValueOnce('boom');
    const response = await handler(getEvent());

    expect(response.statusCode).toBe(500);
  });
});
