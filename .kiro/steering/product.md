---
inclusion: always
---

# Product Overview

## Purpose

CDK Power Constructs is an open-source AWS CDK construct library providing opinionated, battle-tested solutions for common infrastructure, data, and AI/ML challenges. The library solves real-world problems that AWS CDK doesn't address out-of-the-box, particularly around cross-account access, resource policies, and service integrations.

## Target Users

- **AWS CDK Developers** - Building production infrastructure with AWS CDK
- **Data Engineers** - Implementing Lake Formation and cross-account data sharing
- **Platform Teams** - Standardizing infrastructure patterns across organizations
- **DevOps Engineers** - Managing multi-account AWS environments

## Key Features

### Current Constructs

**GlueResourcePolicyStatement** - Manages individual statements in AWS Glue Data Catalog resource policy
- Solves multi-stack policy management (single policy per account/region)
- Enables cross-account access and Lake Formation integration
- Uses custom resources with Lambda handlers for policy manipulation
- Implements singleton pattern to avoid resource conflicts

### Design Philosophy

- **Opinionated** - Battle-tested decisions baked in
- **Problem-Focused** - Solves specific pain points, not generic wrappers
- **Production-Ready** - Comprehensive testing and error handling
- **Multi-Language** - Available in TypeScript, Python, Java, .NET, Go

## Business Objectives

- **Accelerate Development** - Solve complex problems with simple APIs
- **Reduce Errors** - Encapsulate best practices and error handling
- **Enable Sharing** - Cross-account and cross-region patterns
- **Community-Driven** - Open-source with clear contribution guidelines

## Success Metrics

- Adoption across multiple AWS accounts/organizations
- Reduction in custom resource boilerplate
- Community contributions and feedback
- Documentation quality and examples
