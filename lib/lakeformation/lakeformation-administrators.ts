/**
 * CDK Construct for setting up additional Lake Formation administrators.
 *
 * This construct adds IAM roles as Lake Formation administrators,
 * enabling them to manage Lake Formation permissions.
 */
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib/core";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { singletonForStack } from "../utils/singleton";
import { LAKEFORMATION_ADMIN_HANDLER } from "../generated/lakeformation-admin-handler.generated";

/**
 * Properties for SetUpLakeFormationAdministrators construct.
 */
export interface SetUpLakeFormationAdministratorsProps {
  /**
   * IAM roles to add as Lake Formation administrators.
   *
   * These roles will be able to:
   * - Grant and revoke Lake Formation permissions
   * - Create and manage databases and tables
   * - Configure Lake Formation settings
   */
  readonly administrators: iam.IRole[];
}

/**
 * Construct that sets up additional Lake Formation administrators.
 *
 * This construct adds the specified IAM roles as Lake Formation administrators
 * using a custom resource. The administrators can then manage Lake Formation
 * permissions on databases and tables.
 *
 * @example
 * ```typescript
 * import { SetUpLakeFormationAdministrators } from 'cdk-power-constructs/lakeformation';
 *
 * const adminRole = new iam.Role(this, 'LFAdminRole', {
 *   assumedBy: new iam.AccountRootPrincipal(),
 * });
 *
 * const dataEngineerRole = new iam.Role(this, 'DataEngineerRole', {
 *   assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
 * });
 *
 * new SetUpLakeFormationAdministrators(this, 'LFAdmins', {
 *   administrators: [adminRole, dataEngineerRole],
 * });
 * ```
 */
export class SetUpLakeFormationAdministrators extends Construct {
  /**
   * The ARNs of the administrators that were added.
   */
  public readonly administratorArns: string[];

  constructor(scope: Construct, id: string, props: SetUpLakeFormationAdministratorsProps) {
    super(scope, id);

    this.administratorArns = props.administrators.map((role) => role.roleArn);

    const crFunction = singletonForStack<lambda.Function>(
      cdk.Stack.of(this),
      "LakeFormationAdminHandler",
      (stack, singletonId) => {
        const fn = new lambda.Function(stack, singletonId, {
          runtime: lambda.Runtime.NODEJS_22_X,
          handler: "index.handler",
          code: lambda.Code.fromInline(LAKEFORMATION_ADMIN_HANDLER),
          timeout: cdk.Duration.minutes(5),
          description: "Custom resource handler for Lake Formation administrator setup",
          logRetention: logs.RetentionDays.TWO_WEEKS,
        });

        // Grant Lake Formation permissions
        fn.addToRolePolicy(
          new iam.PolicyStatement({
            actions: ["lakeformation:PutDataLakeSettings", "lakeformation:GetDataLakeSettings"],
            resources: ["*"],
          })
        );

        // Grant IAM permissions to validate roles
        fn.addToRolePolicy(
          new iam.PolicyStatement({
            actions: ["iam:GetRole"],
            resources: ["*"],
          })
        );

        return fn;
      }
    );

    new cdk.CustomResource(this, "Resource", {
      resourceType: "Custom::LakeFormationAdministrators",
      serviceToken: crFunction.functionArn,
      properties: {
        DataLakeAdmins: this.administratorArns,
      },
    });
  }
}
