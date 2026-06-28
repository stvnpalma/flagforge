import { QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import type { EnvironmentEntity } from '../types/entities';
import { ConflictError, NotFoundError } from '../types/errors';
import { dynamoDb, TABLE_NAME } from '../utils/dynamo';

interface AwsTransactionError {
  name: string;
  CancellationReasons?: { Code?: string }[];
}

export async function createEnvironment(
  projectId: string,
  name: string,
): Promise<EnvironmentEntity> {
  const envId = randomUUID();
  const now = new Date().toISOString();

  const environment: EnvironmentEntity = {
    entityType: 'ENVIRONMENT',
    PK: `PROJECT#${projectId}`,
    SK: `ENV#${envId}`,
    projectId,
    envId,
    name,
    createdAt: now,
  };

  try {
    await dynamoDb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            ConditionCheck: {
              TableName: TABLE_NAME,
              Key: {
                PK: `PROJECT#${projectId}`,
                SK: 'METADATA',
              },
              ConditionExpression: 'attribute_exists(PK)',
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: environment,
              ConditionExpression: 'attribute_not_exists(SK)',
            },
          },
        ],
      }),
    );
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error) {
      const awsError = error as AwsTransactionError;

      if (awsError.name === 'TransactionCanceledException') {
        const reasons = awsError.CancellationReasons;

        if (reasons) {
          if (reasons[0]?.Code === 'ConditionalCheckFailed') {
            throw new NotFoundError(`Project ${projectId}`);
          }
          if (reasons[1]?.Code === 'ConditionalCheckFailed') {
            throw new ConflictError(`Environment '${name}' already exists.`);
          }
        }
      }
    }
    throw error;
  }

  return environment;
}

export async function listEnvironments(
  projectId: string,
): Promise<EnvironmentEntity[]> {
  const result = await dynamoDb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `PROJECT#${projectId}`,
        ':prefix': 'ENV#',
      },
    }),
  );

  return (result.Items ?? []) as EnvironmentEntity[];
}
