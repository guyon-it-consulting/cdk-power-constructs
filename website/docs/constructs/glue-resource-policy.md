---
sidebar_position: 2
---

# GlueResourcePolicyStatement

Manages individual statements in the AWS Glue Data Catalog resource policy.

## The Problem

AWS Glue Data Catalog has a **single resource-based policy per account/region**, but AWS CDK doesn't provide native L2 constructs to manage it. This creates several challenges:

1. **Multiple Stacks**: Different CDK stacks can't independently manage their policy statements without conflicts
2. **Manual Management**: Requires custom resources or manual console/CLI operations
3. **Update Complexity**: Updating or removing specific statements risks affecting the entire policy
4. **Cross-Account Access**: Setting up Lake Formation or cross-account data sharing is cumbersome

## The Solution

`GlueResourcePolicyStatement` solves these challenges by:

- ✅ **Statement-Level Management**: Uses SID to identify and manage individual statements
- ✅ **Multi-Stack Support**: Multiple stacks can safely add their own statements
- ✅ **Idempotent Operations**: Safely handles updates and deletions without affecting other statements
- ✅ **Sequential Execution**: Prevents race conditions when multiple statements are deployed
- ✅ **Singleton Provider**: Reuses Lambda function across all statements in a stack

## API Reference

For detailed API documentation, see:
- [TypeScript API](/api/typescript/classes/GlueResourcePolicyStatement.html)

## Use Cases

### Cross-Account Data Catalog Access

Grant another AWS account access to your Glue Data Catalog:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import { GlueResourcePolicyStatement } from 'cdk-power-constructs/glue/glue-resource-policy';
import * as iam from 'aws-cdk-lib/aws-iam';

new GlueResourcePolicyStatement(this, 'CrossAccountAccess', {
  sid: 'AllowCrossAccountAccess',
  statement: new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    principals: [new iam.AccountPrincipal('123456789012')],
    actions: [
      'glue:GetDatabase',
      'glue:GetTable',
      'glue:GetPartitions',
    ],
    resources: ['*'],
  }),
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
from cdk_power_constructs.glue.glue_resource_policy import GlueResourcePolicyStatement
from aws_cdk import aws_iam as iam

GlueResourcePolicyStatement(self, "CrossAccountAccess",
    sid="AllowCrossAccountAccess",
    statement=iam.PolicyStatement(
        effect=iam.Effect.ALLOW,
        principals=[iam.AccountPrincipal("123456789012")],
        actions=[
            "glue:GetDatabase",
            "glue:GetTable",
            "glue:GetPartitions",
        ],
        resources=["*"]
    )
)
```

  </TabItem>
</Tabs>

### AWS Lake Formation Integration

Enable Lake Formation to manage Glue Data Catalog permissions:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
new GlueResourcePolicyStatement(this, 'LakeFormationAccess', {
  sid: 'AllowLakeFormation',
  statement: new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    principals: [new iam.ServicePrincipal('lakeformation.amazonaws.com')],
    actions: ['glue:*'],
    resources: ['*'],
  }),
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
GlueResourcePolicyStatement(self, "LakeFormationAccess",
    sid="AllowLakeFormation",
    statement=iam.PolicyStatement(
        effect=iam.Effect.ALLOW,
        principals=[iam.ServicePrincipal("lakeformation.amazonaws.com")],
        actions=["glue:*"],
        resources=["*"]
    )
)
```

  </TabItem>
</Tabs>

### Service-Specific Access

Grant AWS services like Athena or EMR access to specific databases:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
new GlueResourcePolicyStatement(this, 'AthenaAccess', {
  sid: 'AllowAthenaAccess',
  statement: new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    principals: [new iam.ServicePrincipal('athena.amazonaws.com')],
    actions: [
      'glue:GetDatabase',
      'glue:GetTable',
      'glue:GetPartitions',
    ],
    resources: [
      `arn:aws:glue:${this.region}:${this.account}:catalog`,
      `arn:aws:glue:${this.region}:${this.account}:database/my-database`,
      `arn:aws:glue:${this.region}:${this.account}:table/my-database/*`,
    ],
  }),
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
GlueResourcePolicyStatement(self, "AthenaAccess",
    sid="AllowAthenaAccess",
    statement=iam.PolicyStatement(
        effect=iam.Effect.ALLOW,
        principals=[iam.ServicePrincipal("athena.amazonaws.com")],
        actions=[
            "glue:GetDatabase",
            "glue:GetTable",
            "glue:GetPartitions",
        ],
        resources=[
            f"arn:aws:glue:{self.region}:{self.account}:catalog",
            f"arn:aws:glue:{self.region}:{self.account}:database/my-database",
            f"arn:aws:glue:{self.region}:{self.account}:table/my-database/*",
        ]
    )
)
```

  </TabItem>
</Tabs>

## Properties

### sid

- **Type**: `string`
- **Required**: Yes
- **Description**: Statement ID to uniquely identify this policy statement. Used for updates and deletions.

### statement

- **Type**: `iam.PolicyStatement`
- **Required**: Yes
- **Description**: The IAM policy statement to add to the Glue resource policy.

## How It Works

1. **Custom Resource**: Uses a CloudFormation custom resource backed by a Lambda function
2. **Statement Management**: The Lambda function reads the existing policy, adds/updates/removes the statement by SID
3. **Singleton Provider**: One Lambda function per stack handles all policy statements
4. **Sequential Execution**: Statements are deployed sequentially to avoid race conditions
5. **Idempotent**: Safe to run multiple times - updates existing statements with the same SID

## Important Notes

- ⚠️ **Account-Wide Policy**: The Glue resource policy is account and region-specific
- 🔒 **Permissions Required**: The Lambda function needs `glue:GetResourcePolicy`, `glue:PutResourcePolicy`, and `glue:DeleteResourcePolicy`
- 🔄 **Updates**: Changing the `sid` creates a new statement (the old one remains)
- 🗑️ **Deletion**: Removing the construct deletes only that statement from the policy
- 📊 **Multiple Stacks**: Safe to use across multiple CDK stacks in the same account/region

## Best Practices

1. **Use Descriptive SIDs**: Make SIDs meaningful (e.g., `AllowCrossAccountFromProd`)
2. **Least Privilege**: Grant only the minimum required permissions
3. **Resource Specificity**: Use specific resource ARNs when possible instead of `*`
4. **Testing**: Test in a non-production environment first
5. **Documentation**: Document why each statement exists in your code comments
