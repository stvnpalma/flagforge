import { handler } from '@src/handlers/evaluation/evaluateSingleFlag';
import * as evaluationService from '@src/services/evaluation.service';
import { makeEvent } from '../../setup/makeEvent';

jest.mock('@src/services/evaluation.service');

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
jest.mock('@src/utils/logger', () => ({
  createLogger: (): typeof mockLogger => mockLogger,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterAll(() => {
  jest.restoreAllMocks();
});

const mockEvaluateSingleFlag = jest.mocked(
  evaluationService.evaluateSingleFlag,
);

const fullPathParameters = {
  projectId: 'project-123',
  envId: 'env-456',
  flagKey: 'dark-mode',
};

const missingPathParameters: [string, Record<string, string>][] = [
  ['projectId is missing', { envId: 'env-456', flagKey: 'dark-mode' }],
  ['envId is missing', { projectId: 'project-123', flagKey: 'dark-mode' }],
  ['flagKey is missing', { projectId: 'project-123', envId: 'env-456' }],
];

describe('evaluateSingleFlag handler', () => {
  test('returns 200 with enabled true for an enabled flag', async () => {
    mockEvaluateSingleFlag.mockResolvedValueOnce(true);

    const event = makeEvent({
      httpMethod: 'GET',
      pathParameters: fullPathParameters,
    });
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      success: true,
      data: { flagKey: 'dark-mode', enabled: true },
    });
    expect(mockEvaluateSingleFlag).toHaveBeenCalledWith(
      'project-123',
      'env-456',
      'dark-mode',
    );
  });

  test('returns 200 with enabled false for a disabled or unknown flag', async () => {
    mockEvaluateSingleFlag.mockResolvedValueOnce(false);

    const event = makeEvent({
      httpMethod: 'GET',
      pathParameters: fullPathParameters,
    });
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      success: true,
      data: { flagKey: 'dark-mode', enabled: false },
    });
    expect(mockEvaluateSingleFlag).toHaveBeenCalledWith(
      'project-123',
      'env-456',
      'dark-mode',
    );
  });

  test('returns 400 when pathParameters is null', async () => {
    const event = makeEvent({
      httpMethod: 'GET',
    });
    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(mockEvaluateSingleFlag).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'evaluateSingleFlag failed',
      expect.objectContaining({ statusCode: 400 }),
    );
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
      expect(mockEvaluateSingleFlag).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'evaluateSingleFlag failed',
        expect.objectContaining({ statusCode: 400 }),
      );
    },
  );

  test('returns 500 when the service throws an Error', async () => {
    mockEvaluateSingleFlag.mockRejectedValueOnce(new Error('boom'));

    const event = makeEvent({
      httpMethod: 'GET',
      pathParameters: fullPathParameters,
    });
    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'evaluateSingleFlag failed',
      expect.objectContaining({ statusCode: 500, error: 'boom' }),
    );
    expect(mockLogger.info).not.toHaveBeenCalledWith(
      'evaluateSingleFlag failed',
      expect.anything(),
    );
  });

  test('returns 500 when the service rejects with a non-Error value', async () => {
    mockEvaluateSingleFlag.mockRejectedValueOnce('boom');

    const event = makeEvent({
      httpMethod: 'GET',
      pathParameters: fullPathParameters,
    });
    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'evaluateSingleFlag failed',
      expect.objectContaining({ statusCode: 500, error: 'boom' }),
    );
    expect(mockLogger.info).not.toHaveBeenCalledWith(
      'evaluateSingleFlag failed',
      expect.anything(),
    );
  });
});
