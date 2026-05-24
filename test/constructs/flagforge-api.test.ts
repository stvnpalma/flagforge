import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
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
});
