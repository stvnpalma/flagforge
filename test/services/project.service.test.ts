import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  createProject,
  getProject,
  listProjects,
} from '@src/services/project.service';
import type { ProjectEntity } from '@src/types/entities';
import { NotFoundError } from '@src/types/errors';
import { TABLE_NAME } from '@src/utils/dynamo';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBDocumentClient);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const mockProject: ProjectEntity = {
  entityType: 'PROJECT',
  PK: 'PROJECT#project-123',
  SK: 'METADATA',
  GSI1PK: 'PROJECT',
  GSI1SK: 'PROJECT#project-123',
  projectId: 'project-123',
  name: 'Test Project',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('project service', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe('createProject()', () => {
    test('returns a project keyed by its generated UUID', async () => {
      ddbMock.on(PutCommand).resolves({});

      const project = await createProject('Test Project');

      expect(project.projectId).toMatch(UUID_PATTERN);
      expect(project.PK).toBe(`PROJECT#${project.projectId}`);
      expect(project.SK).toBe('METADATA');
      expect(project.entityType).toBe('PROJECT');
      expect(project.name).toBe('Test Project');
      expect(project.createdAt).toBe(project.updatedAt);
      expect(new Date(project.createdAt).toISOString()).toBe(project.createdAt);
    });

    test('writes the project to the table', async () => {
      ddbMock.on(PutCommand).resolves({});

      const project = await createProject('Test Project');

      const calls = ddbMock.commandCalls(PutCommand);
      if (calls.length === 0 || !calls[0]) {
        throw new Error('Expected PutCommand to be called');
      }
      const call = calls[0];

      expect(call.args[0].input.TableName).toBe(TABLE_NAME);
      expect(call.args[0].input.Item).toEqual(project);
    });

    test('generates a different projectId on every call', async () => {
      ddbMock.on(PutCommand).resolves({});

      const project1 = await createProject('Project One');
      const project2 = await createProject('Project Two');

      expect(project1.projectId).not.toBe(project2.projectId);
    });

    test('propagates DynamoDB errors', async () => {
      ddbMock.on(PutCommand).rejects(new Error('boom'));

      await expect(createProject('Test Project')).rejects.toThrow('boom');
    });
  });

  describe('getProject()', () => {
    test('returns the project and looks it up by PROJECT# key', async () => {
      ddbMock.on(GetCommand).resolves({ Item: mockProject });

      const project = await getProject('project-123');

      expect(project).toEqual(mockProject);

      const calls = ddbMock.commandCalls(GetCommand);
      if (calls.length === 0 || !calls[0]) {
        throw new Error('Expected GetCommand to be called');
      }
      const call = calls[0];

      expect(call.args[0].input.TableName).toBe(TABLE_NAME);
      expect(call.args[0].input.Key).toEqual({
        PK: 'PROJECT#project-123',
        SK: 'METADATA',
      });
    });

    test('throws NotFoundError when the project does not exist', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      await expect(getProject('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('listProjects()', () => {
    test('returns the projects from the query', async () => {
      ddbMock.on(QueryCommand).resolves({ Items: [mockProject] });

      const projects = await listProjects();

      expect(projects).toEqual([mockProject]);
    });

    test('returns an empty array when the response has no Items', async () => {
      ddbMock.on(QueryCommand).resolves({});

      const projects = await listProjects();

      expect(projects).toEqual([]);
    });

    test('stores GSI1PK and GSI1SK so listProjects can find the project', async () => {
      ddbMock.on(PutCommand).resolves({});
      const result = await createProject('FlagForge');
      const calls = ddbMock.commandCalls(PutCommand);

      expect(calls).toHaveLength(1);
      const [call] = calls;
      if (!call) {
        throw new Error('expected exactly one PutCommand call');
      }
      const putInput = call.args[0].input;

      expect(putInput.Item).toMatchObject({
        GSI1PK: 'PROJECT',
        GSI1SK: `PROJECT#${result.projectId}`,
      });
    });
  });
});
