# Contributing to CDK Power Constructs

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check [existing issues](https://github.com/guyon-it-consulting/cdk-power-constructs/issues). When creating a bug report, use the bug report template and include:

- Clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- CDK version and environment details
- Code samples if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Use the feature request template and include:

- Clear and descriptive title
- Detailed description of the proposed functionality
- Use cases and examples
- Why this enhancement would be useful to the community

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following our standards
4. Run all quality checks (see checklist below)
5. Commit your changes using conventional commits
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request using the PR template

#### PR Requirements

**Code Quality:**
- ✅ All tests pass (`npm test`)
- ✅ Coverage thresholds met (`npm run test:coverage`)
- ✅ No linting errors (`npm run lint`)
- ✅ Code formatted (`npm run format`)
- ✅ Build succeeds (`npm run build`)

**Documentation:**
- ✅ README updated with examples (if user-facing change)
- ✅ API documentation (TSDoc comments)
- ✅ CHANGELOG.md entry (for releases)
- ✅ Inline code comments for complex logic

**Testing:**
- ✅ Construct tests for CloudFormation templates
- ✅ Handler tests for business logic (if applicable)
- ✅ Test different configurations and edge cases
- ✅ Error cases tested

## Development Setup

### Prerequisites

- **Node.js** 20.x or later
- **npm** 10.x or later
- **Python** 3.x (for jsii-pacmak)
- **Java** 11+ (for jsii-pacmak)
- **Go** 1.23+ (for jsii-pacmak)

### Setup

```bash
# Clone the repository
git clone https://github.com/guyon-it-consulting/cdk-power-constructs.git
cd cdk-power-constructs

# Install dependencies
npm ci

# Build the project (handlers + jsii)
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Project Structure

```
cdk-power-constructs/
├── lib/                                    # CDK constructs (TypeScript)
│   ├── glue/                              # Glue-related constructs
│   │   └── glue-resource-policy/          # Glue resource policy management
│   ├── utils/                             # Shared utilities (singleton pattern)
│   ├── generated/                         # Auto-generated handler imports
│   └── index.ts                           # Main exports
├── custom-resource-handlers/              # Lambda custom resource handlers
│   ├── lib/                               # Handler source code
│   │   └── glue/glue-resource-policy/
│   │       ├── handler.ts                 # Lambda entry point
│   │       └── policy-utils.ts            # Business logic (100% coverage)
│   ├── test/                              # Handler unit tests
│   ├── scripts/                           # Build and generation scripts
│   └── dist/                              # Bundled handlers (generated)
├── test/                                  # Construct integration tests
├── website/                               # Docusaurus documentation
├── .github/workflows/                     # CI/CD pipelines
│   ├── build.yml                          # PR/push validation + coverage
│   ├── release.yml                        # Release + coverage gate
│   └── docs.yml                           # Documentation deployment
└── jest.config.js                         # Unified Jest configuration
```

### Development Workflow

```bash
# Watch mode for development
npm run watch

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check

# Build documentation
npm run docs

# Run documentation site locally
npm run docs:dev

# Generate packages for all languages
npm run package
```

## Testing Standards

We follow AWS CDK testing patterns with different coverage expectations:

### Construct Tests (Integration Tests)
- **Location**: `test/` directory
- **Purpose**: Verify CloudFormation template generation
- **Coverage**: 35% branches, 55% statements (AWS CDK standard)
- **Focus**: Template assertions using `aws-cdk-lib/assertions`

```typescript
import { Template } from 'aws-cdk-lib/assertions';

test('creates expected resources', () => {
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'nodejs20.x',
  });
});
```

### Handler Tests (Unit Tests)
- **Location**: `custom-resource-handlers/test/` directory
- **Purpose**: Test Lambda handler business logic
- **Coverage**: 70% for all metrics (branches, functions, lines, statements)
- **Focus**: Pure functions, isolated from AWS SDK

```typescript
import { upsertStatement } from '../lib/policy-utils';

test('adds new statement to empty policy', () => {
  const result = upsertStatement([], 'TestSid', statement);
  expect(result).toHaveLength(1);
});
```

### Running Tests

```bash
# All tests
npm test

# With coverage report
npm run test:coverage

# Watch mode
npm run watch
```

## Code Style

### TypeScript
- Use TypeScript strict mode
- Prefer `const` over `let`
- Use explicit types for public APIs
- Avoid `any` - use `unknown` if needed
- Follow existing naming conventions

### Construct Patterns

```typescript
export interface MyConstructProps {
  /**
   * Required property with clear documentation
   */
  readonly requiredProp: string;
  
  /**
   * Optional property with default behavior documented
   * 
   * @default - some sensible default
   */
  readonly optionalProp?: number;
}

export class MyConstruct extends Construct {
  constructor(scope: Construct, id: string, props: MyConstructProps) {
    super(scope, id);
    
    // Validate props early
    if (!props.requiredProp) {
      throw new Error('requiredProp is required');
    }
    
    // Implementation...
  }
}
```

### Handler Patterns

Separate concerns between Lambda entry point and business logic:

```typescript
// handler.ts - Lambda entry point (AWS SDK interactions)
export async function handler(event: CloudFormationCustomResourceEvent) {
  const client = new GlueClient({});
  const policy = await client.send(new GetResourcePolicyCommand({}));
  
  // Delegate to utils for business logic
  const updated = upsertStatement(policy.statements, event.Sid, event.Statement);
  
  return { PhysicalResourceId: event.Sid };
}

// policy-utils.ts - Pure business logic (100% testable)
export function upsertStatement(
  statements: Statement[],
  sid: string,
  statement: Statement
): Statement[] {
  // Pure function - no AWS SDK calls
  // Easy to test with 100% coverage
}
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add new construct for X`
- `fix: resolve issue with Y`
- `docs: update README examples`
- `test: add coverage for Z`
- `chore: update dependencies`
- `refactor: improve code structure`

## Adding New Constructs

1. **Create construct file**: `lib/service/construct-name.construct.ts`
2. **Create index**: `lib/service/index.ts` (export construct)
3. **Update main index**: `lib/index.ts` (re-export)
4. **Add tests**: `test/service/construct-name.test.ts`
5. **Update README**: Add usage example
6. **Update docs**: Add to `website/docs/constructs/`

## Custom Resource Handlers

When adding custom resource handlers:

1. **Create handler**: `custom-resource-handlers/lib/service/handler.ts`
2. **Create utils**: `custom-resource-handlers/lib/service/utils.ts` (business logic)
3. **Add tests**: `custom-resource-handlers/test/service/handler.test.ts`
4. **Register in build**: Handler auto-generated during `npm run build`
5. **Import in construct**: Use generated imports from `lib/generated/`

## Documentation

- **README.md**: User-facing changes and examples
- **website/docs/**: Detailed construct documentation
- **TSDoc comments**: API documentation (auto-generated)
- **CHANGELOG.md**: Track all notable changes

## jsii Compatibility

All public APIs must be jsii-compatible for multi-language support:

- ❌ No generics in public interfaces
- ❌ No union types in public interfaces
- ✅ Use classes and interfaces
- ✅ Document all public APIs with TSDoc

## Release Process

Releases use `npm version` to manage versioning:

```bash
# Update CHANGELOG.md first!

# Patch release (0.1.0 -> 0.1.1)
npm version patch

# Minor release (0.1.0 -> 0.2.0)
npm version minor

# Major release (0.1.0 -> 1.0.0)
npm version major

# Push tag to trigger release
git push --follow-tags
```

This automatically:
1. Updates version in `package.json`
2. Creates a git commit
3. Creates a git tag (e.g., `v0.1.1`)

GitHub Actions will:
1. Run tests and coverage (blocks if thresholds not met)
2. Build and package for all languages
3. Publish to npm, PyPI, Maven Central, NuGet
4. Create GitHub release with artifacts

## Coverage Requirements

- **Build workflow** (PRs): Coverage runs but doesn't block (visibility)
- **Release workflow** (tags): Coverage blocks release if thresholds not met (quality gate)

## Questions?

- 🐛 [Report Issues](https://github.com/guyon-it-consulting/cdk-power-constructs/issues)
- 💬 [Discussions](https://github.com/guyon-it-consulting/cdk-power-constructs/discussions)
- 📚 [Documentation](https://guyon-it-consulting.github.io/cdk-power-constructs/)

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.
