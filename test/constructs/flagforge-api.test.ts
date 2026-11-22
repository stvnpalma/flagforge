import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { FlagforgeStack } from '../../lib/flagforge-stack';

describe('FlagForgeApi construct', () => {
  let template: Template;

  beforeEach(() => {
    const app = new cdk.App();
    const stack = new FlagforgeStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  it('creates a REST API', () => {
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
  });

  it('outputs the API URL', () => {
    template.hasOutput('ApiUrl', {});
  });

  it('grants CreateApiKeyFunction only PutItem and GetItem on the table', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      Roles: [{ Ref: Match.stringLikeRegexp('^CreateApiKeyFunctionRole') }],
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Action: ['dynamodb:PutItem', 'dynamodb:GetItem'],
          }),
        ]),
      },
    });
  });
});
