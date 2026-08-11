---
sidebar_position: 5
---

# Zero-ETL DynamoDB to S3 Tables

Set up Zero-ETL integration from DynamoDB to S3 Tables for real-time analytics without data pipelines.

## The Problem

Traditional analytics on DynamoDB data requires building and maintaining ETL pipelines:

1. **Pipeline Complexity**: Need to build, monitor, and maintain data pipelines
2. **Data Latency**: Batch ETL introduces delays between operational and analytical data
3. **Infrastructure Overhead**: Managing Glue jobs, Lambda functions, or other ETL tools
4. **Schema Evolution**: Handling schema changes across the pipeline is error-prone

## The Solution

`ZeroEtlDynamoDbToS3Tables` leverages AWS Zero-ETL integration to automatically replicate DynamoDB data to S3 Tables (Iceberg format):

- ✅ **No ETL Code**: AWS manages the data replication automatically
- ✅ **Near Real-Time**: Data is available in S3 Tables within seconds
- ✅ **Iceberg Format**: Query with Athena, Spark, or any Iceberg-compatible tool
- ✅ **Schema Handling**: Configurable unnesting of nested DynamoDB attributes
- ✅ **Full CDK Management**: All resources managed through CloudFormation

## Prerequisites

### DynamoDB Table Configuration

The source DynamoDB table must be configured with:

1. **Point-in-Time Recovery (PITR)**: Must be enabled
2. **Encryption**: Must use AWS-owned keys (default encryption)
3. **Resource Policy**: Must grant Glue service access

```typescript
const sourceTable = new dynamodb.Table(this, 'SourceTable', {
  partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
  
  // Required: Enable PITR
  pointInTimeRecovery: true,
  
  // Required: Use default encryption (AWS-owned)
  encryption: dynamodb.TableEncryption.DEFAULT,
});

// Required: Add resource policy for Glue access
sourceTable.addToResourcePolicy(new iam.PolicyStatement({
  actions: [
    'dynamodb:ExportTableToPointInTime',
    'dynamodb:DescribeTable',
    'dynamodb:DescribeExport',
  ],
  principals: [new iam.ServicePrincipal('glue.amazonaws.com')],
  resources: ['*'],
  conditions: {
    StringEquals: { 'aws:SourceAccount': this.account },
    ArnLike: { 'aws:SourceArn': `arn:aws:glue:${this.region}:${this.account}:integration:*` },
  },
}));
```

### S3 Tables Bucket

You need an S3 Tables bucket as the target:

```typescript
// Using the alpha construct (subject to change)
import * as s3tables from '@aws-cdk/aws-s3tables-alpha';

const tableBucket = new s3tables.TableBucket(this, 'AnalyticsBucket', {
  tableBucketName: 'my-analytics-bucket',
});
```

## API Reference

For detailed API documentation, see:
- [TypeScript API](/api/typescript/classes/ZeroEtlDynamoDbToS3Tables.html)

## Use Cases

### Basic Zero-ETL Integration

Set up a basic integration:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import { ZeroEtlDynamoDbToS3Tables } from 'cdk-power-constructs/s3tables';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

// Source DynamoDB table (with PITR and resource policy configured)
const sourceTable = new dynamodb.Table(this, 'OrdersTable', {
  partitionKey: { name: 'orderId', type: dynamodb.AttributeType.STRING },
  pointInTimeRecovery: true,
  encryption: dynamodb.TableEncryption.DEFAULT,
});

// Add required resource policy
sourceTable.addToResourcePolicy(new iam.PolicyStatement({
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
  tableBucketArn: 'arn:aws:s3tables:us-east-1:123456789012:bucket/analytics-bucket',
  tableBucketName: 'analytics-bucket',
  sourceTable,
  integrationName: 'orders-zero-etl',
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
from cdk_power_constructs.s3tables import ZeroEtlDynamoDbToS3Tables
from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_iam as iam

# Source DynamoDB table
source_table = dynamodb.Table(self, "OrdersTable",
    partition_key=dynamodb.Attribute(name="orderId", type=dynamodb.AttributeType.STRING),
    point_in_time_recovery=True,
    encryption=dynamodb.TableEncryption.DEFAULT
)

# Add required resource policy
source_table.add_to_resource_policy(iam.PolicyStatement(
    actions=["dynamodb:ExportTableToPointInTime", "dynamodb:DescribeTable", "dynamodb:DescribeExport"],
    principals=[iam.ServicePrincipal("glue.amazonaws.com")],
    resources=["*"],
    conditions={
        "StringEquals": {"aws:SourceAccount": self.account},
        "ArnLike": {"aws:SourceArn": f"arn:aws:glue:{self.region}:{self.account}:integration:*"}
    }
))

# Create Zero-ETL integration
ZeroEtlDynamoDbToS3Tables(self, "OrdersAnalytics",
    table_bucket_arn="arn:aws:s3tables:us-east-1:123456789012:bucket/analytics-bucket",
    table_bucket_name="analytics-bucket",
    source_table=source_table,
    integration_name="orders-zero-etl"
)
```

  </TabItem>
</Tabs>

### With Nested Attribute Unnesting

Control how nested DynamoDB attributes are mapped to Iceberg columns:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
new ZeroEtlDynamoDbToS3Tables(this, 'Analytics', {
  tableBucketArn: tableBucket.tableBucketArn,
  tableBucketName: 'analytics-bucket',
  sourceTable,
  integrationName: 'my-integration',
  
  // Options: 'FULL', 'TOPLEVEL', 'NOUNNEST'
  unnestSpec: 'TOPLEVEL',
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
ZeroEtlDynamoDbToS3Tables(self, "Analytics",
    table_bucket_arn=table_bucket.table_bucket_arn,
    table_bucket_name="analytics-bucket",
    source_table=source_table,
    integration_name="my-integration",
    
    # Options: 'FULL', 'TOPLEVEL', 'NOUNNEST'
    unnest_spec="TOPLEVEL"
)
```

  </TabItem>
</Tabs>

### Query with Athena

Once the integration is set up, query the data with Athena:

```sql
-- Query the replicated data
SELECT 
  orderId,
  customerName,
  orderDate,
  totalAmount
FROM "s3tablescatalog/analytics-bucket"."default"."OrdersTable"
WHERE orderDate >= DATE '2024-01-01'
ORDER BY orderDate DESC
LIMIT 100;
```

## Properties

### tableBucketArn

- **Type**: `string`
- **Required**: Yes
- **Description**: The ARN of the S3 Tables bucket to use as the target.

### tableBucketName

- **Type**: `string`
- **Required**: Yes
- **Description**: The name of the S3 Tables bucket.

### sourceTable

- **Type**: `dynamodb.ITable`
- **Required**: Yes
- **Description**: The DynamoDB table to replicate. Must have PITR enabled and proper resource policy.

### integrationName

- **Type**: `string`
- **Required**: Yes
- **Description**: A unique name for the Glue integration.

### unnestSpec

- **Type**: `'FULL' | 'TOPLEVEL' | 'NOUNNEST'`
- **Required**: No
- **Default**: `'NOUNNEST'`
- **Description**: How to handle nested DynamoDB attributes:
  - `FULL`: Unnest all nested attributes into separate columns
  - `TOPLEVEL`: Only unnest top-level attributes
  - `NOUNNEST`: Keep nested attributes as JSON strings

## Outputs

### zeroEtlRole

- **Type**: `iam.Role`
- **Description**: The IAM role created for the Zero-ETL integration.

### integration

- **Type**: `glue.CfnIntegration`
- **Description**: The underlying Glue integration resource.

## How It Works

1. **Glue Resource Policy**: Creates/updates a hybrid Glue catalog policy (singleton per stack)
2. **IAM Role**: Creates a role for Glue to access S3 Tables
3. **Integration Resource Property**: Configures the target S3 Tables catalog
4. **Table Properties**: Configures how the DynamoDB table schema maps to Iceberg
5. **Glue Integration**: Creates the Zero-ETL integration that streams data

## Important Notes

- 📋 **Prerequisites**: DynamoDB table must have PITR enabled and proper resource policy
- 🔐 **Encryption**: Only AWS-owned encryption is supported for source tables
- ⏱️ **Initial Sync**: First sync can take time depending on table size
- 💰 **Costs**: Consider DynamoDB export costs and S3 Tables storage costs
- 🌍 **Region**: Source and target must be in the same region

## Best Practices

1. **Plan Capacity**: Ensure DynamoDB capacity can handle export operations
2. **Monitor Integration**: Use CloudWatch metrics for integration health
3. **Schema Design**: Plan your unnest strategy based on query patterns
4. **Test First**: Test with a small table before production deployment
5. **Cost Analysis**: Estimate costs for export operations and storage
