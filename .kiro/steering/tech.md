# Technology Stack

## Core Framework

- **AWS CDK** - Infrastructure as Code framework
- **TypeScript** - Primary programming language for type-safe infrastructure definitions
- **jsii** - Enables multi-language support (TypeScript, Python, Java, .NET, Go)

## Build Tools

- **npm** - Package manager
- **jsii** - Compiler that generates multi-language bindings
- **jsii-pacmak** - Package generator for Python, Java, .NET, and Go
- **TypeScript Compiler** - Transpiles TypeScript to JavaScript (via jsii)

## Testing

- **Jest** - Unit testing framework
- **aws-cdk-lib/assertions** - CDK-specific testing utilities

## AWS Services

- Amazon SNS (Simple Notification Service)
- Amazon SQS (Simple Queue Service)
- Additional AWS services as needed for construct implementations

## Development Workflow

- `npm run build` - Compile with jsii (generates .jsii assembly)
- `npm run watch` - Watch mode for development
- `npm run test` - Run Jest unit tests
- `npm run package` - Generate packages for all target languages

## Multi-Language Support

Constructs are written once in TypeScript and automatically available in:
- TypeScript/JavaScript (npm)
- Python (PyPI)
- Java (Maven)
- .NET (NuGet)
- Go (Go modules)

## Technical Constraints

- Must follow CDK construct patterns and jsii restrictions
- Public APIs must be jsii-compatible (no generics in public interfaces)
- Constructs should be composable and reusable
- Type definitions must be exported for consumer applications
- Follow AWS Well-Architected Framework principles
- Dependencies must be declared in both `dependencies` and `peerDependencies`
