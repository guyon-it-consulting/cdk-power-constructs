---
sidebar_position: 4
---

# Certificate Cross-Account DNS Validation

Create ACM certificates with DNS validation when the Route53 hosted zone is in a different AWS account.

## The Problem

When requesting SSL/TLS certificates from AWS Certificate Manager (ACM), DNS validation requires creating CNAME records in Route53. In enterprise environments where DNS is centralized, this creates challenges:

1. **Separate Accounts**: The certificate is needed in a workload account, but DNS is in a network account
2. **Validation Records**: ACM requires specific DNS records that must be created cross-account
3. **Manual Process**: Teams often manually copy validation records between accounts
4. **Automation Gap**: Standard CDK doesn't support cross-account certificate validation

## The Solution

`CertificateCrossAccountDnsValidation` solves these challenges by:

- ✅ **Automated Validation**: Creates DNS validation records in the cross-account hosted zone
- ✅ **Full Lifecycle**: Manages certificate request, validation, and cleanup
- ✅ **Familiar Interface**: Similar API to standard ACM certificate constructs
- ✅ **SAN Support**: Supports Subject Alternative Names for multi-domain certificates
- ✅ **Cleanup on Delete**: Removes validation records when the stack is deleted

## Prerequisites

### Target Account Setup

The account that owns the hosted zone needs an IAM role (same as Route53 cross-account):

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
- [TypeScript API](/api/typescript/classes/CertificateCrossAccountDnsValidation.html)

## Use Cases

### Basic Certificate

Create a certificate for a single domain:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import { CertificateCrossAccountDnsValidation } from 'cdk-power-constructs/certificate';
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

const certificate = new CertificateCrossAccountDnsValidation(this, 'Certificate', {
  domainName: 'api.example.com',
  validation: {
    route53Role,
    hostedZone,
  },
});

// Use the certificate ARN with ALB, CloudFront, etc.
console.log(certificate.certificateArn);
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
from cdk_power_constructs.certificate import CertificateCrossAccountDnsValidation
from aws_cdk import aws_route53 as route53
from aws_cdk import aws_iam as iam

# Reference the cross-account role
route53_role = iam.Role.from_role_arn(self, "Route53Role",
    "arn:aws:iam::DNS_ACCOUNT_ID:role/Route53DelegationRole"
)

# Reference the hosted zone in the other account
hosted_zone = route53.HostedZone.from_hosted_zone_attributes(self, "Zone",
    hosted_zone_id="Z0123456789ABCDEF",
    zone_name="example.com"
)

certificate = CertificateCrossAccountDnsValidation(self, "Certificate",
    domain_name="api.example.com",
    validation={
        "route53_role": route53_role,
        "hosted_zone": hosted_zone
    }
)

# Use the certificate ARN with ALB, CloudFront, etc.
print(certificate.certificate_arn)
```

  </TabItem>
</Tabs>

### Wildcard Certificate with SANs

Create a certificate covering multiple domains:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
const certificate = new CertificateCrossAccountDnsValidation(this, 'WildcardCert', {
  domainName: 'example.com',
  subjectAlternativeNames: [
    '*.example.com',
    'api.example.com',
    'admin.example.com',
  ],
  validation: {
    route53Role,
    hostedZone,
  },
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
certificate = CertificateCrossAccountDnsValidation(self, "WildcardCert",
    domain_name="example.com",
    subject_alternative_names=[
        "*.example.com",
        "api.example.com",
        "admin.example.com"
    ],
    validation={
        "route53_role": route53_role,
        "hosted_zone": hosted_zone
    }
)
```

  </TabItem>
</Tabs>

### Use with Application Load Balancer

Attach the certificate to an ALB:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

const certificate = new CertificateCrossAccountDnsValidation(this, 'Certificate', {
  domainName: 'app.example.com',
  validation: { route53Role, hostedZone },
});

const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
  vpc,
  internetFacing: true,
});

alb.addListener('HTTPS', {
  port: 443,
  certificates: [
    // Use the certificate property to get the ICertificate interface
    certificate.certificate,
  ],
  defaultAction: elbv2.ListenerAction.forward([targetGroup]),
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
from aws_cdk import aws_elasticloadbalancingv2 as elbv2

certificate = CertificateCrossAccountDnsValidation(self, "Certificate",
    domain_name="app.example.com",
    validation={"route53_role": route53_role, "hosted_zone": hosted_zone}
)

alb = elbv2.ApplicationLoadBalancer(self, "ALB",
    vpc=vpc,
    internet_facing=True
)

alb.add_listener("HTTPS",
    port=443,
    certificates=[certificate.certificate],
    default_action=elbv2.ListenerAction.forward([target_group])
)
```

  </TabItem>
</Tabs>

### Use with CloudFront (us-east-1)

For CloudFront, certificates must be in us-east-1:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

// Note: This must be deployed in us-east-1 for CloudFront
const certificate = new CertificateCrossAccountDnsValidation(this, 'Certificate', {
  domainName: 'cdn.example.com',
  validation: { route53Role, hostedZone },
});

const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: { origin: new origins.S3Origin(bucket) },
  domainNames: ['cdn.example.com'],
  certificate: certificate.certificate,
});
```

  </TabItem>
</Tabs>

## Properties

### domainName

- **Type**: `string`
- **Required**: Yes
- **Description**: Fully-qualified domain name for the certificate. May contain wildcards (e.g., `*.example.com`).

### subjectAlternativeNames

- **Type**: `string[]`
- **Required**: No
- **Description**: Additional domain names to include in the certificate.

### transparencyLoggingEnabled

- **Type**: `boolean`
- **Required**: No
- **Default**: `true`
- **Description**: Enable Certificate Transparency logging.

### keyAlgorithm

- **Type**: `acm.KeyAlgorithm`
- **Required**: No
- **Default**: `RSA_2048`
- **Description**: The algorithm for the certificate's key pair.

### validation.route53Role

- **Type**: `iam.IRole`
- **Required**: Yes
- **Description**: IAM role in the target account that allows Route53 operations.

### validation.hostedZone

- **Type**: `route53.IHostedZone`
- **Required**: Yes
- **Description**: The Route53 hosted zone where validation records will be created.

## Outputs

### certificateArn

- **Type**: `string`
- **Description**: The ARN of the created certificate.

### certificate

- **Type**: `acm.ICertificate`
- **Description**: The certificate as an ICertificate interface for use with other CDK constructs.

## How It Works

1. **Request Certificate**: Creates a new ACM certificate with DNS validation
2. **Wait for Validation Options**: Polls ACM until validation records are available
3. **Create DNS Records**: Creates CNAME records in the cross-account hosted zone
4. **Certificate Issuance**: ACM validates the DNS records and issues the certificate
5. **Cleanup on Delete**: Removes both the certificate and validation records

## Important Notes

- ⏱️ **Validation Time**: Certificate validation can take several minutes
- 🌍 **Region**: Certificates are region-specific (use us-east-1 for CloudFront)
- 🔄 **No Updates**: Certificates cannot be updated; changes require replacement
- 🗑️ **Cleanup**: Validation records are automatically removed on stack deletion
- 📜 **Transparency Logging**: Once enabled, cannot be disabled for that certificate

## Best Practices

1. **Plan for Replacement**: Certificate changes require replacement, plan for downtime
2. **Use Wildcards Wisely**: Wildcard certificates reduce management overhead
3. **Monitor Expiry**: Set up CloudWatch alarms for certificate expiration
4. **Regional Considerations**: Deploy CloudFront certificates in us-east-1
5. **Test Validation**: Verify cross-account role permissions before deployment
