import { RemovalPolicy } from 'aws-cdk-lib';
import {
  AccountRecovery,
  UserPool,
  UserPoolClient,
} from 'aws-cdk-lib/aws-cognito';
import type { Construct } from 'constructs';

export class FlagForgeAuth extends UserPool {
  public readonly client: UserPoolClient;

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      userPoolName: 'FlagForgeUserPool',
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.client = new UserPoolClient(scope, `${id}Client`, {
      userPool: this,
      authFlows: { adminUserPassword: true, userPassword: true },
      generateSecret: false,
    });
  }
}
