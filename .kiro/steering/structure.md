# Project Structure

## File Organization

```
/
├── lib/                    # Source code for constructs
│   └── index.ts           # Main construct definitions and exports
├── test/                  # Jest unit tests
├── package.json           # npm dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project documentation
```

## Naming Conventions

- **Construct Classes**: PascalCase (e.g., `CdkPowerConstructs`)
- **Props Interfaces**: PascalCase with `Props` suffix (e.g., `CdkPowerConstructsProps`)
- **Files**: kebab-case for TypeScript files (e.g., `my-construct.ts`)
- **Test Files**: Match source file name with `.test.ts` suffix

## Import Patterns

- Use `aws-cdk-lib` for CDK v2 imports
- Import specific constructs: `import { Stack, Duration } from 'aws-cdk-lib';`
- Import service-specific constructs: `import * as sns from 'aws-cdk-lib/aws-sns';`
- Use `constructs` package for base Construct class

## Construct Patterns

- All constructs extend `Construct` from the `constructs` package
- Props interfaces define configurable properties
- Use optional properties with sensible defaults
- Expose important resources as public readonly properties
- Follow the principle of least surprise in API design

## Architectural Decisions

- Constructs should be self-contained and composable
- Prefer composition over inheritance
- Use L2 constructs (higher-level abstractions) when available
- Document construct behavior and configuration options
- Validate props in constructor when necessary
