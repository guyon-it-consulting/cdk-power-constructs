/**
 * CDK Construct for Zero-ETL integration from DynamoDB to S3 Tables.
 *
 * This construct sets up all required resources for a DynamoDB to S3 Tables Zero-ETL integration,
 * enabling real-time analytics on DynamoDB data without ETL pipelines.
 */
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib/core";
import * as iam from "aws-cdk-lib/aws-iam";
import * as glue from "aws-cdk-lib/aws-glue";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cr from "aws-cdk-lib/custom-resources";
import { singletonForStack } from "../utils/singleton";

/**
 * Properties for the ZeroEtlDynamoDbToS3Tables construct.
 */
export interface ZeroEtlDynamoDbToS3TablesProps {
  /**
   * The ARN of the S3 Tables bucket to use as the target for the Zero-ETL integration.
   */
  readonly tableBucketArn: string;

  /**
   * The name of the S3 Tables bucket.
   */
  readonly tableBucketName: string;

  /**
   * The DynamoDB table to use as the source for the Zero-ETL integration.
   *
   * **Prerequisites for the source DynamoDB table:**
   * - Point-in-time recovery (PITR) must be enabled
   * - Encryption must be set to AWS_OWNED (TableEncryption.DEFAULT)
   * - Resource policy must grant Glue service permissions
   */
  readonly sourceTable: dynamodb.ITable;

  /**
   * The name for the Glue integration.
   */
  readonly integrationName: string;

  /**
   * Unnest specification for the integration table properties.
   *
   * Controls how nested DynamoDB attributes are mapped to Iceberg columns:
   * - `FULL`: Unnest all nested attributes into separate columns
   * - `TOPLEVEL`: Only unnest top-level attributes
   * - `NOUNNEST`: Keep nested attributes as-is (JSON strings)
   *
   * @default 'NOUNNEST'
   */
  readonly unnestSpec?: "FULL" | "TOPLEVEL" | "NOUNNEST";
}

/**
 * Creates a Zero-ETL integration from DynamoDB to S3 Tables.
 *
 * This construct sets up all required resources for a DynamoDB to S3 Tables Zero-ETL integration:
 * - Glue Data Catalog resource policy (shared across all integrations in the stack)
 * - IAM role for the Zero-ETL integration with necessary permissions
 * - Glue integration resource property
 * - Glue integration
 *
 * **Prerequisites for the source DynamoDB table:**
 * - Point-in-time recovery (PITR) must be enabled
 * - Encryption must be set to AWS_OWNED (TableEncryption.DEFAULT)
 * - Resource policy must grant Glue service permissions:
 *
 * @example
 * ```typescript
 * import { ZeroEtlDynamoDbToS3Tables } from 'cdk-power-constructs/s3tables';
 *
 * // Prerequisites: DynamoDB table with PITR enabled
 * const sourceTable = new dynamodb.Table(this, 'SourceTable', {
 *   partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
 *   pointInTimeRecovery: true,
 *   encryption: dynamodb.TableEncryption.DEFAULT,
 * });
 *
 * // Add required resource policy for Glue access
 * sourceTable.addToResourcePolicy(new iam.PolicyStatement({
 *   actions: ['dynamodb:ExportTableToPointInTime', 'dynamodb:DescribeTable', 'dynamodb:DescribeExport'],
 *   principals: [new iam.ServicePrincipal('glue.amazonaws.com')],
 *   resources: ['*'],
 *   conditions: {
 *     StringEquals: { 'aws:SourceAccount': this.account },
 *     ArnLike: { 'aws:SourceArn': `arn:aws:glue:${this.region}:${this.account}:integration:*` },
 *   },
 * }));
 *
 * new ZeroEtlDynamoDbToS3Tables(this, 'Analytics', {
 *   tableBucketArn: 'arn:aws:s3tables:us-east-1:123456789012:bucket/my-analytics-bucket',
 *   tableBucketName: 'my-analytics-bucket',
 *   sourceTable,
 *   integrationName: 'my-zero-etl-integration',
 * });
 * ```
 */
export class ZeroEtlDynamoDbToS3Tables extends Construct {
  /**
   * The IAM role created for the Zero-ETL integration.
   */
  public readonly zeroEtlRole: iam.Role;

  /**
   * The Glue integration resource.
   */
  public readonly integration: glue.CfnIntegration;

  constructor(scope: Construct, id: string, props: ZeroEtlDynamoDbToS3TablesProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    const s3CatalogArn = cdk.Arn.format(
      {
        service: "glue",
        resource: "catalog",
        arnFormat: cdk.ArnFormat.SLASH_RESOURCE_NAME,
        resourceName: `s3tablescatalog/${props.tableBucketName}`,
      },
      stack
    );

    const resourceArn = cdk.Arn.format(
      {
        service: "glue",
        resource: "catalog",
        arnFormat: cdk.ArnFormat.SLASH_RESOURCE_NAME,
        resourceName: "s3tablescatalog/*",
      },
      stack
    );

    // Shared policy for the custom resources
    const sharedCrPolicy = [
      new iam.PolicyStatement({
        actions: ["glue:PutResourcePolicy", "glue:DeleteResourcePolicy", "glue:GetResourcePolicy"],
        resources: ["*"],
      }),
      new iam.PolicyStatement({
        actions: [
          "glue:CreateIntegrationTableProperties",
          "glue:DeleteIntegrationTableProperties",
          "glue:GetIntegrationTableProperties",
        ],
        resources: ["*"],
      }),
    ];

    // Create or get the Glue resource policy (singleton per stack)
    const glueResourcePolicy = singletonForStack(stack, "GlueResourcePolicy", (s, singletonId) =>
      new cr.AwsCustomResource(s, singletonId, {
        onUpdate: {
          service: "Glue",
          action: "putResourcePolicy",
          parameters: {
            EnableHybrid: "TRUE",
            PolicyInJson: JSON.stringify(
              new iam.PolicyDocument({
                statements: [
                  new iam.PolicyStatement({
                    principals: [new iam.AccountRootPrincipal()],
                    actions: ["glue:CreateInboundIntegration"],
                    resources: [resourceArn],
                  }),
                  new iam.PolicyStatement({
                    principals: [new iam.ServicePrincipal("glue.amazonaws.com")],
                    actions: ["glue:AuthorizeInboundIntegration"],
                    resources: [resourceArn],
                  }),
                  // Hybrid cross-account sharing policy for LakeFormation and Glue policies
                  new iam.PolicyStatement({
                    principals: [new iam.ServicePrincipal("ram.amazonaws.com")],
                    actions: ["glue:ShareResource"],
                    resources: [
                      `arn:aws:glue:${stack.region}:${stack.account}:table/*/*`,
                      `arn:aws:glue:${stack.region}:${stack.account}:database/*`,
                      `arn:aws:glue:${stack.region}:${stack.account}:catalog`,
                    ],
                  }),
                ],
              })
            ),
          },
          physicalResourceId: cr.PhysicalResourceId.of("glueDataCatalogPermissions"),
        },
        onDelete: {
          service: "Glue",
          action: "deleteResourcePolicy",
        },
        policy: cr.AwsCustomResourcePolicy.fromStatements(sharedCrPolicy),
      })
    );

    // Create IAM role for Zero-ETL integration
    this.zeroEtlRole = new iam.Role(this, "ZeroETLRole", {
      assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
      description: `Zero-ETL integration role for ${props.integrationName}`,
    });

    this.zeroEtlRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["glue:GetConnections", "glue:GetConnection"],
        resources: [
          `arn:aws:glue:*:${stack.account}:catalog`,
          `arn:aws:glue:${stack.region}:${stack.account}:connection/*`,
        ],
      })
    );

    this.zeroEtlRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "glue:ListEntities",
          "glue:RefreshOAuth2Tokens",
          "logs:CreateLogStream",
          "logs:CreateLogGroup",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      })
    );

    this.zeroEtlRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: { StringEquals: { "cloudwatch:namespace": "AWS/Glue/ZeroETL" } },
      })
    );

    this.zeroEtlRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "s3tables:Get*",
          "s3tables:List*",
          "s3tables:Put*",
          "s3tables:Rename*",
          "s3tables:Update*",
          "s3tables:Create*",
          "s3tables:Delete*",
        ],
        resources: [props.tableBucketArn, `${props.tableBucketArn}/*`],
      })
    );

    // Create Glue integration resource property (singleton per table bucket)
    const resourceProperty = singletonForStack(
      stack,
      `ResourceProperty-${props.tableBucketName}`,
      (s, singletonId) => {
        const rp = new glue.CfnIntegrationResourceProperty(s, singletonId, {
          resourceArn: s3CatalogArn,
          targetProcessingProperties: { roleArn: this.zeroEtlRole.roleArn },
        });
        rp.node.addDependency(glueResourcePolicy);
        return rp;
      }
    );

    // Create integration table properties
    const tableProperties = new cr.AwsCustomResource(this, "IntegrationTableProperties", {
      onCreate: {
        service: "Glue",
        action: "createIntegrationTableProperties",
        parameters: {
          ResourceArn: s3CatalogArn,
          TableName: props.sourceTable.tableName,
          TargetTableConfig: {
            UnnestSpec: props.unnestSpec ?? "NOUNNEST",
          },
        },
        physicalResourceId: cr.PhysicalResourceId.of(`${props.integrationName}-table-properties`),
      },
      onDelete: {
        service: "Glue",
        action: "deleteIntegrationTableProperties",
        parameters: {
          ResourceArn: s3CatalogArn,
          TableName: props.sourceTable.tableName,
        },
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements(sharedCrPolicy),
    });
    tableProperties.node.addDependency(resourceProperty);

    // Create the Glue integration
    this.integration = new glue.CfnIntegration(this, "Integration", {
      integrationName: props.integrationName,
      sourceArn: props.sourceTable.tableArn,
      targetArn: s3CatalogArn,
      integrationConfig: {},
    });
    this.integration.node.addDependency(tableProperties);
  }
}
