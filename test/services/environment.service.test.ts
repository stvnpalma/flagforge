import {
  DynamoDBDocumentClient,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  createEnvironment,
  listEnvironments,
} from '@src/services/environment.service';
import { NotFoundError } from '@src/types/errors';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('environment service', () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env.TABLE_NAME = 'TestTable';
  });

  describe('createEnvironment()', () => {
    it('returns environment entity on success', async () => {
      ddbMock.on(TransactWriteCommand).resolves({});

      const result = await createEnvironment('project-123', 'Production');

      expect(result.entityType).toBe('ENVIRONMENT');
      expect(result.projectId).toBe('project-123');
      expect(result.name).toBe('Production');
      expect(result.envId).toBeDefined();
    });

    it('throws NotFoundError when transaction fails with condition check', async () => {
      const error = new Error('Transaction cancelled: ConditionalCheckFailed');
      error.name = 'TransactionCanceledException';

      Object.assign(error, {
        CancellationReasons: [
          { Code: 'ConditionalCheckFailed' },
          { Code: 'None' },
        ],
      });

      ddbMock.on(TransactWriteCommand).rejects(error);

      await expect(
        createEnvironment('non-existent', 'Production'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('listEnvironments()', () => {
    it('returns empty array when no environments exist', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [] });

      const result = await listEnvironments('project-123');
      expect(result).toEqual([]);
    });

    it('returns environments for a project', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          {
            entityType: 'ENVIRONMENT',
            PK: 'PROJECT#project-123',
            SK: 'ENV#env-1',
            projectId: 'project-123',
            envId: 'env-1',
            name: 'Production',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      const result = await listEnvironments('project-123');
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Production');
    });
  });
});
