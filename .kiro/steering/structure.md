---
inclusion: always
---

# Project Structure

## File Organization

```
/
├── lib/                                    # Source code for constructs
│   ├── glue/                              # Glue-related constructs
│   │   └── glue-resource-policy/          # Glue resource policy management
│   │       ├── glue-resource-policy-statement.construct.ts
│   │       └── index.ts
│   ├── utils/                             # Shared utilities
│   │   └── singleton.ts                   # Singleton pattern helper
│   ├── generated/                         # Auto-generated handler code
│   └── index.ts                           # Main exports
├── custom-resource-handlers/              # Lambda custom resource handlers
│   ├── lib/                               # Handler source code
│   │   └── glue/glue-resource-policy/
│   │       ├── handler.ts                 # Lambda entry point
│   │       └── policy-utils.ts            # Business logic (100% coverage)
│   ├── test/                              # Handler unit tests
│   ├── scripts/                           # Build scripts
│   └── dist/                              # Bundled handlers (generated)
├── test/                                  # Construct integration tests
├── .github/workflows/                     # CI/CD pipelines
│   ├── build.yml                          # PR/push validation + coverage
│   ├── release.yml                        # Release + coverage gate
│   └── docs.yml                           # Documentation deployment
├── website/                               # Docusaurus documentation site
├── package.json                           # Root dependencies and scripts
├── jest.config.js                         # Unified Jest configuration
└── README.md                              # Project documentation
```

## Naming Conventions

- **Construct Classes**: PascalCase (e.g., `GlueResourcePolicyStatement`)
- **Props Interfaces**: PascalCase with `Props` suffix (e.g., `GlueResourcePolicyStatementProps`)
- **Files**: kebab-case for TypeScript files (e.g., `glue-resource-policy-statement.construct.ts`)
- **Test Files**: Match source file name with `.test.ts` suffix
- **Construct Files**: Use `.construct.ts` suffix to distinguish from utilities

## Import Patterns

- Use `aws-cdk-lib` for CDK v2 imports
- Import specific constructs: `import { Stack, Duration } from 'aws-cdk-lib';`
- Import service-specific constructs: `import * as glue from 'aws-cdk-lib/aws-glue';`
- Use `constructs` package for base Construct class
- **No file extensions** in imports (follow AWS CDK pattern)

## Construct Patterns

- All constructs extend `Construct` from the `constructs` package
- Props interfaces define configurable properties
- Use optional properties with sensible defaults
- Expose important resources as public readonly properties
- Follow the principle of least surprise in API design
- Use singleton pattern for shared resources (Lambda providers)
- Implement sequential execution for resources that modify shared state

## Custom Resource Handler Patterns

- **Separation of Concerns**: 
  - `handler.ts` - Lambda entry point, AWS SDK interactions
  - `*-utils.ts` - Pure business logic (testable, 100% coverage)
- **Bundling**: Handlers are bundled with esbuild into single files
- **Generation**: Build process generates TypeScript wrappers in `lib/generated/`
- **Testing**: Unit tests focus on business logic, not AWS SDK calls

## Testing Patterns

### Construct Tests (Integration)
- Use `Template.fromStack()` for CloudFormation assertions
- Test resource properties, not code paths
- Focus on different configurations and edge cases
- Located in `test/` directory

### Handler Tests (Unit)
- Test business logic in isolation
- Mock AWS SDK calls
- Aim for 100% coverage on utilities
- Located in `custom-resource-handlers/test/`

## Architectural Decisions

- **Constructs should be self-contained and composable**
- **Prefer composition over inheritance**
- **Use L2 constructs** (higher-level abstractions) when available
- **Document construct behavior** and configuration options
- **Validate props** in constructor when necessary
- **Custom resources for missing L2 constructs** (e.g., Glue resource policies)
- **Singleton pattern** for shared Lambda providers to reduce resource count
- **Sequential execution** for resources modifying shared state (avoid race conditions)
