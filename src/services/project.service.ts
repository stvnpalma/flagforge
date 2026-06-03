import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import type { ProjectEntity } from '../types/entities';
import { dynamoDb, TABLE_NAME } from '../utils/dynamo';

export async function createProject(name: string): Promise<ProjectEntity> {
  const projectId = randomUUID();
  const now = new Date().toISOString();

  const project: ProjectEntity = {
    entityType: 'PROJECT',
    PK: `PROJECT#${projectId}`,
    SK: 'METADATA',
    projectId,
    name,
    createdAt: now,
    updatedAt: now,
  };

  await dynamoDb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: project,
      ConditionExpression: 'attribute_not_exists(PK)',
    }),
  );

  return project;
}
