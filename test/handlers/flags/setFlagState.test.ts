import { handler } from '@src/handlers/flags/setFlagState';
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

const mockSetFlagState = jest.mocked(flagService.setFlagState);

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

const putEvent = (body: string | null): ReturnType<typeof makeEvent> =>
  makeEvent({
    httpMethod: 'PUT',
    pathParameters: fullPathParameters,
    body,
  });

const missingPathParameters: [string, Record<string, string>][] = [
  ['projectId is missing', { flagKey: 'dark-mode', envId: 'env-456' }],
  ['flagKey is missing', { projectId: 'project-123', envId: 'env-456' }],
  ['envId is missing', { projectId: 'project-123', flagKey: 'dark-mode' }],
];

const invalidBodies: [string, string | null][] = [
  ['body is null', null],
  ['body is not valid JSON', '{not json'],
  ['enabled is missing', JSON.stringify({})],
  ['enabled is a string', JSON.stringify({ enabled: 'true' })],
  ['enabled is a number', JSON.stringify({ enabled: 1 })],
];

describe('setFlagState handler', () => {
  test('returns 200 with the new state when enabling a flag', async () => {
    mockSetFlagState.mockResolvedValueOnce(mockState);

    const event = putEvent(JSON.stringify({ enabled: true }));
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      success: true,
      data: mockState,
    });
    expect(mockSetFlagState).toHaveBeenCalledWith(
      'project-123',
      'dark-mode',
      'env-456',
      true,
    );
  });

  test('accepts enabled false and forwards it to the service', async () => {
    const disabledState = { ...mockState, enabled: false };
    mockSetFlagState.mockResolvedValueOnce(disabledState);

    const event = putEvent(JSON.stringify({ enabled: false }));
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      success: true,
      data: disabledState,
    });
    expect(mockSetFlagState).toHaveBeenCalledWith(
      'project-123',
      'dark-mode',
      'env-456',
      false,
    );
  });

  test('returns 400 when pathParameters is null', async () => {
    const event = makeEvent({
      httpMethod: 'PUT',
      body: JSON.stringify({ enabled: true }),
    });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(mockSetFlagState).not.toHaveBeenCalled();
  });

  test.each(missingPathParameters)(
    'returns 400 when %s',
    async (_label, pathParameters) => {
      const event = makeEvent({
        httpMethod: 'PUT',
        pathParameters,
        body: JSON.stringify({ enabled: true }),
      });
      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      expect(mockSetFlagState).not.toHaveBeenCalled();
    },
  );

  test.each(invalidBodies)('returns 400 when %s', async (_label, body) => {
    const event = putEvent(body);
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(mockSetFlagState).not.toHaveBeenCalled();
  });

  test('returns 404 when the flag or environment does not exist', async () => {
    mockSetFlagState.mockRejectedValueOnce(new NotFoundError('Flag dark-mode'));
    const response = await handler(putEvent(JSON.stringify({ enabled: true })));

    expect(response.statusCode).toBe(404);
  });

  test('returns 500 when the service throws an Error', async () => {
    mockSetFlagState.mockRejectedValueOnce(new Error('boom'));
    const response = await handler(putEvent(JSON.stringify({ enabled: true })));

    expect(response.statusCode).toBe(500);
  });

  test('returns 500 when the service rejects with a non-Error value', async () => {
    mockSetFlagState.mockRejectedValueOnce('boom');
    const response = await handler(putEvent(JSON.stringify({ enabled: true })));

    expect(response.statusCode).toBe(500);
  });
});
