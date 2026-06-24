import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { FlagEnvironmentEntity } from '../types/entities';
import { dynamoDb, TABLE_NAME } from '../utils/dynamo';

export async function evaluateFlags(
  projectId: string,
  envId: string,
): Promise<Record<string, boolean>> {
  const result = await dynamoDb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `ENV#${projectId}#${envId}`,
      },
    }),
  );

  const items = (result.Items ?? []) as FlagEnvironmentEntity[];

  return items.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.flagKey] = item.enabled;
    return acc;
  }, {});
}

export async function evaluateSingleFlag(
  projectId: string,
  envId: string,
  flagKey: string,
): Promise<boolean> {
  const result = await dynamoDb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PROJECT#${projectId}`,
        SK: `FLAGENV#${flagKey}#${envId}`,
      },
    }),
  );

  if (!result.Item) {
    return false; // fail closed — unknown flag defaults to disabled
  }

  return (result.Item as FlagEnvironmentEntity).enabled;
}
