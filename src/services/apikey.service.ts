import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createHash, randomBytes } from 'crypto';
import type { ApiKeyEntity } from '../types/entities';
import { NotFoundError } from '../types/errors';
import { dynamoDb, TABLE_NAME } from '../utils/dynamo';

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export async function createApiKey(
  projectId: string,
): Promise<{ rawKey: string; entity: ApiKeyEntity }> {
  const rawKey = `ffk_${randomBytes(24).toString('hex')}`;
  const keyHash = hashKey(rawKey);
  const now = new Date().toISOString();

  const entity: ApiKeyEntity = {
    entityType: 'API_KEY',
    PK: `APIKEY#${keyHash}`,
    SK: `METADATA`,
    keyHash,
    projectId,
    createdAt: now,
  };

  await dynamoDb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: entity,
      ConditionExpression: 'attribute_not_exists(pk)',
    }),
  );

  return { rawKey, entity };
}

export async function verifyApiKey(rawKey: string): Promise<ApiKeyEntity> {
  const keyHash = hashKey(rawKey);

  const result = await dynamoDb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `APIKEY#${keyHash}`, SK: 'METADATA' },
    }),
  );

  if (!result.Item) {
    throw new NotFoundError('Api Key');
  }
  return result.Item as ApiKeyEntity;
}
