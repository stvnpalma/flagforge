import { Duration } from 'aws-cdk-lib';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import type { Construct } from 'constructs';
import * as path from 'path';

interface FlagForgeFunctionProps {
  readonly handlerPath: string;
  readonly table: Table;
  readonly description: string;
  readonly timeoutSeconds?: number;
  readonly memoryMB?: number;
}

export class FlagForgeFunction extends NodejsFunction {
  constructor(scope: Construct, id: string, props: FlagForgeFunctionProps) {
    super(scope, id, {
      entry: path.join(__dirname, '../../src/handlers', props.handlerPath),
      runtime: Runtime.NODEJS_22_X,
      handler: 'handler',
      description: props.description,
      timeout: Duration.seconds(props.timeoutSeconds ?? 10),
      memorySize: props.memoryMB ?? 256,
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

    props.table.grantReadWriteData(this);
  }
}
