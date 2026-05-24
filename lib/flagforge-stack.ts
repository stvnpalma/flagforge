import type { StackProps } from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { FlagForgeApi } from './constructs/flagforge-api';
import { FlagForgeTable } from './constructs/flagforge-table';

export class FlagforgeStack extends Stack {
  public readonly table: FlagForgeTable;
  public readonly api: FlagForgeApi;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    this.table = new FlagForgeTable(this, 'FlagForgeTable');
    this.api = new FlagForgeApi(this, 'FlagForgeApi', this.table);
  }
}
