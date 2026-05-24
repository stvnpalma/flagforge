import { CfnOutput, Duration } from 'aws-cdk-lib';
import { Cors, RestApi } from 'aws-cdk-lib/aws-apigateway';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import type { Construct } from 'constructs';

export class FlagForgeApi extends RestApi {
  constructor(
    scope: Construct,
    id: string,
    readonly table: Table,
  ) {
    super(scope, id, {
      restApiName: 'FlagForge API',
      description: 'Feature flag management and evaluation API',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        maxAge: Duration.days(1),
      },
    });

    new CfnOutput(scope, 'ApiUrl', {
      value: this.url,
      description: 'API Gateway base URL',
    });
  }
}
