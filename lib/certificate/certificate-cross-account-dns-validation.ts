/**
 * CDK Construct for ACM certificates with cross-account DNS validation.
 *
 * This construct enables SSL/TLS certificate creation and validation using Route53 DNS
 * validation across different AWS accounts.
 */
import * as cdk from "aws-cdk-lib/core";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import { singletonForStack } from "../utils/singleton";
import { CERTIFICATE_CROSS_ACCOUNT_HANDLER } from "../generated/certificate-cross-account-handler.generated";

/**
 * Cross-account DNS validation configuration.
 */
export interface CrossAccountDnsValidationConfig {
  /**
   * IAM role in the target account that allows Route53 operations.
   * This role must have permissions to manage Route53 records and trust
   * the Lambda execution role in the source account.
   */
  readonly route53Role: iam.IRole;

  /**
   * Route53 hosted zone where DNS validation records will be created.
   */
  readonly hostedZone: route53.IHostedZone;
}

/**
 * Properties for CertificateCrossAccountDnsValidation construct.
 */
export interface CertificateCrossAccountDnsValidationProps {
  /**
   * Fully-qualified domain name to request a certificate for.
   *
   * May contain wildcards, such as `*.example.com`.
   */
  readonly domainName: string;

  /**
   * Alternative domain names on this certificate.
   *
   * Use this to register alternative domain names that represent the same site.
   *
   * @default - No additional FQDNs will be included as alternative domain names.
   */
  readonly subjectAlternativeNames?: string[];

  /**
   * Enable or disable transparency logging for this certificate.
   *
   * Once a certificate has been logged, it cannot be removed from the log.
   * Opting out at that point will have no effect.
   *
   * @default true
   */
  readonly transparencyLoggingEnabled?: boolean;

  /**
   * Specifies the algorithm of the public and private key pair that your certificate uses to encrypt data.
   *
   * @default KeyAlgorithm.RSA_2048
   */
  readonly keyAlgorithm?: acm.KeyAlgorithm;

  /**
   * Cross-account DNS validation configuration.
   */
  readonly validation: CrossAccountDnsValidationConfig;
}

/**
 * CDK construct that creates an ACM certificate with DNS validation using cross-account Route53.
 *
 * This construct handles the complexity of validating SSL/TLS certificates when the certificate
 * is requested in one AWS account but the DNS zone is managed in another account.
 *
 * @example
 * ```typescript
 * import { CertificateCrossAccountDnsValidation } from 'cdk-power-constructs/certificate';
 *
 * const route53Role = iam.Role.fromRoleArn(this, 'Route53Role',
 *   'arn:aws:iam::DNS_ACCOUNT:role/Route53DelegationRole'
 * );
 *
 * const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
 *   hostedZoneId: 'Z0123456789ABCDEF',
 *   zoneName: 'example.com',
 * });
 *
 * const cert = new CertificateCrossAccountDnsValidation(this, 'Certificate', {
 *   domainName: 'api.example.com',
 *   subjectAlternativeNames: ['*.api.example.com'],
 *   validation: {
 *     route53Role,
 *     hostedZone,
 *   },
 * });
 *
 * // Use cert.certificateArn with ALB, CloudFront, etc.
 * ```
 */
export class CertificateCrossAccountDnsValidation extends cdk.Resource {
  /**
   * The ARN of the certificate.
   */
  public readonly certificateArn: string;

  /**
   * The underlying ICertificate reference for use with other CDK constructs.
   */
  public readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: CertificateCrossAccountDnsValidationProps) {
    super(scope, id);

    const crFunction = singletonForStack<lambda.Function>(
      cdk.Stack.of(this),
      "CertificateCrossAccountHandler",
      (stack, singletonId) => {
        const fn = new lambda.Function(stack, singletonId, {
          runtime: lambda.Runtime.NODEJS_22_X,
          handler: "index.handler",
          code: lambda.Code.fromInline(CERTIFICATE_CROSS_ACCOUNT_HANDLER),
          timeout: cdk.Duration.minutes(5),
          description: "Custom resource handler for cross-account ACM certificate DNS validation",
          logRetention: logs.RetentionDays.TWO_WEEKS,
        });

        // Grant ACM permissions
        fn.addToRolePolicy(
          new iam.PolicyStatement({
            actions: [
              "acm:RequestCertificate",
              "acm:DescribeCertificate",
              "acm:DeleteCertificate",
              "acm:ListCertificates",
            ],
            resources: ["*"],
          })
        );

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
    props.validation.route53Role.grantAssumeRole(crFunction.grantPrincipal);

    const customResource = new cdk.CustomResource(this, "Resource", {
      resourceType: "Custom::CertificateCrossAccountDnsValidation",
      serviceToken: crFunction.functionArn,
      properties: {
        DomainName: props.domainName,
        SubjectAlternativeNames: props.subjectAlternativeNames,
        CertificateTransparencyLoggingPreference: props.transparencyLoggingEnabled !== false ? "ENABLED" : "DISABLED",
        KeyAlgorithm: props.keyAlgorithm?.toString(),
        Route53RoleArn: props.validation.route53Role.roleArn,
        HostedZoneId: props.validation.hostedZone.hostedZoneId,
      },
    });

    this.certificateArn = customResource.getAttString("CertificateArn");
    this.certificate = acm.Certificate.fromCertificateArn(this, "CertRef", this.certificateArn);
  }
}
