import { createLogger } from '@src/utils/logger';

describe('createLogger()', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs structured JSON with INFO level', () => {
    const logger = createLogger('req-123');
    logger.info('test message', { path: '/projects' });

    const mockCalls = consoleSpy.mock.calls as unknown[][];
    const logString = mockCalls[0]?.[0] as string;

    const logged = JSON.parse(logString) as Record<string, unknown>;
    expect(logged).toMatchObject({
      level: 'INFO',
      requestId: 'req-123',
      message: 'test message',
      path: '/projects',
    });
  });

  it('logs structured JSON with ERROR level', () => {
    const logger = createLogger('req-456');
    logger.error('something failed', { statusCode: 500 });

    const mockCalls = consoleSpy.mock.calls as unknown[][];
    const logString = mockCalls[0]?.[0] as string;

    const logged = JSON.parse(logString) as Record<string, unknown>;
    expect(logged).toMatchObject({
      level: 'ERROR',
      requestId: 'req-456',
      statusCode: 500,
    });
  });
});
