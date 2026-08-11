---
sidebar_position: 4
---

# Examples

Real-world examples using CDK Power Constructs.

## Cross-Account DNS Setup

A common enterprise pattern where DNS is centralized in a network account:

```typescript
import { ARecordCrossAccount } from 'cdk-power-constructs/route53';
import { CertificateCrossAccountDnsValidation } from 'cdk-power-constructs/certificate';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

// Reference the DNS account's role and zone
const route53Role = iam.Role.fromRoleArn(this, 'Route53Role',
  'arn:aws:iam::DNS_ACCOUNT:role/Route53DelegationRole'
);

const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
  hostedZoneId: 'Z0123456789ABCDEF',
  zoneName: 'example.com',
});

// Create a certificate with cross-account DNS validation
const certificate = new CertificateCrossAccountDnsValidation(this, 'Certificate', {
  domainName: 'app.example.com',
  validation: { route53Role, hostedZone },
});

// Create an ALB with the certificate
const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
  vpc,
  internetFacing: true,
});

alb.addListener('HTTPS', {
  port: 443,
  certificates: [certificate.certificate],
  defaultAction: elbv2.ListenerAction.forward([targetGroup]),
});

// Create a DNS record pointing to the ALB
new ARecordCrossAccount(this, 'AppRecord', {
  zone: hostedZone,
  recordName: 'app',
  target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(alb)),
  crossAccount: { route53Role },
});
```

## Data Lake with Lake Formation

Set up a data lake with proper Lake Formation permissions:

```typescript
import { SetUpLakeFormationAdministrators, LakeFormationGrants } from 'cdk-power-constructs/lakeformation';
import { AthenaWorkgroup } from 'cdk-power-constructs/athena';

// 1. Set up Lake Formation administrators
const lfAdminRole = new iam.Role(this, 'LFAdminRole', {
  assumedBy: new iam.AccountRootPrincipal(),
});

new SetUpLakeFormationAdministrators(this, 'LFAdmins', {
  administrators: [lfAdminRole],
});

// 2. Create grants helper
const lfGrants = new LakeFormationGrants(this, 'LFGrants', {
  adminRole: lfAdminRole,
});

// 3. Create Athena workgroup with cost controls
const workgroup = new AthenaWorkgroup(this, 'AnalyticsWorkgroup', {
  workgroupName: 'analytics',
  outputBucket: resultsBucket,
  publishCloudWatchMetrics: true,
  bytesScannedCutoffPerQuery: 10 * 1024 * 1024 * 1024, // 10 GB
});

// 4. Create roles and grant permissions
const etlRole = new iam.Role(this, 'ETLRole', {
  assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
});

const analyticsRole = new iam.Role(this, 'AnalyticsRole', {
  assumedBy: new iam.AccountRootPrincipal(),
});

// ETL: full access to raw, write to curated
lfGrants.grant(etlRole)
  .onGlueDatabase('raw')
  .onAllGlueTables('raw')
  .onGlueDatabase('curated', { permissions: ['CREATE_TABLE'] })
  .onAllGlueTables('curated', { permissions: ['SELECT', 'INSERT', 'ALTER'] });

// Analytics: read-only on curated
lfGrants.grant(analyticsRole)
  .onGlueDatabase('curated', { permissions: ['DESCRIBE'] })
  .onAllGlueTables('curated', { permissions: ['SELECT', 'DESCRIBE'] });

// Grant workgroup access
workgroup.grantExecute(analyticsRole);
workgroup.grantReadNamedQueries(analyticsRole);
```

## Zero-ETL Analytics Pipeline

Enable real-time analytics on DynamoDB data:

```typescript
import { ZeroEtlDynamoDbToS3Tables } from 'cdk-power-constructs/s3tables';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

// Create DynamoDB table with required configuration
const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
  partitionKey: { name: 'orderId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
  pointInTimeRecovery: true,
  encryption: dynamodb.TableEncryption.DEFAULT,
});

// Add required resource policy
ordersTable.addToResourcePolicy(new iam.PolicyStatement({
  actions: ['dynamodb:ExportTableToPointInTime', 'dynamodb:DescribeTable', 'dynamodb:DescribeExport'],
  principals: [new iam.ServicePrincipal('glue.amazonaws.com')],
  resources: ['*'],
  conditions: {
    StringEquals: { 'aws:SourceAccount': this.account },
    ArnLike: { 'aws:SourceArn': `arn:aws:glue:${this.region}:${this.account}:integration:*` },
  },
}));

// Create Zero-ETL integration
new ZeroEtlDynamoDbToS3Tables(this, 'OrdersAnalytics', {
  tableBucketArn: analyticsBucket.tableBucketArn,
  tableBucketName: 'orders-analytics',
  sourceTable: ordersTable,
  integrationName: 'orders-zero-etl',
  unnestSpec: 'TOPLEVEL',
});

// Now query with Athena:
// SELECT * FROM "s3tablescatalog/orders-analytics"."default"."OrdersTable"
// WHERE timestamp >= 1704067200
```

## Multi-Stack Cross-Account Setup

Manage Glue policies across multiple stacks:

```typescript
import { GlueResourcePolicyStatement } from 'cdk-power-constructs/glue';

// Stack 1: Enable Lake Formation
new GlueResourcePolicyStatement(this, 'LakeFormationAccess', {
  sid: 'AllowLakeFormation',
  statement: new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    principals: [new iam.ServicePrincipal('lakeformation.amazonaws.com')],
    actions: ['glue:*'],
    resources: ['*'],
  }),
});

// Stack 2: Cross-account access for another team
new GlueResourcePolicyStatement(this, 'TeamBAccess', {
  sid: 'AllowTeamBAccount',
  statement: new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    principals: [new iam.AccountPrincipal('TEAM_B_ACCOUNT_ID')],
    actions: ['glue:GetDatabase', 'glue:GetTable', 'glue:GetPartitions'],
    resources: [
      `arn:aws:glue:${this.region}:${this.account}:catalog`,
      `arn:aws:glue:${this.region}:${this.account}:database/shared-*`,
      `arn:aws:glue:${this.region}:${this.account}:table/shared-*/*`,
    ],
  }),
});
```

Check the [API Reference](/api/typescript/) for detailed usage.
