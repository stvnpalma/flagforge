import { handler } from '@src/handlers/flags/createFlag';
import * as flagService from '@src/services/flag.service';
import type { FlagEntity } from '@src/types/entities';
import { ConflictError, NotFoundError } from '@src/types/errors';
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

const mockCreateFlag = jest.mocked(flagService.createFlag);

const mockFlag: FlagEntity = {
  entityType: 'FLAG',
  PK: 'PROJECT#project-123',
  SK: 'FLAG#dark-mode',
  projectId: 'project-123',
  flagKey: 'dark-mode',
  name: 'Dark Mode',
  description: 'Enable dark mode theme',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const postEvent = (body: string | null): ReturnType<typeof makeEvent> =>
  makeEvent({
    httpMethod: 'POST',
    pathParameters: { projectId: 'project-123' },
    body,
  });

const validBody = JSON.stringify({
  flagKey: 'dark-mode',
  name: 'Dark Mode',
  description: 'Enable dark mode theme',
});

const invalidBodies: [string, string | null][] = [
  ['body is null', null],
  ['body is not valid JSON', '{not json'],
  ['flagKey is missing', JSON.stringify({ name: 'Dark Mode' })],
  [
    'flagKey has uppercase letters',
    JSON.stringify({ flagKey: 'Dark-Mode', name: 'Dark Mode' }),
  ],
  ['name is missing', JSON.stringify({ flagKey: 'dark-mode' })],
  [
    'description is an empty string',
    JSON.stringify({
      flagKey: 'dark-mode',
      name: 'Dark Mode',
      description: '',
    }),
  ],
];

describe('createFlag handler', () => {
  test('returns 201 with the created flag', async () => {
    mockCreateFlag.mockResolvedValueOnce(mockFlag);

    const event = postEvent(validBody);
    const response = await handler(event);

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toEqual({
      success: true,
      data: mockFlag,
    });
    expect(mockCreateFlag).toHaveBeenCalledWith(
      'project-123',
      'dark-mode',
      'Dark Mode',
      'Enable dark mode theme',
    );
  });

  test('passes undefined as the description when it is omitted', async () => {
    mockCreateFlag.mockResolvedValueOnce(mockFlag);

    const event = postEvent(
      JSON.stringify({ flagKey: 'dark-mode', name: 'Dark Mode' }),
    );
    await handler(event);

    expect(mockCreateFlag).toHaveBeenCalledWith(
      'project-123',
      'dark-mode',
      'Dark Mode',
      undefined,
    );
  });

  test('trims whitespace from name before calling the service', async () => {
    mockCreateFlag.mockResolvedValueOnce(mockFlag);

    const event = postEvent(
      JSON.stringify({ flagKey: 'dark-mode', name: '  Dark Mode  ' }),
    );
    await handler(event);

    expect(mockCreateFlag).toHaveBeenCalledWith(
      'project-123',
      'dark-mode',
      'Dark Mode',
      undefined,
    );
  });

  test.each(invalidBodies)('returns 400 when %s', async (_label, body) => {
    const event = postEvent(body);
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(mockCreateFlag).not.toHaveBeenCalled();
  });

  test('returns 400 when pathParameters is null', async () => {
    const event = makeEvent({ httpMethod: 'POST', body: validBody });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(mockCreateFlag).not.toHaveBeenCalled();
  });

  test('returns 400 when projectId is missing from pathParameters', async () => {
    const event = makeEvent({
      httpMethod: 'POST',
      pathParameters: {},
      body: validBody,
    });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(mockCreateFlag).not.toHaveBeenCalled();
  });

  test('returns 404 when the project does not exist', async () => {
    mockCreateFlag.mockRejectedValueOnce(
      new NotFoundError('Project project-123'),
    );
    const response = await handler(postEvent(validBody));
    expect(response.statusCode).toBe(404);
  });

  test('returns 409 when the flag already exists', async () => {
    mockCreateFlag.mockRejectedValueOnce(new ConflictError('Flag dark-mode'));
    const response = await handler(postEvent(validBody));
    expect(response.statusCode).toBe(409);
  });

  test('returns 500 when the service throws an Error', async () => {
    mockCreateFlag.mockRejectedValueOnce(new Error('boom'));
    const response = await handler(postEvent(validBody));
    expect(response.statusCode).toBe(500);
  });

  test('returns 500 when the service rejects with a non-Error value', async () => {
    mockCreateFlag.mockRejectedValueOnce('boom');
    const response = await handler(postEvent(validBody));
    expect(response.statusCode).toBe(500);
  });
});
