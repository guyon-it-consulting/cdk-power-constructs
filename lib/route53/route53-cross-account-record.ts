/**
 * CDK Constructs for managing Route53 DNS records across AWS accounts.
 *
 * This module provides constructs that enable creation and management of Route53 DNS records
 * when the records need to be created in a hosted zone that exists in a different AWS account.
 * It uses CloudFormation custom resources with cross-account IAM role assumption.
 */
import * as cdk from "aws-cdk-lib/core";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { singletonForStack } from "../utils/singleton";
import { ROUTE53_CROSS_ACCOUNT_HANDLER } from "../generated/route53-cross-account-handler.generated";

/**
 * Cross-account configuration for Route53 operations.
 */
export interface CrossAccountConfig {
  /**
   * IAM role in the target account that allows Route53 operations.
   * This role must have permissions to manage Route53 records and trust
   * the Lambda execution role in the source account.
   */
  readonly route53Role: iam.IRole;
}

/**
 * Base options for creating Route53 records with cross-account access.
 */
export interface Route53CrossAccountRecordOptions {
  /**
   * The hosted zone in which to define the new record.
   */
  readonly zone: route53.IHostedZone;

  /**
   * The subdomain name for this record. This should be relative to the zone root name.
   *
   * For example, if you want to create a record for acme.example.com, specify "acme".
   * You can also specify the fully qualified domain name which terminates with a ".".
   * For example, "acme.example.com.".
   *
   * @default zone root
   */
  readonly recordName?: string;

  /**
   * The resource record cache time to live (TTL).
   * @default Duration.minutes(30)
   */
  readonly ttl?: cdk.Duration;

  /**
   * A comment to add on the record.
   * @default no comment
   */
  readonly comment?: string;

  /**
   * Cross-account configuration for Route53 operations.
   */
  readonly crossAccount: CrossAccountConfig;
}

/**
 * Properties for creating Route53 records with cross-account access.
 */
export interface Route53CrossAccountRecordProps extends Route53CrossAccountRecordOptions {
  /**
   * The record type.
   */
  readonly recordType: route53.RecordType;

  /**
   * The target for this record, either `RecordTarget.fromValues()` or `RecordTarget.fromAlias()`.
   */
  readonly target: route53.RecordTarget;
}

/**
 * Properties for creating an A record with cross-account access.
 */
export interface ARecordCrossAccountProps extends Route53CrossAccountRecordOptions {
  /**
   * The target for this A record (IPv4 addresses or alias target).
   */
  readonly target: route53.RecordTarget;
}

/**
 * Properties for creating an AAAA record with cross-account access.
 */
export interface AaaaRecordCrossAccountProps extends Route53CrossAccountRecordOptions {
  /**
   * The target for this AAAA record (IPv6 addresses or alias target).
   */
  readonly target: route53.RecordTarget;
}

/**
 * Properties for creating a CNAME record with cross-account access.
 */
export interface CnameRecordCrossAccountProps extends Route53CrossAccountRecordOptions {
  /**
   * The domain name that this CNAME record should point to.
   */
  readonly domainName: string;
}

/**
 * CDK construct for creating Route53 records with cross-account access.
 *
 * This construct creates DNS records in a Route53 hosted zone that exists in a different
 * AWS account by using a custom resource Lambda that assumes a cross-account IAM role.
 *
 * @example
 * ```typescript
 * import { ARecordCrossAccount } from 'cdk-power-constructs/route53';
 *
 * const route53Role = iam.Role.fromRoleArn(this, 'Route53Role',
 *   'arn:aws:iam::TARGET_ACCOUNT:role/Route53DelegationRole'
 * );
 *
 * new ARecordCrossAccount(this, 'ApiRecord', {
 *   zone: hostedZone,
 *   recordName: 'api',
 *   target: route53.RecordTarget.fromIpAddresses('1.2.3.4'),
 *   crossAccount: { route53Role },
 * });
 * ```
 */
export class Route53CrossAccountRecord extends cdk.Resource {
  /**
   * The domain name of the record.
   */
  public readonly domainName: string;

  constructor(scope: Construct, id: string, props: Route53CrossAccountRecordProps) {
    super(scope, id);

    const ttl = props.target.aliasTarget
      ? undefined
      : ((props.ttl && props.ttl.toSeconds()) ?? 1800).toString();

    if (props.target.aliasTarget && props.ttl != undefined) {
      cdk.Annotations.of(this).addWarningV2(
        "cdk-power-constructs:route53:ttlIgnored",
        "Ignoring ttl since 'target' uses an alias target"
      );
    }

    const recordName = determineFullyQualifiedDomainName(
      props.recordName || props.zone.zoneName,
      props.zone
    );

    const crFunction = singletonForStack<lambda.Function>(
      cdk.Stack.of(this),
      "Route53CrossAccountHandler",
      (stack, singletonId) => {
        const fn = new lambda.Function(stack, singletonId, {
          runtime: lambda.Runtime.NODEJS_22_X,
          handler: "index.handler",
          code: lambda.Code.fromInline(ROUTE53_CROSS_ACCOUNT_HANDLER),
          timeout: cdk.Duration.minutes(5),
          description: "Custom resource handler for Route53 cross-account record management",
          logRetention: logs.RetentionDays.TWO_WEEKS,
        });

        // Grant STS assume role permission
        fn.addToRolePolicy(
          new iam.PolicyStatement({
            actions: ["sts:AssumeRole"],
            resources: ["*"],
            conditions: {
              StringLike: {
                "iam:ResourceTag/CdkPowerConstructsRoute53CrossAccount": "true",
              },
            },
          })
        );

        return fn;
      }
    );

    // Grant the function permission to assume the cross-account role
    props.crossAccount.route53Role.grantAssumeRole(crFunction.grantPrincipal);

    new cdk.CustomResource(this, "Resource", {
      resourceType: "Custom::Route53CrossAccountRecord",
      serviceToken: crFunction.functionArn,
      properties: {
        HostedZoneId: props.zone.hostedZoneId,
        Name: recordName,
        Type: props.recordType,
        ResourceRecords: props.target.values,
        AliasTarget: props.target.aliasTarget
          ? props.target.aliasTarget.bind(
              { node: this.node, stack: cdk.Stack.of(this) } as route53.IRecordSet,
              props.zone
            )
          : undefined,
        TTL: ttl,
        Comment: props.comment,
        Route53RoleArn: props.crossAccount.route53Role.roleArn,
      },
    });

    this.domainName = recordName;
  }
}

/**
 * CDK construct for creating A records with cross-account access.
 *
 * @example
 * ```typescript
 * new ARecordCrossAccount(this, 'ApiRecord', {
 *   zone: hostedZone,
 *   recordName: 'api',
 *   target: route53.RecordTarget.fromIpAddresses('1.2.3.4'),
 *   crossAccount: { route53Role },
 * });
 * ```
 */
export class ARecordCrossAccount extends Route53CrossAccountRecord {
  constructor(scope: Construct, id: string, props: ARecordCrossAccountProps) {
    super(scope, id, {
      ...props,
      recordType: route53.RecordType.A,
      target: props.target,
    });
  }
}

/**
 * CDK construct for creating AAAA records with cross-account access.
 *
 * @example
 * ```typescript
 * new AaaaRecordCrossAccount(this, 'Ipv6Record', {
 *   zone: hostedZone,
 *   recordName: 'ipv6',
 *   target: route53.RecordTarget.fromIpAddresses('2001:db8::1'),
 *   crossAccount: { route53Role },
 * });
 * ```
 */
export class AaaaRecordCrossAccount extends Route53CrossAccountRecord {
  constructor(scope: Construct, id: string, props: AaaaRecordCrossAccountProps) {
    super(scope, id, {
      ...props,
      recordType: route53.RecordType.AAAA,
      target: props.target,
    });
  }
}

/**
 * CDK construct for creating CNAME records with cross-account access.
 *
 * @example
 * ```typescript
 * new CnameRecordCrossAccount(this, 'WwwRecord', {
 *   zone: hostedZone,
 *   recordName: 'www',
 *   domainName: 'example.com',
 *   crossAccount: { route53Role },
 * });
 * ```
 */
export class CnameRecordCrossAccount extends Route53CrossAccountRecord {
  constructor(scope: Construct, id: string, props: CnameRecordCrossAccountProps) {
    super(scope, id, {
      ...props,
      recordType: route53.RecordType.CNAME,
      target: route53.RecordTarget.fromValues(props.domainName),
    });
  }
}

/**
 * Determines the fully qualified domain name for a record.
 * Duplicated from aws-cdk-lib/aws-route53/lib/util.ts
 */
export function determineFullyQualifiedDomainName(
  providedName: string,
  hostedZone: route53.IHostedZone
): string {
  if (providedName.endsWith(".")) {
    return providedName;
  }

  const hostedZoneName = stripTrailingDot(hostedZone.zoneName);
  const suffix = `.${hostedZoneName}`;

  if (providedName.endsWith(suffix) || providedName === hostedZoneName) {
    return `${providedName}.`;
  }

  return `${providedName}${suffix}.`;
}

function stripTrailingDot(zoneName: string): string {
  return zoneName.endsWith(".") ? zoneName.substring(0, zoneName.length - 1) : zoneName;
}
