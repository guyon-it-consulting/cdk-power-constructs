---
sidebar_position: 6
---

# Lake Formation

Manage AWS Lake Formation permissions with a fluent API and declarative administrator setup.

## The Problem

Managing Lake Formation permissions through CDK is cumbersome:

1. **Low-Level API**: CDK only provides L1 constructs for Lake Formation
2. **Boilerplate Code**: Each grant requires verbose custom resource code
3. **Admin Setup**: Setting up Lake Formation administrators requires manual steps
4. **S3 Tables Support**: New S3 Tables integration lacks CDK support

## The Solution

CDK Power Constructs provides two constructs for Lake Formation:

### LakeFormationGrants

A fluent API for granting permissions on databases and tables:

- ✅ **Fluent API**: Chain multiple grants in a readable way
- ✅ **Glue Support**: Grant permissions on standard Glue databases/tables
- ✅ **S3 Tables Support**: Grant permissions on S3 Tables namespaces/tables
- ✅ **Automatic Cleanup**: Revokes permissions when resources are deleted

### SetUpLakeFormationAdministrators

Declaratively configure Lake Formation administrators:

- ✅ **Multiple Admins**: Add multiple IAM roles as administrators
- ✅ **Idempotent**: Safe to run multiple times
- ✅ **Cleanup**: Removes administrators when stack is deleted

## API Reference

For detailed API documentation, see:
- [TypeScript API - LakeFormationGrants](/api/typescript/classes/LakeFormationGrants.html)
- [TypeScript API - SetUpLakeFormationAdministrators](/api/typescript/classes/SetUpLakeFormationAdministrators.html)

## Use Cases

### Set Up Lake Formation Administrators

First, configure who can manage Lake Formation:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import { SetUpLakeFormationAdministrators } from 'cdk-power-constructs/lakeformation';
import * as iam from 'aws-cdk-lib/aws-iam';

// Create admin roles
const dataEngineerRole = new iam.Role(this, 'DataEngineerRole', {
  assumedBy: new iam.AccountRootPrincipal(),
  description: 'Data engineering team role',
});

const platformRole = new iam.Role(this, 'PlatformRole', {
  assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
  description: 'Platform automation role',
});

// Set up as Lake Formation administrators
new SetUpLakeFormationAdministrators(this, 'LFAdmins', {
  administrators: [dataEngineerRole, platformRole],
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
from cdk_power_constructs.lakeformation import SetUpLakeFormationAdministrators
from aws_cdk import aws_iam as iam

# Create admin roles
data_engineer_role = iam.Role(self, "DataEngineerRole",
    assumed_by=iam.AccountRootPrincipal(),
    description="Data engineering team role"
)

platform_role = iam.Role(self, "PlatformRole",
    assumed_by=iam.ServicePrincipal("glue.amazonaws.com"),
    description="Platform automation role"
)

# Set up as Lake Formation administrators
SetUpLakeFormationAdministrators(self, "LFAdmins",
    administrators=[data_engineer_role, platform_role]
)
```

  </TabItem>
</Tabs>

### Grant Permissions with Fluent API

Use the fluent API to grant permissions:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import { LakeFormationGrants } from 'cdk-power-constructs/lakeformation';

// Create the grants helper with an admin role
const lfGrants = new LakeFormationGrants(this, 'LFGrants', {
  adminRole: lakeFormationAdminRole,
});

// Grant permissions to a Glue crawler role
lfGrants.grant(crawlerRole)
  .onGlueDatabase('raw-data')
  .onAllGlueTables('raw-data', {
    permissions: ['SELECT', 'DESCRIBE'],
  });

// Grant permissions to an analytics role
lfGrants.grant(analyticsRole)
  .onGlueDatabase('analytics', {
    permissions: ['DESCRIBE'],
  })
  .onGlueTable('analytics', 'daily_metrics', {
    permissions: ['SELECT'],
  })
  .onGlueTable('analytics', 'monthly_summary', {
    permissions: ['SELECT'],
  });
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
from cdk_power_constructs.lakeformation import LakeFormationGrants

# Create the grants helper with an admin role
lf_grants = LakeFormationGrants(self, "LFGrants",
    admin_role=lake_formation_admin_role
)

# Grant permissions to a Glue crawler role
lf_grants.grant(crawler_role) \
    .on_glue_database("raw-data") \
    .on_all_glue_tables("raw-data", permissions=["SELECT", "DESCRIBE"])

# Grant permissions to an analytics role
lf_grants.grant(analytics_role) \
    .on_glue_database("analytics", permissions=["DESCRIBE"]) \
    .on_glue_table("analytics", "daily_metrics", permissions=["SELECT"]) \
    .on_glue_table("analytics", "monthly_summary", permissions=["SELECT"])
```

  </TabItem>
</Tabs>

### Grant Permissions on S3 Tables

Grant permissions on S3 Tables namespaces and tables:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
// S3 Tables catalog ID format: {accountId}:s3tablescatalog/{bucketName}
const catalogId = `${this.account}:s3tablescatalog/my-analytics-bucket`;

lfGrants.grant(sparkRole)
  .onS3Database(catalogId, 'raw-events', {
    permissions: ['DESCRIBE', 'CREATE_TABLE'],
  })
  .onAllS3Tables(catalogId, 'raw-events', {
    permissions: ['SELECT', 'INSERT', 'DELETE'],
  });

// Grant on a specific table
lfGrants.grant(reportingRole)
  .onS3Table(catalogId, 'aggregated', 'daily_summary', {
    permissions: ['SELECT'],
  });
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
# S3 Tables catalog ID format: {accountId}:s3tablescatalog/{bucketName}
catalog_id = f"{self.account}:s3tablescatalog/my-analytics-bucket"

lf_grants.grant(spark_role) \
    .on_s3_database(catalog_id, "raw-events", permissions=["DESCRIBE", "CREATE_TABLE"]) \
    .on_all_s3_tables(catalog_id, "raw-events", permissions=["SELECT", "INSERT", "DELETE"])

# Grant on a specific table
lf_grants.grant(reporting_role) \
    .on_s3_table(catalog_id, "aggregated", "daily_summary", permissions=["SELECT"])
```

  </TabItem>
</Tabs>

### Complete Data Lake Setup

Combine administrators and grants for a complete setup:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import { 
  SetUpLakeFormationAdministrators, 
  LakeFormationGrants 
} from 'cdk-power-constructs/lakeformation';

// 1. Set up the admin role
const lfAdminRole = new iam.Role(this, 'LFAdminRole', {
  assumedBy: new iam.AccountRootPrincipal(),
});

new SetUpLakeFormationAdministrators(this, 'LFAdmins', {
  administrators: [lfAdminRole],
});

// 2. Create the grants helper
const lfGrants = new LakeFormationGrants(this, 'LFGrants', {
  adminRole: lfAdminRole,
});

// 3. Grant permissions to various roles
const etlRole = new iam.Role(this, 'ETLRole', {
  assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
});

const athenaRole = new iam.Role(this, 'AthenaRole', {
  assumedBy: new iam.ServicePrincipal('athena.amazonaws.com'),
});

// ETL role: full access to raw, write to curated
lfGrants.grant(etlRole)
  .onGlueDatabase('raw')
  .onAllGlueTables('raw')
  .onGlueDatabase('curated', { permissions: ['CREATE_TABLE'] })
  .onAllGlueTables('curated', { permissions: ['SELECT', 'INSERT', 'ALTER'] });

// Athena role: read-only on curated
lfGrants.grant(athenaRole)
  .onGlueDatabase('curated', { permissions: ['DESCRIBE'] })
  .onAllGlueTables('curated', { permissions: ['SELECT', 'DESCRIBE'] });
```

  </TabItem>
</Tabs>

## Properties

### SetUpLakeFormationAdministrators

#### administrators

- **Type**: `iam.IRole[]`
- **Required**: Yes
- **Description**: IAM roles to add as Lake Formation administrators.

### LakeFormationGrants

#### adminRole

- **Type**: `iam.IRole`
- **Required**: Yes
- **Description**: A Lake Formation administrator role that will be used to grant permissions.

### LakeFormationGrantOptions

#### permissions

- **Type**: `string[]`
- **Required**: No
- **Default**: `['ALL']`
- **Description**: Lake Formation permissions to grant (e.g., `SELECT`, `INSERT`, `DELETE`, `DESCRIBE`, `ALTER`, `DROP`, `CREATE_TABLE`).

#### permissionsWithGrant

- **Type**: `string[]`
- **Required**: No
- **Default**: `[]`
- **Description**: Permissions that the grantee can further grant to others.

## Available Methods

### LakeFormationPrincipalGrant

| Method | Description |
|--------|-------------|
| `onGlueDatabase(name)` | Grant on a Glue database |
| `onGlueTable(db, table)` | Grant on a specific Glue table |
| `onAllGlueTables(db)` | Grant on all tables in a Glue database |
| `onS3Database(catalogId, namespace)` | Grant on an S3 Tables namespace |
| `onS3Table(catalogId, namespace, table)` | Grant on a specific S3 Table |
| `onAllS3Tables(catalogId, namespace)` | Grant on all S3 Tables in a namespace |

## How It Works

### SetUpLakeFormationAdministrators

1. **Validates Roles**: Ensures all role ARNs exist
2. **Gets Current Settings**: Retrieves existing Lake Formation settings
3. **Merges Admins**: Adds new administrators without removing existing ones
4. **Cleanup**: Removes only the specified administrators on delete

### LakeFormationGrants

1. **Creates Custom Resources**: Each grant creates an AwsCustomResource
2. **Uses Admin Role**: The admin role executes the grant/revoke operations
3. **Idempotent**: Safe to deploy multiple times
4. **Automatic Revocation**: Revokes permissions when constructs are deleted

## Important Notes

- 🔐 **Admin Required**: The `adminRole` must be a Lake Formation administrator
- 🔄 **Order Matters**: Set up administrators before creating grants
- ⚠️ **Existing Permissions**: Does not affect permissions granted outside this construct
- 🗑️ **Cleanup**: Only permissions created by the construct are revoked on delete

## Best Practices

1. **Least Privilege**: Grant only the minimum required permissions
2. **Role Separation**: Use separate roles for different workloads
3. **Audit Trail**: Lake Formation logs all permission changes to CloudTrail
4. **Document Grants**: Add comments explaining why each permission is needed
5. **Test Thoroughly**: Test permission grants in non-production first
