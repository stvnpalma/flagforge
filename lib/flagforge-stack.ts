import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { FlagForgeApi } from './constructs/flagforge-api';
import { FlagForgeAuth } from './constructs/flagforge-auth';
import { FlagForgeTable } from './constructs/flagforge-table';

export class FlagforgeStack extends Stack {
  public readonly table: FlagForgeTable;
  public readonly auth: FlagForgeAuth;
  public readonly api: FlagForgeApi;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    this.table = new FlagForgeTable(this, 'FlagForgeTable');
    this.auth = new FlagForgeAuth(this, 'FlagForgeAuth');
    this.api = new FlagForgeApi(this, 'FlagForgeApi', this.table, this.auth);

    new CfnOutput(this, 'UserPoolId', { value: this.auth.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', {
      value: this.auth.client.userPoolClientId,
    });
  }
}
