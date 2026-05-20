import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { FlagforgeStack } from "../lib/flagforge-stack";

describe("FlagforgeStack", () => {
  it("synthesizes successfully into a CloudFormation template", () => {
    const app = new cdk.App();
    const stack = new FlagforgeStack(app, "TestFlagforgeStack");
    const template = Template.fromStack(stack);

    expect(template).toBeDefined();
  });
});
