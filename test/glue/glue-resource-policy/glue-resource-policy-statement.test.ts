import { App, Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { GlueResourcePolicyStatement } from '../../../lib/glue';

describe('GlueResourcePolicyStatement', () => {
  test('creates all required resources', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const statement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.AccountPrincipal('123456789012')],
      actions: ['glue:GetDatabase', 'glue:GetTable'],
      resources: ['*'],
    });

    new GlueResourcePolicyStatement(stack, 'TestPolicy', {
      sid: 'TestStatement',
      statement,
    });

    const template = Template.fromStack(stack);

    // Check custom resource
    template.hasResourceProperties('Custom::GlueResourcePolicyStatement', {
      ServiceToken: Match.anyValue(),
    });

    // Check Lambda function (handler)
    template.resourceCountIs('AWS::Lambda::Function', 2); // Handler + Provider framework

    // Check log group
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 7,
    });

    // Check IAM permissions
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: [
              'glue:GetResourcePolicy',
              'glue:PutResourcePolicy',
              'glue:DeleteResourcePolicy',
            ],
            Effect: 'Allow',
            Resource: '*',
          }),
        ]),
      },
    });
  });
});

