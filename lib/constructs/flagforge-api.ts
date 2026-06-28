import { CfnOutput, Duration } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  IdentitySource,
  LambdaIntegration,
  RequestAuthorizer,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import type { Construct } from 'constructs';
import type { FlagForgeAuth } from './flagforge-auth';
import { FlagForgeFunction } from './flagforge-function';

export class FlagForgeApi extends RestApi {
  constructor(scope: Construct, id: string, table: Table, auth: FlagForgeAuth) {
    super(scope, id, {
      restApiName: 'FlagForge API',
      description: 'Feature flag management and evaluation API',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        maxAge: Duration.days(1),
      },
    });

    const cognitoAuthorizer = new CognitoUserPoolsAuthorizer(
      scope,
      'CognitoAuthorizer',
      { cognitoUserPools: [auth] },
    );

    const apiKeyAuthorizerFn = new FlagForgeFunction(
      scope,
      'ApiKeyAuthorizerFunction',
      {
        handlerPath: 'auth/apiKeyAuthorizer.ts',
        table,
        description: 'Verifies x-api-key header for evaluation routes',
        dynamoActions: ['dynamodb:GetItem'],
        timeoutSeconds: 3,
      },
    );

    const apiKeyAuthorizer = new RequestAuthorizer(
      scope,
      'ApiKeyRequestAuthorizer',
      {
        handler: apiKeyAuthorizerFn,
        identitySources: [IdentitySource.header('x-api-key')],
        resultsCacheTtl: Duration.minutes(5),
      },
    );

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

    projects.addMethod('POST', new LambdaIntegration(createProjectFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
    projects.addMethod('GET', new LambdaIntegration(listProjectsFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
    project.addMethod('GET', new LambdaIntegration(getProjectFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    });

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

    environments.addMethod('POST', new LambdaIntegration(createEnvironmentFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
    environments.addMethod('GET', new LambdaIntegration(listEnvironmentsFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    });

    const flags = project.addResource('flags');
    const flag = flags.addResource('{flagKey}');
    const flagEnvironments = flag.addResource('environments');
    const flagEnvironment = flagEnvironments.addResource('{envId}');

    const createFlagFn = new FlagForgeFunction(scope, 'CreateFlagFunction', {
      handlerPath: 'flags/createFlag.ts',
      table,
      description: 'Creates a new feature flag definition',
      dynamoActions: [
        'dynamodb:PutItem',
        'dynamodb:GetItem',
        'dynamodb:TransactWriteCommand',
        'dynamodb:ConditionCheckItem',
      ],
    });

    const listFlagsFn = new FlagForgeFunction(scope, 'ListFlagsFunction', {
      handlerPath: 'flags/listFlags.ts',
      table,
      description: 'Lists all flag definitions for a project',
      dynamoActions: ['dynamodb:Query'],
    });

    const getFlagFn = new FlagForgeFunction(scope, 'GetFlagFunction', {
      handlerPath: 'flags/getFlag.ts',
      table,
      description: 'Gets a single flag definition',
      dynamoActions: ['dynamodb:GetItem'],
    });

    const setFlagStateFn = new FlagForgeFunction(
      scope,
      'SetFlagStateFunction',
      {
        handlerPath: 'flags/setFlagState.ts',
        table,
        description: 'Sets a flag enabled/disabled state for an environment',
        dynamoActions: [
          'dynamodb:PutItem',
          'dynamodb:GetItem',
          'dynamodb:TransactWriteCommand',
          'dynamodb:ConditionCheckItem',
        ],
      },
    );

    const getFlagStateFn = new FlagForgeFunction(
      scope,
      'GetFlagStateFunction',
      {
        handlerPath: 'flags/getFlagState.ts',
        table,
        description: 'Gets a flag state for a specific environment',
        dynamoActions: ['dynamodb:GetItem'],
      },
    );

    flags.addMethod('POST', new LambdaIntegration(createFlagFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
    flags.addMethod('GET', new LambdaIntegration(listFlagsFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
    flag.addMethod('GET', new LambdaIntegration(getFlagFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
    flagEnvironment.addMethod('PUT', new LambdaIntegration(setFlagStateFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
    flagEnvironment.addMethod('GET', new LambdaIntegration(getFlagStateFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    });

    const apiKeys = project.addResource('api-keys');
    const createApiKeyFn = new FlagForgeFunction(
      scope,
      'CreateApiKeyFunction',
      {
        handlerPath: 'apikeys/createApiKey.ts',
        table,
        description: 'Generates a new API key for a project',
        dynamoActions: ['dynamodb:PutItem'],
      },
    );
    apiKeys.addMethod('POST', new LambdaIntegration(createApiKeyFn), {
      authorizer: cognitoAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    });

    const environment = environments.addResource('{envId}');
    const evaluate = environment.addResource('evaluate');
    const evaluateFlagResource = evaluate.addResource('{flagKey}');

    const evaluateFlagsFn = new FlagForgeFunction(
      scope,
      'EvaluateFlagsFunction',
      {
        handlerPath: 'evaluation/evaluateFlags.ts',
        table,
        description: 'Evaluates all flag states for an environment (hot path)',
        dynamoActions: ['dynamodb:Query'],
        timeoutSeconds: 3,
      },
    );

    const evaluateSingleFlagFn = new FlagForgeFunction(
      scope,
      'EvaluateSingleFlagFunction',
      {
        handlerPath: 'evaluation/evaluateSingleFlag.ts',
        table,
        description:
          'Evaluates a single flag state for an environment (hot path)',
        dynamoActions: ['dynamodb:GetItem'],
        timeoutSeconds: 3,
      },
    );

    evaluate.addMethod('GET', new LambdaIntegration(evaluateFlagsFn), {
      authorizer: apiKeyAuthorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });
    evaluateFlagResource.addMethod(
      'GET',
      new LambdaIntegration(evaluateSingleFlagFn),
      {
        authorizer: apiKeyAuthorizer,
        authorizationType: AuthorizationType.CUSTOM,
      },
    );
  }
}
