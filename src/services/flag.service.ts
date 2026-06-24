import {
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { FlagEntity, FlagEnvironmentEntity } from '../types/entities';
import { ConflictError, NotFoundError } from '../types/errors';
import { dynamoDb, TABLE_NAME } from '../utils/dynamo';

interface TransactionErrorShape {
  name?: string;
  __type?: string;
  cancellationReasons?: {
    Code?: string;
    code?: string;
    Message?: string;
  }[];
  CancellationReasons?: {
    Code?: string;
    code?: string;
    Message?: string;
  }[];
}

export async function createFlag(
  projectId: string,
  flagKey: string,
  name: string,
  description?: string,
): Promise<FlagEntity> {
  const now = new Date().toISOString();

  const flag: FlagEntity = {
    entityType: 'FLAG',
    PK: `PROJECT#${projectId}`,
    SK: `FLAG#${flagKey}`,
    projectId,
    flagKey,
    name,
    description: description ?? '',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await dynamoDb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            ConditionCheck: {
              TableName: TABLE_NAME,
              Key: { PK: `PROJECT#${projectId}`, SK: 'METADATA' },
              ConditionExpression: 'attribute_exists(PK)',
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: flag,
              ConditionExpression: 'attribute_not_exists(SK)',
            },
          },
        ],
      }),
    );
  } catch (rawError: unknown) {
    const error = rawError as TransactionErrorShape;
    if (
      error.name === 'TransactionCanceledException' ||
      error.__type?.endsWith('TransactionCanceledException')
    ) {
      const reasons =
        error.cancellationReasons ?? error.CancellationReasons ?? [];
      const projectFailed =
        reasons[0]?.Code === 'ConditionalCheckFailed' ||
        reasons[0]?.code === 'ConditionalCheckFailed';
      const flagFailed =
        reasons[1]?.Code === 'ConditionalCheckFailed' ||
        reasons[1]?.code === 'ConditionalCheckFailed';

      if (projectFailed) {
        throw new NotFoundError(`Project ${projectId}`);
      }
      if (flagFailed) {
        throw new ConflictError(`Flag ${flagKey}`);
      }
    }
    throw rawError;
  }

  return flag;
}

export async function getFlag(
  projectId: string,
  flagKey: string,
): Promise<FlagEntity> {
  const result = await dynamoDb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PROJECT#${projectId}`, SK: `FLAG#${flagKey}` },
    }),
  );

  if (!result.Item) {
    throw new NotFoundError(`Flag ${flagKey}`);
  }

  return result.Item as FlagEntity;
}

export async function listFlags(projectId: string): Promise<FlagEntity[]> {
  const result = await dynamoDb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `PROJECT#${projectId}`,
        ':prefix': 'FLAG#',
      },
    }),
  );

  return (result.Items ?? []) as FlagEntity[];
}

export async function setFlagState(
  projectId: string,
  flagKey: string,
  envId: string,
  enabled: boolean,
): Promise<FlagEnvironmentEntity> {
  const now = new Date().toISOString();

  const FlagEnvironment: FlagEnvironmentEntity = {
    entityType: 'FLAG_ENVIRONMENT',
    PK: `PROJECT#${projectId}`,
    SK: `FLAGENV#${flagKey}#${envId}`,
    GSI1PK: `ENV#${projectId}#${envId}`,
    GSI1SK: `FLAG#${flagKey}`,
    projectId,
    envId,
    flagKey,
    enabled,
    updatedAt: now,
  };

  try {
    await dynamoDb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            ConditionCheck: {
              TableName: TABLE_NAME,
              Key: { PK: `PROJECT#${projectId}`, SK: `ENV#${envId}` },
              ConditionExpression: 'attribute_exists(PK)',
            },
          },
          {
            ConditionCheck: {
              TableName: TABLE_NAME,
              Key: { PK: `PROJECT#${projectId}`, SK: `FLAG#${flagKey}` },
              ConditionExpression: 'attribute_exists(PK)',
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: FlagEnvironment,
            },
          },
        ],
      }),
    );
  } catch (rawError: unknown) {
    const error = rawError as TransactionErrorShape;
    if (
      error.name === 'TransactionCanceledException' ||
      error.__type?.endsWith('TransactionCanceledException')
    ) {
      const reasons =
        error.cancellationReasons ?? error.CancellationReasons ?? [];
      const envFailed =
        reasons[0]?.Code === 'ConditionalCheckFailed' ||
        reasons[0]?.code === 'ConditionalCheckFailed';
      const flagFailed =
        reasons[1]?.Code === 'ConditionalCheckFailed' ||
        reasons[1]?.code === 'ConditionalCheckFailed';

      if (envFailed) {
        throw new NotFoundError(`Environment ${envId}`);
      }
      if (flagFailed) {
        throw new NotFoundError(`Flag ${flagKey}`);
      }
    }
    throw rawError;
  }

  return FlagEnvironment;
}

export async function getFlagState(
  projectId: string,
  flagKey: string,
  envId: string,
): Promise<FlagEnvironmentEntity> {
  const result = await dynamoDb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PROJECT#${projectId}`, SK: `FLAGENV#${flagKey}#${envId}` },
    }),
  );

  if (!result.Item) {
    throw new NotFoundError(
      `State for flag ${flagKey} in environment ${envId}`,
    );
  }

  return result.Item as FlagEnvironmentEntity;
}
