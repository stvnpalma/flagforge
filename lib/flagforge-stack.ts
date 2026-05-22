import type { StackProps } from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { FlagForgeTable } from './constructs/flagforge-table';

export class FlagforgeStack extends Stack {
  public readonly table: FlagForgeTable;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    this.table = new FlagForgeTable(this, 'FlagForgeTable');
  }
}
