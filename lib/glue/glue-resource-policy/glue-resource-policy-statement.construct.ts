import {Construct} from "constructs";
import * as cdk from "aws-cdk-lib/core";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cr from "aws-cdk-lib/custom-resources";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {singletonForStack} from "../../utils/singleton";
import { getHandlerCode, HANDLER_NAME, RUNTIME } from '../../generated/glue-policy-handler.generated';

/**
 * Properties for GlueResourcePolicyStatement
 */
export interface GlueResourcePolicyStatementProps {
  /**
   * Statement ID (SID) to uniquely identify this policy statement.
   * Used for updates and deletions.
   */
  readonly sid: string;

  /**
   * The IAM policy statement to add to the Glue resource policy.
   */
  readonly statement: iam.PolicyStatement;
}

/**
 * Manages individual statements in the AWS Glue Data Catalog resource policy.
 *
 * ## Problem Solved
 *
 * AWS Glue Data Catalog has a single resource-based policy per account/region, but CDK doesn't
 * provide native L2 constructs to manage it. This construct solves several challenges:
 *
 * 1. **Multiple Stacks**: Allows different CDK stacks to add their own policy statements without conflicts
 * 2. **Statement Management**: Uses SID to identify and update/delete specific statements independently
 * 3. **Idempotency**: Safely handles updates and deletions without affecting other statements
 * 4. **Cross-Account Access**: Enables Lake Formation and cross-account data sharing scenarios
 *
 * ## Use Cases
 *
 * - Grant cross-account access to Glue Data Catalog
 * - Enable AWS Lake Formation resource sharing
 * - Allow AWS services (like Athena, EMR) to access Glue resources
 * - Implement least-privilege access patterns for data governance
 */
export class GlueResourcePolicyStatement extends Construct {
  private static lastInstance?: GlueResourcePolicyStatement;

  constructor(scope: Construct, id: string, props: GlueResourcePolicyStatementProps) {
    super(scope, id);

    const provider = singletonForStack(cdk.Stack.of(this), 'GlueResourcePolicyStatementProvider', (scope, id) => {
        const logGroup = new logs.LogGroup(scope, 'EventHandlerLogGroup', {
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        const onEventHandler = new lambda.Function(scope, 'GlueResourcePolicyStatementEventHandler', {
          runtime: RUNTIME,
          handler: HANDLER_NAME,
          code: getHandlerCode(),
          timeout: cdk.Duration.minutes(5),
          logGroup: logGroup
        });

        onEventHandler.addToRolePolicy(new iam.PolicyStatement({
          actions: ['glue:GetResourcePolicy', 'glue:PutResourcePolicy', 'glue:DeleteResourcePolicy'],
          resources: ['*']
        }));

        return new cr.Provider(scope, id, {
          onEventHandler
        });
      }
    );

    const customResource = new cdk.CustomResource(this, 'Resource', {
      serviceToken: provider.serviceToken,
      resourceType: 'Custom::GlueResourcePolicyStatement',
      properties: {
        Sid: props.sid,
        Statement: JSON.stringify(props.statement.toStatementJson()),
        EnableHybrid: true
      }
    });

    // Ensure sequential execution to avoid race conditions
    if (GlueResourcePolicyStatement.lastInstance) {
      customResource.node.addDependency(GlueResourcePolicyStatement.lastInstance);
    }
    GlueResourcePolicyStatement.lastInstance = customResource;
  }
}
