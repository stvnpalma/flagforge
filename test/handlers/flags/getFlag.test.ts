import { handler } from '@src/handlers/flags/getFlag';
import * as flagService from '@src/services/flag.service';
import type { FlagEntity } from '@src/types/entities';
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

const mockGetFlag = jest.mocked(flagService.getFlag);

const mockFlag: FlagEntity = {
  entityType: 'FLAG',
  PK: 'PROJECT#project-123',
  SK: 'FLAG#dark-mode',
  projectId: 'project-123',
  flagKey: 'dark-mode',
  name: 'Dark Mode',
  description: 'Enable dark mode theme',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('getFlag handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 200 with the flag', async () => {
    mockGetFlag.mockResolvedValueOnce(mockFlag);

    const result = await handler(
      makeEvent({
        pathParameters: { projectId: 'project-123', flagKey: 'dark-mode' },
      }),
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      data: mockFlag,
    });
    expect(mockGetFlag).toHaveBeenCalledWith('project-123', 'dark-mode');
  });

  test('returns 400 when pathParameters is null', async () => {
    const result = await handler(makeEvent());

    expect(result.statusCode).toBe(400);
    expect(mockGetFlag).not.toHaveBeenCalled();
  });

  test('returns 400 when projectId is missing', async () => {
    const result = await handler(
      makeEvent({ pathParameters: { flagKey: 'dark-mode' } }),
    );

    expect(result.statusCode).toBe(400);
    expect(mockGetFlag).not.toHaveBeenCalled();
  });

  test('returns 400 when flagKey is missing', async () => {
    const result = await handler(
      makeEvent({ pathParameters: { projectId: 'project-123' } }),
    );

    expect(result.statusCode).toBe(400);
    expect(mockGetFlag).not.toHaveBeenCalled();
  });

  test('returns 404 when the flag does not exist', async () => {
    mockGetFlag.mockRejectedValueOnce(new NotFoundError('Flag dark-mode'));

    const result = await handler(
      makeEvent({
        pathParameters: { projectId: 'project-123', flagKey: 'dark-mode' },
      }),
    );

    expect(result.statusCode).toBe(404);
  });

  test('returns 500 when the service throws an Error', async () => {
    mockGetFlag.mockRejectedValueOnce(new Error('boom'));

    const result = await handler(
      makeEvent({
        pathParameters: { projectId: 'project-123', flagKey: 'dark-mode' },
      }),
    );
    expect(result.statusCode).toBe(500);
  });

  test('returns 500 when the service rejects with a non-Error value', async () => {
    mockGetFlag.mockRejectedValueOnce('boom');

    const result = await handler(
      makeEvent({
        pathParameters: { projectId: 'project-123', flagKey: 'dark-mode' },
      }),
    );
    expect(result.statusCode).toBe(500);
  });
});
