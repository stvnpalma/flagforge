import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import {
  createFlag,
  getFlag,
  listFlags,
  setFlagState,
} from '../../src/services/flag.service';
import { ConflictError, NotFoundError } from '../../src/types/errors';
import { TABLE_NAME } from '../../src/utils/dynamo';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('flag service', () => {
  beforeEach(() => {
    ddbMock.reset();
    if (TABLE_NAME) {
      process.env[TABLE_NAME] = 'TestTable';
    }
  });

  describe('create Flag()', () => {
    it('returns flag entity on success ', async () => {
      ddbMock.on(TransactWriteCommand).resolves({});

      const result = await createFlag(
        'project-123',
        'new-checkout',
        'New Checkout',
        'rollout flag',
      );

      expect(result.entityType).toBe('FLAG');
      expect(result.flagKey).toBe('new-checkout');
      expect(result.SK).toBe('FLAG#new-checkout');
    });

    it('throws NotFoundError when project condition check fails', async () => {
      const error = new TransactionCanceledException({
        message: 'canceled',
        $metadata: {},
        CancellationReasons: [
          { Code: 'ConditionalCheckFailed' },
          { Code: 'None' },
        ],
      });
      ddbMock.on(TransactWriteCommand).rejects(error);
      await expect(
        createFlag('missing-project', 'new-checkout', 'New Checkout'),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when flag already exists', async () => {
      const error = new TransactionCanceledException({
        message: 'canceled',
        $metadata: {},
        CancellationReasons: [
          { Code: 'None' },
          { Code: 'ConditionalCheckFailed' },
        ],
      });
      ddbMock.on(TransactWriteCommand).rejects(error);
      await expect(
        createFlag('project-123', 'existing-flag', 'Dup'),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getFlag()', () => {
    it('throws NotFoundError when flag does not exist', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });
      await expect(getFlag('project-123', 'missing')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('listFlags()', () => {
    it('returns empty array when no flags exist', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      const result = await listFlags('project-123');
      expect(result).toEqual([]);
    });
  });

  describe('setFlagState()', () => {
    it('returns flag-environment entity on success', async () => {
      ddbMock.on(TransactWriteCommand).resolves({});

      const result = await setFlagState(
        'project-123',
        'new-checkout',
        'env-456',
        true,
      );

      expect(result.entityType).toBe('FLAG_ENVIRONMENT');
      expect(result.enabled).toBe(true);
      expect(result.GSI1PK).toBe('ENV#project-123#env-456');
    });

    it('throws NotFoundError when flag condition check fails', async () => {
      const error = new TransactionCanceledException({
        message: 'cancelled',
        $metadata: {},
        CancellationReasons: [
          { Code: 'ConditionalCheckFailed' },
          { Code: 'None' },
          { Code: 'None' },
        ],
      });
      ddbMock.on(TransactWriteCommand).rejects(error);

      await expect(
        setFlagState('project-123', 'missing-flag', 'env-456', true),
      ).rejects.toThrow(NotFoundError);
    });

    it('throw NotFoundError when environment condition check fails', async () => {
      const error = new TransactionCanceledException({
        message: 'cancelled',
        $metadata: {},
        CancellationReasons: [
          { Code: 'None' },
          { Code: 'ConditionalCheckFailed' },
          { Code: 'None' },
        ],
      });
      ddbMock.on(TransactWriteCommand).rejects(error);
      await expect(
        setFlagState('project-123', 'new-checkout', 'missing-env', true),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
