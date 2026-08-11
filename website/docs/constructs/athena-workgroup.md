---
sidebar_position: 7
---

# Athena Workgroup

An L2 construct for Amazon Athena workgroups with integrated IAM grant methods.

## The Problem

The native CDK `CfnWorkGroup` is an L1 construct that lacks:

1. **Grant Methods**: No `grantExecute()`, `grantAll()`, etc.
2. **Import Methods**: No easy way to import existing workgroups
3. **Type Safety**: Properties are loosely typed
4. **Verbose Configuration**: Result configuration requires nested objects

## The Solution

`AthenaWorkgroup` provides a proper L2 experience:

- ✅ **Grant Methods**: `grantExecute()`, `grantAll()`, `grantReadNamedQueries()`, etc.
- ✅ **Import Methods**: `fromWorkgroupArn()`, `fromWorkgroupName()`, `fromWorkgroupAttributes()`
- ✅ **Clean API**: Flattened properties with sensible defaults
- ✅ **Type Safety**: Strongly typed properties and outputs

## API Reference

For detailed API documentation, see:
- [TypeScript API](/api/typescript/classes/AthenaWorkgroup.html)

## Use Cases

### Basic Workgroup

Create a workgroup with default settings:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import { AthenaWorkgroup } from 'cdk-power-constructs/athena';

const workgroup = new AthenaWorkgroup(this, 'AnalyticsWorkgroup', {
  workgroupName: 'analytics-team',
  description: 'Workgroup for the analytics team',
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
from cdk_power_constructs.athena import AthenaWorkgroup

workgroup = AthenaWorkgroup(self, "AnalyticsWorkgroup",
    workgroup_name="analytics-team",
    description="Workgroup for the analytics team"
)
```

  </TabItem>
</Tabs>

### With Query Results Output

Configure S3 output location for query results:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import { AthenaWorkgroup } from 'cdk-power-constructs/athena';
import * as s3 from 'aws-cdk-lib/aws-s3';

const resultsBucket = new s3.Bucket(this, 'QueryResults', {
  encryption: s3.BucketEncryption.S3_MANAGED,
  lifecycleRules: [
    { expiration: cdk.Duration.days(30) },
  ],
});

const workgroup = new AthenaWorkgroup(this, 'AnalyticsWorkgroup', {
  workgroupName: 'analytics-team',
  description: 'Workgroup for the analytics team',
  outputBucket: resultsBucket,
  outputPrefix: 'query-results/',
  publishCloudWatchMetrics: true,
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
from cdk_power_constructs.athena import AthenaWorkgroup
from aws_cdk import aws_s3 as s3
from aws_cdk import Duration

results_bucket = s3.Bucket(self, "QueryResults",
    encryption=s3.BucketEncryption.S3_MANAGED,
    lifecycle_rules=[
        s3.LifecycleRule(expiration=Duration.days(30))
    ]
)

workgroup = AthenaWorkgroup(self, "AnalyticsWorkgroup",
    workgroup_name="analytics-team",
    description="Workgroup for the analytics team",
    output_bucket=results_bucket,
    output_prefix="query-results/",
    publish_cloud_watch_metrics=True
)
```

  </TabItem>
</Tabs>

### Grant Permissions to Roles

Use the built-in grant methods:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import { AthenaWorkgroup } from 'cdk-power-constructs/athena';
import * as iam from 'aws-cdk-lib/aws-iam';

const workgroup = new AthenaWorkgroup(this, 'AnalyticsWorkgroup', {
  workgroupName: 'analytics-team',
  outputBucket: resultsBucket,
});

// Create roles that need access
const dataScientistRole = new iam.Role(this, 'DataScientistRole', {
  assumedBy: new iam.AccountRootPrincipal(),
});

const etlRole = new iam.Role(this, 'ETLRole', {
  assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
});

// Grant query execution permissions
workgroup.grantExecute(dataScientistRole);
workgroup.grantExecute(etlRole);

// Grant additional permissions
workgroup.grantReadNamedQueries(dataScientistRole);
workgroup.grantWriteNamedQueries(dataScientistRole);

// Or grant all permissions at once
workgroup.grantAll(adminRole);
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
from cdk_power_constructs.athena import AthenaWorkgroup
from aws_cdk import aws_iam as iam

workgroup = AthenaWorkgroup(self, "AnalyticsWorkgroup",
    workgroup_name="analytics-team",
    output_bucket=results_bucket
)

# Create roles that need access
data_scientist_role = iam.Role(self, "DataScientistRole",
    assumed_by=iam.AccountRootPrincipal()
)

etl_role = iam.Role(self, "ETLRole",
    assumed_by=iam.ServicePrincipal("glue.amazonaws.com")
)

# Grant query execution permissions
workgroup.grant_execute(data_scientist_role)
workgroup.grant_execute(etl_role)

# Grant additional permissions
workgroup.grant_read_named_queries(data_scientist_role)
workgroup.grant_write_named_queries(data_scientist_role)

# Or grant all permissions at once
workgroup.grant_all(admin_role)
```

  </TabItem>
</Tabs>

### With Cost Controls

Set up query cost controls:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
const workgroup = new AthenaWorkgroup(this, 'CostControlledWorkgroup', {
  workgroupName: 'cost-controlled',
  outputBucket: resultsBucket,
  
  // Limit bytes scanned per query (10 GB)
  bytesScannedCutoffPerQuery: 10 * 1024 * 1024 * 1024,
  
  // Enforce workgroup settings (ignore client overrides)
  enforceWorkgroupConfiguration: true,
  
  // Enable metrics for monitoring
  publishCloudWatchMetrics: true,
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
workgroup = AthenaWorkgroup(self, "CostControlledWorkgroup",
    workgroup_name="cost-controlled",
    output_bucket=results_bucket,
    
    # Limit bytes scanned per query (10 GB)
    bytes_scanned_cutoff_per_query=10 * 1024 * 1024 * 1024,
    
    # Enforce workgroup settings (ignore client overrides)
    enforce_workgroup_configuration=True,
    
    # Enable metrics for monitoring
    publish_cloud_watch_metrics=True
)
```

  </TabItem>
</Tabs>

### Import Existing Workgroup

Import a workgroup created outside CDK:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
// Import by name
const existingWorkgroup = AthenaWorkgroup.fromWorkgroupName(
  this, 'ImportedWorkgroup', 'existing-workgroup-name'
);

// Import by ARN
const workgroupByArn = AthenaWorkgroup.fromWorkgroupArn(
  this, 'ImportedByArn',
  'arn:aws:athena:us-east-1:123456789012:workgroup/my-workgroup'
);

// Import by attributes
const workgroupByAttrs = AthenaWorkgroup.fromWorkgroupAttributes(
  this, 'ImportedByAttrs', {
    workgroupName: 'my-workgroup',
    workgroupArn: 'arn:aws:athena:us-east-1:123456789012:workgroup/my-workgroup',
  }
);

// Grant permissions on imported workgroup
existingWorkgroup.grantExecute(myRole);
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
# Import by name
existing_workgroup = AthenaWorkgroup.from_workgroup_name(
    self, "ImportedWorkgroup", "existing-workgroup-name"
)

# Import by ARN
workgroup_by_arn = AthenaWorkgroup.from_workgroup_arn(
    self, "ImportedByArn",
    "arn:aws:athena:us-east-1:123456789012:workgroup/my-workgroup"
)

# Grant permissions on imported workgroup
existing_workgroup.grant_execute(my_role)
```

  </TabItem>
</Tabs>

### With KMS Encryption

Encrypt query results with KMS:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import * as kms from 'aws-cdk-lib/aws-kms';

const encryptionKey = new kms.Key(this, 'AthenaResultsKey', {
  description: 'Key for Athena query results encryption',
  enableKeyRotation: true,
});

const workgroup = new AthenaWorkgroup(this, 'EncryptedWorkgroup', {
  workgroupName: 'encrypted-results',
  outputBucket: resultsBucket,
  encryptionOption: 'SSE_KMS',
  kmsKeyArn: encryptionKey.keyArn,
});

// Grant the KMS key to users who need to run queries
encryptionKey.grantEncryptDecrypt(dataScientistRole);
```

  </TabItem>
</Tabs>

## Properties

### workgroupName

- **Type**: `string`
- **Required**: No
- **Default**: Auto-generated unique name
- **Description**: The name of the workgroup.

### description

- **Type**: `string`
- **Required**: No
- **Description**: A description of the workgroup (max 1024 characters).

### publishCloudWatchMetrics

- **Type**: `boolean`
- **Required**: No
- **Default**: `false`
- **Description**: Enable CloudWatch metrics publishing.

### outputBucket

- **Type**: `s3.IBucket`
- **Required**: No
- **Description**: S3 bucket for query results.

### outputPrefix

- **Type**: `string`
- **Required**: No
- **Description**: S3 prefix for query results.

### encryptionOption

- **Type**: `'SSE_S3' | 'SSE_KMS' | 'CSE_KMS'`
- **Required**: No
- **Default**: `'SSE_S3'`
- **Description**: Encryption option for query results.

### kmsKeyArn

- **Type**: `string`
- **Required**: Yes (if encryption is SSE_KMS or CSE_KMS)
- **Description**: KMS key ARN for encryption.

### enforceWorkgroupConfiguration

- **Type**: `boolean`
- **Required**: No
- **Default**: `true`
- **Description**: Override client-side settings with workgroup settings.

### bytesScannedCutoffPerQuery

- **Type**: `number`
- **Required**: No
- **Description**: Maximum bytes a query can scan before being cancelled.

### requesterPays

- **Type**: `boolean`
- **Required**: No
- **Default**: `false`
- **Description**: Whether requester pays for S3 access.

### removalPolicy

- **Type**: `cdk.RemovalPolicy`
- **Required**: No
- **Default**: `RETAIN`
- **Description**: What happens to the workgroup when the stack is deleted.

## Grant Methods

| Method | Permissions Granted |
|--------|---------------------|
| `grantExecute(grantee)` | Start, stop, get query executions and results |
| `grantReadNamedQueries(grantee)` | Get and list named queries |
| `grantWriteNamedQueries(grantee)` | Create and delete named queries |
| `grantReadPreparedStatements(grantee)` | Get and list prepared statements |
| `grantWritePreparedStatements(grantee)` | Create, update, delete prepared statements |
| `grantAll(grantee)` | All of the above |
| `grant(grantee, actions)` | Custom set of actions |

## Outputs

### workgroupArn

- **Type**: `string`
- **Description**: The ARN of the workgroup.

### workgroupName

- **Type**: `string`
- **Description**: The name of the workgroup.

### resource

- **Type**: `athena.CfnWorkGroup`
- **Description**: The underlying L1 construct.

## Important Notes

- 📊 **Metrics**: Enable `publishCloudWatchMetrics` for monitoring query performance
- 💰 **Cost Control**: Use `bytesScannedCutoffPerQuery` to prevent runaway queries
- 🔐 **Bucket Access**: Users also need S3 bucket permissions for results
- 🔒 **Glue Access**: Users need Glue Data Catalog permissions for tables
- ⚙️ **Enforce Config**: Set `enforceWorkgroupConfiguration: true` for consistent settings

## Best Practices

1. **Separate Workgroups**: Create different workgroups for different teams/use cases
2. **Enable Metrics**: Always enable CloudWatch metrics for monitoring
3. **Set Limits**: Use byte scan limits to prevent expensive queries
4. **Encrypt Results**: Use SSE_KMS for sensitive data
5. **Lifecycle Policies**: Set S3 lifecycle policies on results buckets
6. **Named Queries**: Store common queries as named queries for reuse
