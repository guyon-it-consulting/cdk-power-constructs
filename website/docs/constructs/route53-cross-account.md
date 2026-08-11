---
sidebar_position: 3
---

# Route53 Cross-Account Records

Manage DNS records in Route53 hosted zones that exist in a different AWS account.

## The Problem

In enterprise environments, DNS is often centralized in a dedicated networking account. When workloads in other accounts need to create DNS records, they face several challenges:

1. **Cross-Account Access**: Standard CDK Route53 constructs don't support cross-account operations
2. **IAM Complexity**: Setting up cross-account IAM roles and trust relationships is error-prone
3. **Manual Process**: Teams often resort to manual DNS management or custom scripts
4. **No Lifecycle Management**: CloudFormation can't manage records in other accounts natively

## The Solution

`Route53CrossAccountRecord` and its variants (`ARecordCrossAccount`, `AaaaRecordCrossAccount`, `CnameRecordCrossAccount`) solve these challenges by:

- ✅ **Cross-Account Operations**: Creates records in hosted zones owned by other accounts
- ✅ **Full Lifecycle Management**: CloudFormation manages create, update, and delete
- ✅ **Familiar API**: Same interface as standard Route53 record constructs
- ✅ **Singleton Lambda**: Reuses custom resource handler across all records in a stack
- ✅ **Alias Support**: Works with ALB, CloudFront, and other alias targets

## Prerequisites

### Target Account Setup

The account that owns the hosted zone needs an IAM role that:

1. **Trusts the source account** (where your CDK stack runs)
2. **Has Route53 permissions** to manage records
3. **Has the required tag** for the construct to assume it

```typescript
// In the DNS/Network account
const delegationRole = new iam.Role(this, 'Route53DelegationRole', {
  assumedBy: new iam.AccountPrincipal('SOURCE_ACCOUNT_ID'),
  description: 'Allows cross-account Route53 record management',
});

delegationRole.addToPolicy(new iam.PolicyStatement({
  actions: [
    'route53:ChangeResourceRecordSets',
    'route53:ListResourceRecordSets',
  ],
  resources: [`arn:aws:route53:::hostedzone/${hostedZone.hostedZoneId}`],
}));

// Required tag for the construct's IAM condition
cdk.Tags.of(delegationRole).add('CdkPowerConstructsRoute53CrossAccount', 'true');
```

## API Reference

For detailed API documentation, see:
- [TypeScript API](/api/typescript/classes/ARecordCrossAccount.html)

## Use Cases

### A Record for an Application

Create an A record pointing to an EC2 instance or specific IP addresses:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import { ARecordCrossAccount } from 'cdk-power-constructs/route53';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as iam from 'aws-cdk-lib/aws-iam';

// Reference the cross-account role
const route53Role = iam.Role.fromRoleArn(this, 'Route53Role',
  'arn:aws:iam::DNS_ACCOUNT_ID:role/Route53DelegationRole'
);

// Reference the hosted zone in the other account
const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
  hostedZoneId: 'Z0123456789ABCDEF',
  zoneName: 'example.com',
});

new ARecordCrossAccount(this, 'ApiRecord', {
  zone: hostedZone,
  recordName: 'api',
  target: route53.RecordTarget.fromIpAddresses('10.0.1.100'),
  ttl: cdk.Duration.minutes(5),
  crossAccount: { route53Role },
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
from cdk_power_constructs.route53 import ARecordCrossAccount
from aws_cdk import aws_route53 as route53
from aws_cdk import aws_iam as iam
from aws_cdk import Duration

# Reference the cross-account role
route53_role = iam.Role.from_role_arn(self, "Route53Role",
    "arn:aws:iam::DNS_ACCOUNT_ID:role/Route53DelegationRole"
)

# Reference the hosted zone in the other account
hosted_zone = route53.HostedZone.from_hosted_zone_attributes(self, "Zone",
    hosted_zone_id="Z0123456789ABCDEF",
    zone_name="example.com"
)

ARecordCrossAccount(self, "ApiRecord",
    zone=hosted_zone,
    record_name="api",
    target=route53.RecordTarget.from_ip_addresses("10.0.1.100"),
    ttl=Duration.minutes(5),
    cross_account={"route53_role": route53_role}
)
```

  </TabItem>
</Tabs>

### Alias Record for Application Load Balancer

Point a DNS record to an ALB in your account:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import { ARecordCrossAccount } from 'cdk-power-constructs/route53';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';

new ARecordCrossAccount(this, 'AlbRecord', {
  zone: hostedZone,
  recordName: 'app',
  target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(alb)),
  crossAccount: { route53Role },
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
from cdk_power_constructs.route53 import ARecordCrossAccount
from aws_cdk import aws_route53 as route53
from aws_cdk import aws_route53_targets as targets

ARecordCrossAccount(self, "AlbRecord",
    zone=hosted_zone,
    record_name="app",
    target=route53.RecordTarget.from_alias(targets.LoadBalancerTarget(alb)),
    cross_account={"route53_role": route53_role}
)
```

  </TabItem>
</Tabs>

### CNAME Record

Create a CNAME record pointing to another domain:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import { CnameRecordCrossAccount } from 'cdk-power-constructs/route53';

new CnameRecordCrossAccount(this, 'WwwRecord', {
  zone: hostedZone,
  recordName: 'www',
  domainName: 'example.com',
  crossAccount: { route53Role },
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
from cdk_power_constructs.route53 import CnameRecordCrossAccount

CnameRecordCrossAccount(self, "WwwRecord",
    zone=hosted_zone,
    record_name="www",
    domain_name="example.com",
    cross_account={"route53_role": route53_role}
)
```

  </TabItem>
</Tabs>

### AAAA Record (IPv6)

Create an AAAA record for IPv6 addresses:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import { AaaaRecordCrossAccount } from 'cdk-power-constructs/route53';

new AaaaRecordCrossAccount(this, 'Ipv6Record', {
  zone: hostedZone,
  recordName: 'ipv6',
  target: route53.RecordTarget.fromIpAddresses('2001:db8::1'),
  crossAccount: { route53Role },
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
from cdk_power_constructs.route53 import AaaaRecordCrossAccount

AaaaRecordCrossAccount(self, "Ipv6Record",
    zone=hosted_zone,
    record_name="ipv6",
    target=route53.RecordTarget.from_ip_addresses("2001:db8::1"),
    cross_account={"route53_role": route53_role}
)
```

  </TabItem>
</Tabs>

## Properties

### zone

- **Type**: `route53.IHostedZone`
- **Required**: Yes
- **Description**: The hosted zone in which to create the record (in the target account).

### recordName

- **Type**: `string`
- **Required**: No
- **Default**: Zone root
- **Description**: The subdomain name for this record, relative to the zone root.

### target

- **Type**: `route53.RecordTarget`
- **Required**: Yes (for A/AAAA records)
- **Description**: The target for this record - IP addresses or alias target.

### domainName

- **Type**: `string`
- **Required**: Yes (for CNAME records)
- **Description**: The domain name that this CNAME record should point to.

### ttl

- **Type**: `cdk.Duration`
- **Required**: No
- **Default**: 30 minutes
- **Description**: The resource record cache time to live (TTL). Ignored for alias records.

### crossAccount.route53Role

- **Type**: `iam.IRole`
- **Required**: Yes
- **Description**: IAM role in the target account that allows Route53 operations.

## How It Works

1. **Custom Resource Lambda**: A singleton Lambda function is created per stack
2. **Role Assumption**: The Lambda assumes the cross-account role via STS
3. **Record Management**: Uses the Route53 API with assumed credentials
4. **UPSERT Operations**: Creates or updates records idempotently
5. **Safe Deletion**: Verifies record existence before attempting deletion

## Important Notes

- ⚠️ **Role Trust**: The cross-account role must trust the Lambda execution role
- 🏷️ **Required Tag**: The role must have tag `CdkPowerConstructsRoute53CrossAccount: true`
- ⏱️ **TTL Ignored**: TTL is ignored when using alias targets (AWS limitation)
- 🔄 **UPSERT Behavior**: Records are created or updated, never causing conflicts
- 🗑️ **Safe Deletion**: Missing records during delete don't cause failures

## Best Practices

1. **Least Privilege**: Grant only the minimum Route53 permissions needed
2. **Specific Resources**: Restrict the role to specific hosted zones
3. **Naming Convention**: Use consistent record naming across your organization
4. **Short TTLs for Testing**: Use shorter TTLs in non-production environments
5. **Monitor Changes**: Enable Route53 query logging for audit trails
