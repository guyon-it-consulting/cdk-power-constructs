---
sidebar_position: 2
---

# Getting Started

This guide will help you get started with CDK Power Constructs.

## Prerequisites

- AWS CDK v2.x installed
- Node.js 18+ (for TypeScript/JavaScript)
- Your preferred language runtime

## Installation

Choose your language and install the package:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```bash
npm install cdk-power-constructs aws-cdk-lib constructs
```

  </TabItem>
  <TabItem value="python" label="Python">

```bash
pip install cdk-power-constructs aws-cdk-lib constructs
```

  </TabItem>
</Tabs>

## Your First Construct

Let's create a Glue resource policy statement for cross-account access:

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```typescript
import { GlueResourcePolicyStatement } from 'cdk-power-constructs/glue/glue-resource-policy';
import { Stack, App } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';

const app = new App();
const stack = new Stack(app, 'MyStack');

new GlueResourcePolicyStatement(stack, 'CrossAccountAccess', {
  sid: 'AllowCrossAccountAccess',
  statement: new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    principals: [new iam.AccountPrincipal('123456789012')],
    actions: ['glue:GetDatabase', 'glue:GetTable'],
    resources: ['*'],
  }),
});
```

  </TabItem>
  <TabItem value="python" label="Python">

```python
from cdk_power_constructs.glue.glue_resource_policy import GlueResourcePolicyStatement
from aws_cdk import App, Stack
from aws_cdk import aws_iam as iam

app = App()
stack = Stack(app, "MyStack")

GlueResourcePolicyStatement(stack, "CrossAccountAccess",
    sid="AllowCrossAccountAccess",
    statement=iam.PolicyStatement(
        effect=iam.Effect.ALLOW,
        principals=[iam.AccountPrincipal("123456789012")],
        actions=["glue:GetDatabase", "glue:GetTable"],
        resources=["*"]
    )
)
```

  </TabItem>
</Tabs>

## Deploy

Deploy your stack:

```bash
cdk deploy
```

## Next Steps

- Explore [Available Constructs](./constructs/glue-resource-policy)
- Check the [API Reference](/api/typescript/)
- See more [Examples](./examples)
