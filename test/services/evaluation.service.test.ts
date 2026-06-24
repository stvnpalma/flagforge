import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  evaluateFlags,
  evaluateSingleFlag,
} from '@src/services/evaluation.service';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('evaluation service', () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env.TABLE_NAME = 'TestTable';
  });

  describe('evaluateFlags()', () => {
    it('returns a flat map of flagKey to enabled', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          { flagKey: 'dark-mode', enabled: true },
          { flagKey: 'new-checkout', enabled: false },
        ],
      });

      const result = await evaluateFlags('project-123', 'env-456');
      expect(result).toEqual({ 'dark-mode': true, 'new-checkout': false });
    });

    it('returns an empty object when no flag states exist (fail open)', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      const result = await evaluateFlags('project-123', 'missing-env');
      expect(result).toEqual({});
    });
  });

  describe('evaluateSingleFlag()', () => {
    it('returns true when flag is enabled', async () => {
      ddbMock.on(GetCommand).resolves({ Item: { enabled: true } });
      const result = await evaluateSingleFlag(
        'project-123',
        'env-456',
        'dark-mode',
      );
      expect(result).toBe(true);
    });

    it('returns false (fail closed) when the flag state does not exist', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });
      const result = await evaluateSingleFlag(
        'project-123',
        'env-456',
        'missing-flag',
      );
      expect(result).toBe(false);
    });
  });
});
