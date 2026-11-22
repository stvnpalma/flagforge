import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { createApiKey, verifyApiKey } from '@src/services/apikey.service';
import type { ApiKeyEntity } from '@src/types/entities';
import { NotFoundError } from '@src/types/errors';
import { TABLE_NAME } from '@src/utils/dynamo';
import { mockClient } from 'aws-sdk-client-mock';
import { createHash } from 'crypto';

const ddbMock = mockClient(DynamoDBDocumentClient);

const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

describe('apikey service', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe('createApiKey()', () => {
    test('returns a raw key with the ffk_ prefix and 48 hex characters', async () => {
      ddbMock.on(PutCommand).resolves({});
      const { rawKey } = await createApiKey('project-123');
      expect(rawKey).toMatch(/^ffk_[0-9a-f]{48}$/);
    });

    test('returns an entity keyed by the SHA-256 hash of the raw key', async () => {
      ddbMock.on(PutCommand).resolves({});
      const { rawKey, entity } = await createApiKey('project-123');
      const expectedHash = sha256(rawKey);

      expect(entity.keyHash).toBe(expectedHash);
      expect(entity.PK).toBe(`APIKEY#${expectedHash}`);
      expect(entity.SK).toBe('METADATA');
      expect(entity.entityType).toBe('API_KEY');
      expect(entity.projectId).toBe('project-123');
      expect(new Date(entity.createdAt).toISOString()).toBe(entity.createdAt);
    });

    test('writes the entity to the table and never sends the raw key', async () => {
      ddbMock.on(PutCommand).resolves({});
      const { rawKey, entity } = await createApiKey('project-123');
      const calls = ddbMock.commandCalls(PutCommand);

      expect(calls).toHaveLength(1);
      const [call] = calls;
      if (!call) {
        throw new Error('expected exactly one PutCommand call');
      }
      const putInput = call.args[0].input;

      expect(putInput.TableName).toBe(TABLE_NAME);
      expect(putInput.Item).toEqual(entity);
      expect(JSON.stringify(putInput)).not.toContain(rawKey);
    });

    test('generates a different key on every call', async () => {
      ddbMock.on(PutCommand).resolves({});
      const first = await createApiKey('project-123');
      const second = await createApiKey('project-123');

      expect(first.rawKey).not.toBe(second.rawKey);
      expect(first.entity.keyHash).not.toBe(second.entity.keyHash);
    });

    test('propagates DynamoDB errors', async () => {
      ddbMock.on(PutCommand).rejects(new Error('boom'));
      await expect(createApiKey('project-123')).rejects.toThrow('boom');
    });
    test('uses attribute_not_exists(PK) so an existing item cannot be overwritten', async () => {
      ddbMock.on(PutCommand).resolves({});
      await createApiKey('project-123');
      const calls = ddbMock.commandCalls(PutCommand);

      expect(calls).toHaveLength(1);
      const [call] = calls;
      if (!call) {
        throw new Error('expected exactly one PutCommand call');
      }
      const putInput = call.args[0].input;

      expect(putInput.ConditionExpression).toBe('attribute_not_exists(PK)');
    });
  });

  describe('verifyApiKey()', () => {
    test('returns the entity when the hashed key exists', async () => {
      const mockApiKey: ApiKeyEntity = {
        entityType: 'API_KEY',
        PK: `APIKEY#${sha256('ffk_test-key')}`,
        SK: 'METADATA',
        keyHash: sha256('ffk_test-key'),
        projectId: 'project-123',
        createdAt: new Date().toISOString(),
      };

      ddbMock.on(GetCommand).resolves({ Item: mockApiKey });

      const result = await verifyApiKey('ffk_test-key');
      expect(result).toEqual(mockApiKey);

      const calls = ddbMock.commandCalls(GetCommand);
      expect(calls).toHaveLength(1);
      const [call] = calls;
      if (!call) {
        throw new Error('expected exactly one GetCommand call');
      }
      const getInput = call.args[0].input;

      expect(getInput.Key).toEqual({
        PK: `APIKEY#${sha256('ffk_test-key')}`,
        SK: 'METADATA',
      });
      expect(JSON.stringify(getInput)).not.toContain('ffk_test-key');
    });

    test('throws NotFoundError when the key does not exist', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      await expect(verifyApiKey('ffk_missing')).rejects.toThrow(NotFoundError);
    });
  });
});
