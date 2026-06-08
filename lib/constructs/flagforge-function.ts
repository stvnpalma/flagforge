import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Architecture, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import type { Construct } from 'constructs';
import * as path from 'path';

interface FlagForgeFunctionProps {
  readonly handlerPath: string;
  readonly table: Table;
  readonly description: string;
  readonly dynamoActions: string[];
  readonly timeoutSeconds?: number;
  readonly memoryMB?: number;
}

export class FlagForgeFunction extends NodejsFunction {
  constructor(scope: Construct, id: string, props: FlagForgeFunctionProps) {
    const role = new Role(scope, `${id}Role`, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: `Least-privilege execution role for ${id}`,
    });

    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['arn:aws:logs:*:*:*'],
      }),
    );

    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
        resources: ['*'],
      }),
    );

    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: props.dynamoActions,
        resources: [props.table.tableArn, `${props.table.tableArn}/index/*`],
      }),
    );

    super(scope, id, {
      entry: path.join(__dirname, '../../src/handlers', props.handlerPath),
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      handler: 'handler',
      role,
      description: props.description,
      timeout: Duration.seconds(props.timeoutSeconds ?? 10),
      memorySize: props.memoryMB ?? 256,
      tracing: Tracing.ACTIVE,
      environment: {
        TABLE_NAME: props.table.tableName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        sourceMap: true,
        minify: true,
        target: 'es2022',
      },
    });

    new LogGroup(scope, `${id}LogGroup`, {
      logGroupName: `/aws/lambda/${id}`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
