/**
 * CDK Construct for Athena Workgroup with integrated IAM grants.
 *
 * This construct provides a higher-level abstraction over the Athena CfnWorkGroup
 * with built-in grant methods for common permission patterns.
 */
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import * as athena from "aws-cdk-lib/aws-athena";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";

/**
 * Represents an Athena Workgroup.
 */
export interface IAthenaWorkgroup extends cdk.IResource {
  /**
   * The ARN of the workgroup.
   */
  readonly workgroupArn: string;

  /**
   * The name of the workgroup.
   */
  readonly workgroupName: string;

  /**
   * Grant execute permissions on this workgroup.
   */
  grantExecute(grantee: iam.IGrantable): iam.Grant;

  /**
   * Grant read permissions on named queries.
   */
  grantReadNamedQueries(grantee: iam.IGrantable): iam.Grant;

  /**
   * Grant write permissions on named queries.
   */
  grantWriteNamedQueries(grantee: iam.IGrantable): iam.Grant;

  /**
   * Grant read permissions on prepared statements.
   */
  grantReadPreparedStatements(grantee: iam.IGrantable): iam.Grant;

  /**
   * Grant write permissions on prepared statements.
   */
  grantWritePreparedStatements(grantee: iam.IGrantable): iam.Grant;

  /**
   * Grant all permissions on this workgroup.
   */
  grantAll(grantee: iam.IGrantable): iam.Grant;
}

/**
 * Attributes for importing an existing workgroup.
 */
export interface AthenaWorkgroupAttributes {
  /**
   * The ARN of the workgroup.
   */
  readonly workgroupArn: string;

  /**
   * The name of the workgroup.
   */
  readonly workgroupName: string;
}

/**
 * Properties for creating an Athena Workgroup.
 */
export interface AthenaWorkgroupProps {
  /**
   * The name of the workgroup.
   *
   * @default - A unique name is generated.
   */
  readonly workgroupName?: string;

  /**
   * A description of the workgroup.
   *
   * @default - No description.
   */
  readonly description?: string;

  /**
   * Enable CloudWatch metrics publishing for this workgroup.
   *
   * @default false
   */
  readonly publishCloudWatchMetrics?: boolean;

  /**
   * S3 bucket for query results output.
   *
   * @default - No output location configured.
   */
  readonly outputBucket?: s3.IBucket;

  /**
   * S3 prefix for query results.
   *
   * @default - No prefix.
   */
  readonly outputPrefix?: string;

  /**
   * Encryption option for query results.
   *
   * @default 'SSE_S3'
   */
  readonly encryptionOption?: "SSE_S3" | "SSE_KMS" | "CSE_KMS";

  /**
   * KMS key ARN for encryption (required if encryptionOption is SSE_KMS or CSE_KMS).
   *
   * @default - No KMS key.
   */
  readonly kmsKeyArn?: string;

  /**
   * Enforce workgroup configuration on queries.
   * When true, client-side settings are overridden by workgroup settings.
   *
   * @default true
   */
  readonly enforceWorkgroupConfiguration?: boolean;

  /**
   * Bytes scanned limit per query.
   *
   * @default - No limit.
   */
  readonly bytesScannedCutoffPerQuery?: number;

  /**
   * Whether requester pays for S3 access.
   *
   * @default false
   */
  readonly requesterPays?: boolean;

  /**
   * The removal policy for this workgroup.
   *
   * @default RemovalPolicy.RETAIN
   */
  readonly removalPolicy?: cdk.RemovalPolicy;
}

// Permission sets
const EXECUTE_PERMISSIONS = [
  "athena:GetWorkGroup",
  "athena:BatchGetQueryExecution",
  "athena:GetQueryExecution",
  "athena:ListQueryExecutions",
  "athena:StartQueryExecution",
  "athena:StopQueryExecution",
  "athena:GetQueryResults",
  "athena:GetQueryResultsStream",
];

const READ_NAMED_QUERIES_PERMISSIONS = [
  "athena:GetNamedQuery",
  "athena:BatchGetNamedQuery",
  "athena:ListNamedQueries",
];

const WRITE_NAMED_QUERIES_PERMISSIONS = ["athena:CreateNamedQuery", "athena:DeleteNamedQuery"];

const READ_PREPARED_STATEMENTS_PERMISSIONS = [
  "athena:GetPreparedStatement",
  "athena:ListPreparedStatements",
];

const WRITE_PREPARED_STATEMENTS_PERMISSIONS = [
  "athena:CreatePreparedStatement",
  "athena:UpdatePreparedStatement",
  "athena:DeletePreparedStatement",
];

/**
 * Base class for Athena Workgroup with grant methods.
 */
abstract class AthenaWorkgroupBase extends cdk.Resource implements IAthenaWorkgroup {
  public abstract readonly workgroupArn: string;
  public abstract readonly workgroupName: string;

  /**
   * Grant execute permissions on this workgroup.
   *
   * Includes permissions to start, stop, and get query executions.
   */
  public grantExecute(grantee: iam.IGrantable): iam.Grant {
    return this.grant(grantee, EXECUTE_PERMISSIONS);
  }

  /**
   * Grant read permissions on named queries.
   */
  public grantReadNamedQueries(grantee: iam.IGrantable): iam.Grant {
    return this.grant(grantee, READ_NAMED_QUERIES_PERMISSIONS);
  }

  /**
   * Grant write permissions on named queries.
   */
  public grantWriteNamedQueries(grantee: iam.IGrantable): iam.Grant {
    return this.grant(grantee, WRITE_NAMED_QUERIES_PERMISSIONS);
  }

  /**
   * Grant read permissions on prepared statements.
   */
  public grantReadPreparedStatements(grantee: iam.IGrantable): iam.Grant {
    return this.grant(grantee, READ_PREPARED_STATEMENTS_PERMISSIONS);
  }

  /**
   * Grant write permissions on prepared statements.
   */
  public grantWritePreparedStatements(grantee: iam.IGrantable): iam.Grant {
    return this.grant(grantee, WRITE_PREPARED_STATEMENTS_PERMISSIONS);
  }

  /**
   * Grant all permissions on this workgroup.
   */
  public grantAll(grantee: iam.IGrantable): iam.Grant {
    return this.grant(grantee, [
      ...EXECUTE_PERMISSIONS,
      ...READ_NAMED_QUERIES_PERMISSIONS,
      ...WRITE_NAMED_QUERIES_PERMISSIONS,
      ...READ_PREPARED_STATEMENTS_PERMISSIONS,
      ...WRITE_PREPARED_STATEMENTS_PERMISSIONS,
    ]);
  }

  /**
   * Grant custom permissions on this workgroup.
   */
  public grant(grantee: iam.IGrantable, actions: string[]): iam.Grant {
    return iam.Grant.addToPrincipal({
      grantee: grantee,
      resourceArns: [this.workgroupArn],
      actions,
    });
  }
}

/**
 * Athena Workgroup construct with integrated IAM grants.
 *
 * This construct provides a higher-level abstraction over the Athena CfnWorkGroup
 * with built-in grant methods for common permission patterns.
 *
 * @example
 * ```typescript
 * import { AthenaWorkgroup } from 'cdk-power-constructs/athena';
 *
 * const outputBucket = new s3.Bucket(this, 'QueryResults');
 *
 * const workgroup = new AthenaWorkgroup(this, 'AnalyticsWorkgroup', {
 *   workgroupName: 'analytics-workgroup',
 *   description: 'Workgroup for analytics queries',
 *   publishCloudWatchMetrics: true,
 *   outputBucket,
 *   outputPrefix: 'query-results/',
 *   bytesScannedCutoffPerQuery: 10 * 1024 * 1024 * 1024, // 10 GB
 * });
 *
 * // Grant permissions to a role
 * const analyticsRole = new iam.Role(this, 'AnalyticsRole', {
 *   assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
 * });
 *
 * workgroup.grantExecute(analyticsRole);
 * workgroup.grantReadNamedQueries(analyticsRole);
 * ```
 */
export class AthenaWorkgroup extends AthenaWorkgroupBase {
  /**
   * Import an existing workgroup by ARN.
   */
  public static fromWorkgroupArn(scope: Construct, id: string, workgroupArn: string): IAthenaWorkgroup {
    const stack = cdk.Stack.of(scope);
    const arnComponents = stack.splitArn(workgroupArn, cdk.ArnFormat.SLASH_RESOURCE_NAME);
    const workgroupName = arnComponents.resourceName!;

    return AthenaWorkgroup.fromWorkgroupAttributes(scope, id, {
      workgroupArn,
      workgroupName,
    });
  }

  /**
   * Import an existing workgroup by name.
   */
  public static fromWorkgroupName(scope: Construct, id: string, workgroupName: string): IAthenaWorkgroup {
    const stack = cdk.Stack.of(scope);
    const workgroupArn = stack.formatArn({
      service: "athena",
      resource: "workgroup",
      resourceName: workgroupName,
    });

    return AthenaWorkgroup.fromWorkgroupAttributes(scope, id, {
      workgroupArn,
      workgroupName,
    });
  }

  /**
   * Import an existing workgroup by attributes.
   */
  public static fromWorkgroupAttributes(
    scope: Construct,
    id: string,
    attrs: AthenaWorkgroupAttributes
  ): IAthenaWorkgroup {
    class Import extends AthenaWorkgroupBase {
      public readonly workgroupArn = attrs.workgroupArn;
      public readonly workgroupName = attrs.workgroupName;
    }

    return new Import(scope, id);
  }

  public readonly workgroupArn: string;
  public readonly workgroupName: string;

  /**
   * The underlying CfnWorkGroup resource.
   */
  public readonly resource: athena.CfnWorkGroup;

  constructor(scope: Construct, id: string, props: AthenaWorkgroupProps = {}) {
    super(scope, id, {
      physicalName:
        props.workgroupName ??
        cdk.Lazy.string({
          produce: () => cdk.Names.uniqueResourceName(this, { maxLength: 128 }),
        }),
    });

    // Validate description length
    if (props.description !== undefined && props.description.length > 1024) {
      throw new Error(`description length must be less than or equal to 1024, got ${props.description.length}`);
    }

    // Validate KMS key is provided when needed
    if ((props.encryptionOption === "SSE_KMS" || props.encryptionOption === "CSE_KMS") && !props.kmsKeyArn) {
      throw new Error(`kmsKeyArn is required when encryptionOption is ${props.encryptionOption}`);
    }

    // Build result configuration
    let resultConfiguration: athena.CfnWorkGroup.ResultConfigurationProperty | undefined;

    if (props.outputBucket) {
      const outputLocation = props.outputPrefix
        ? `s3://${props.outputBucket.bucketName}/${props.outputPrefix}`
        : `s3://${props.outputBucket.bucketName}/`;

      resultConfiguration = {
        outputLocation,
        encryptionConfiguration: {
          encryptionOption: props.encryptionOption ?? "SSE_S3",
          kmsKey: props.kmsKeyArn,
        },
      };
    }

    // Create the workgroup
    this.resource = new athena.CfnWorkGroup(this, "Resource", {
      name: this.physicalName,
      description: props.description,
      workGroupConfiguration: {
        publishCloudWatchMetricsEnabled: props.publishCloudWatchMetrics ?? false,
        resultConfiguration,
        enforceWorkGroupConfiguration: props.enforceWorkgroupConfiguration ?? true,
        bytesScannedCutoffPerQuery: props.bytesScannedCutoffPerQuery,
        requesterPaysEnabled: props.requesterPays ?? false,
      },
    });

    // Apply removal policy
    if (props.removalPolicy) {
      this.resource.applyRemovalPolicy(props.removalPolicy);
    }

    this.workgroupName = this.getResourceNameAttribute(this.resource.ref);
    this.workgroupArn = this.stack.formatArn({
      service: "athena",
      resource: "workgroup",
      resourceName: this.workgroupName,
    });

    // Grant output bucket access if configured
    if (props.outputBucket) {
      // Note: This doesn't automatically grant access to the bucket.
      // The user needs to explicitly grant bucket permissions to their roles.
    }
  }
}
