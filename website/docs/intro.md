---
sidebar_position: 1
---

# Introduction

Welcome to **CDK Power Constructs** - a collection of reusable AWS CDK constructs for common infrastructure patterns.

## Features

- 🎯 **Type-safe** infrastructure definitions
- 🌍 **Multi-language** support (TypeScript, Python, Java, .NET, Go)
- ✅ **Production-ready** constructs
- 📦 **Zero configuration** - sensible defaults included
- 🔒 **Best practices** built-in

## Quick Start

Get started by installing the package for your preferred language:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="typescript" label="TypeScript" default>

```bash
npm install cdk-power-constructs
```

  </TabItem>
  <TabItem value="python" label="Python">

```bash
pip install cdk-power-constructs
```

  </TabItem>
  <TabItem value="java" label="Java">

```xml
<dependency>
    <groupId>fr.guyon-it-consulting</groupId>
    <artifactId>cdk-power-constructs</artifactId>
    <version>0.1.0</version>
</dependency>
```

  </TabItem>
  <TabItem value="dotnet" label=".NET">

```bash
dotnet add package GuyonItConsulting.CdkPowerConstructs
```

  </TabItem>
  <TabItem value="go" label="Go">

```bash
go get github.com/guyon-it-consulting/cdk-power-constructs-go
```

  </TabItem>
</Tabs>

## What's Next?

- 📖 Follow the [Getting Started](./getting-started) guide
- 🔍 Browse the [API Reference](/api/typescript/)
- 💡 Check out [Examples](./examples)

## Available Constructs

### Glue

- **[GlueResourcePolicyStatement](./constructs/glue-resource-policy)** - Manage individual statements in the Glue Data Catalog resource policy

### Route53

- **[Route53 Cross-Account Records](./constructs/route53-cross-account)** - Create DNS records in hosted zones owned by other AWS accounts

### Certificate Manager

- **[Certificate Cross-Account DNS Validation](./constructs/certificate-cross-account)** - ACM certificates with DNS validation in cross-account Route53

### S3 Tables

- **[Zero-ETL DynamoDB to S3 Tables](./constructs/zero-etl-dynamodb-s3tables)** - Real-time analytics integration from DynamoDB

### Lake Formation

- **[Lake Formation](./constructs/lakeformation)** - Fluent API for permissions and declarative admin setup

### Athena

- **[Athena Workgroup](./constructs/athena-workgroup)** - L2 construct with integrated IAM grant methods
