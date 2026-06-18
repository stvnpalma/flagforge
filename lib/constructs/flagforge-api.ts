import { CfnOutput, Duration } from 'aws-cdk-lib';
import { Cors, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import type { Construct } from 'constructs';
import { FlagForgeFunction } from './flagforge-function';

export class FlagForgeApi extends RestApi {
  constructor(scope: Construct, id: string, table: Table) {
    super(scope, id, {
      restApiName: 'FlagForge API',
      description: 'Feature flag management and evaluation API',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        maxAge: Duration.days(1),
      },
    });

    const projects = this.root.addResource('projects');
    const project = projects.addResource('{projectId}');

    const createProjectFn = new FlagForgeFunction(
      scope,
      'CreateProjectFunction',
      {
        handlerPath: 'projects/createProject.ts',
        table,
        description: 'Creates a new FlagForge project',
        dynamoActions: ['dynamodb:PutItem'],
      },
    );

    const listProjectsFn = new FlagForgeFunction(scope, 'ListProjectFunction', {
      handlerPath: 'projects/listProjects.ts',
      table,
      description: 'Lists all FlagForge projects',
      dynamoActions: ['dynamodb:Query'],
    });

    const getProjectFn = new FlagForgeFunction(scope, 'GetProjectFunction', {
      handlerPath: 'projects/getProject.ts',
      table,
      description: 'Gets a single Flag Forge project by Id',
      dynamoActions: ['dynamodb:GetItem'],
    });

    projects.addMethod('POST', new LambdaIntegration(createProjectFn));
    projects.addMethod('GET', new LambdaIntegration(listProjectsFn));
    project.addMethod('GET', new LambdaIntegration(getProjectFn));

    new CfnOutput(scope, 'ApiUrl', {
      value: this.url,
      description: 'API Gateway base URL',
    });
    const environments = project.addResource('environments');

    const createEnvironmentFn = new FlagForgeFunction(
      scope,
      'CreateEnvironmentFunction',
      {
        handlerPath: 'environments/createEnvironment.ts',
        table,
        description: 'Creates a new environment within a project',
        dynamoActions: [
          'dynamodb:PutItem',
          'dynamodb:GetItem',
          'dynamodb:ConditionCheckItem',
        ],
      },
    );

    const listEnvironmentsFn = new FlagForgeFunction(
      scope,
      'ListEnvironmentsFunction',
      {
        handlerPath: 'environments/listEnvironments.ts',
        table,
        description: 'Lists all environments for a project',
        dynamoActions: ['dynamodb:Query'],
      },
    );

    environments.addMethod('POST', new LambdaIntegration(createEnvironmentFn));
    environments.addMethod('GET', new LambdaIntegration(listEnvironmentsFn));
  }
}
