import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import type { ProjectEntity } from '../types/entities';
import { NotFoundError } from '../types/errors';
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

export async function getProject(projectId: string): Promise<ProjectEntity> {
  const result = await dynamoDb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PROJECT#${projectId}`,
        SK: 'METADATA',
      },
    }),
  );

  if (!result.Item) {
    throw new NotFoundError(`Project ${projectId}`);
  }

  return result.Item as ProjectEntity;
}

export async function listProjects(): Promise<ProjectEntity[]> {
  const result = await dynamoDb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :type',
      ExpressionAttributeValues: {
        ':type': 'PROJECT',
      },
    }),
  );

  return (result.Items ?? []) as ProjectEntity[];
}
