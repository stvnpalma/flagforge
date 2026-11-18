import { handler } from '@src/handlers/flags/listFlags';
import * as flagService from '@src/services/flag.service';
import type { FlagEntity } from '@src/types/entities';
import { makeEvent } from '../../setup/makeEvent';

jest.mock('@src/services/flag.service');
jest.mock('@src/utils/logger', () => ({
  createLogger: (): { info: jest.Mock; warn: jest.Mock; error: jest.Mock } => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockListFlags = jest.mocked(flagService.listFlags);

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

describe('listFlags handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 200 with flags for the project', async () => {
    mockListFlags.mockResolvedValueOnce([mockFlag]);

    const result = await handler(
      makeEvent({
        pathParameters: { projectId: 'project-123' },
      }),
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      data: [mockFlag],
    });
    expect(mockListFlags).toHaveBeenCalledWith('project-123');
  });

  test('returns 200 with an empty array when there are no flags', async () => {
    mockListFlags.mockResolvedValueOnce([]);

    const result = await handler(
      makeEvent({
        pathParameters: { projectId: 'project-123' },
      }),
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ success: true, data: [] });
  });

  test('returns 400 when pathParameters is null', async () => {
    const result = await handler(makeEvent());

    expect(result.statusCode).toBe(400);
    expect(mockListFlags).not.toHaveBeenCalled();
  });

  test('returns 400 when projectId is missing from pathParameters', async () => {
    const result = await handler(
      makeEvent({ pathParameters: { otherField: 'foo' } }),
    );

    expect(result.statusCode).toBe(400);
    expect(mockListFlags).not.toHaveBeenCalled();
  });

  test('returns 500 when the service throws an Error', async () => {
    mockListFlags.mockRejectedValueOnce(new Error('boom'));

    const result = await handler(
      makeEvent({
        pathParameters: { projectId: 'project-123' },
      }),
    );
    expect(result.statusCode).toBe(500);
  });

  test('returns 500 when the service rejects with a non-Error value', async () => {
    mockListFlags.mockRejectedValueOnce('boom');

    const result = await handler(
      makeEvent({ pathParameters: { projectId: 'project-123' } }),
    );
    expect(result.statusCode).toBe(500);
  });
});
