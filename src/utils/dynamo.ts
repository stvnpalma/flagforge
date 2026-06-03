import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});

export const dynamoDb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

// 👇 Standard dot notation for TABLE_NAME, bracket notation for TABLE.NAME
export const TABLE_NAME =
  process.env.TABLE_NAME ?? process.env['TABLE.NAME'] ?? '';
