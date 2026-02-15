---
inclusion: always
---

# Technology Stack

## Core Framework

- **AWS CDK v2** - Infrastructure as Code framework (`aws-cdk-lib`)
- **TypeScript 5.9** - Primary programming language for type-safe infrastructure definitions
- **jsii 5.7** - Enables multi-language support (TypeScript, Python, Java, .NET, Go)
- **Node.js 20+** - Runtime environment

## Build Tools

- **npm** - Package manager and build orchestration
- **jsii** - Compiler that generates .jsii assembly and multi-language bindings
- **jsii-pacmak** - Package generator for Python, Java, .NET, and Go
- **TypeScript Compiler** - Transpiles TypeScript to JavaScript (via jsii)
- **esbuild** - Bundles Lambda handlers for custom resources

## Testing & Quality

- **Jest 30** - Unit testing framework with ts-jest preset
- **aws-cdk-lib/assertions** - CDK-specific testing utilities for CloudFormation template validation
- **ESLint** - TypeScript linting with @typescript-eslint
- **Prettier** - Code formatting
- **Codecov** - Coverage tracking and reporting

### Testing Strategy

- **Construct Tests** - Integration tests that validate CloudFormation templates
  - Coverage thresholds: 35% branches, 55% statements (following AWS CDK patterns)
  - Focus on template assertions, not code coverage
- **Handler Tests** - Unit tests for Lambda custom resource handlers
  - Coverage thresholds: 70% for all metrics
  - Test business logic in isolation

## Custom Resource Handlers

- **AWS SDK v3** - For AWS service interactions (@aws-sdk/client-glue)
- **AWS Lambda** - Runtime for custom resource handlers
- **esbuild** - Bundles handlers with dependencies
- **TypeScript** - Handler code written in TypeScript, compiled to JavaScript

## Documentation

- **Docusaurus** - Documentation website framework
- **TypeDoc** - API documentation generation from TypeScript
- **Markdown** - Documentation format

## AWS Services

- **AWS Glue** - Data Catalog resource policies
- **AWS Lambda** - Custom resource handlers
- **AWS CloudWatch Logs** - Handler logging
- **AWS IAM** - Permissions and policies

## Development Workflow

```bash
npm ci                    # Install dependencies
npm run build             # Build handlers + compile with jsii
npm test                  # Run all tests (constructs + handlers)
npm run test:coverage     # Run tests with coverage
npm run package           # Generate packages for all languages
npm run docs              # Generate documentation
npm run lint              # Run ESLint
npm run format            # Format code with Prettier
```

## Multi-Language Support

Constructs are written once in TypeScript and automatically available in:
- **TypeScript/JavaScript** - npm (`cdk-power-constructs`)
- **Python** - PyPI (`cdk-power-constructs`)
- **Java** - Maven Central (`fr.guyon-it-consulting:cdk-power-constructs`)
- **.NET** - NuGet (`GuyonItConsulting.CdkPowerConstructs`)
- **Go** - Go modules (`github.com/guyon-it-consulting/cdk-power-constructs-go`)

## CI/CD

- **GitHub Actions** - Build, test, and release automation
- **Codecov** - Coverage reporting and quality gates
- **Dependabot** - Automated dependency updates
- **Release workflow** - Multi-package manager publishing (npm, PyPI, Maven, NuGet)

## Technical Constraints

- Must follow CDK construct patterns and jsii restrictions
- Public APIs must be jsii-compatible (no generics, no union types in public interfaces)
- Constructs should be composable and reusable
- Type definitions must be exported for consumer applications
- Follow AWS Well-Architected Framework principles
- Dependencies must be declared in both `dependencies` and `peerDependencies`
- Custom resource handlers must be bundled as single-file artifacts
- Lambda handlers should be stateless and idempotent
