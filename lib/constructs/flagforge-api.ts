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

    const createProjectFn = new FlagForgeFunction(
      scope,
      'CreateProjectFunction',
      {
        handlerPath: 'projects/createProject.ts',
        table,
        description: 'Creates a new FlagForge project',
      },
    );

    projects.addMethod('POST', new LambdaIntegration(createProjectFn));

    new CfnOutput(scope, 'ApiUrl', {
      value: this.url,
      description: 'API Gateway base URL',
    });
  }
}
