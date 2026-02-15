---
inclusion: manual
---

# Contributing Guidelines

## Overview

This file provides guidance for contributors. Reference with `#contributing-guidelines` when discussing contribution workflows, PR requirements, or community standards.

## Contribution Philosophy

Following AWS CDK patterns:
- **Problem-focused**: Solve specific pain points, not generic wrappers
- **Battle-tested**: Include real-world use cases and examples
- **Well-documented**: Clear API docs, README examples, and inline comments
- **Thoroughly tested**: Both construct and handler tests with appropriate coverage

## Before Contributing

1. **Check existing issues** - Avoid duplicate work
2. **Open an issue first** - Discuss major changes before coding
3. **Review design guidelines** - Follow AWS CDK construct patterns
4. **Read CONTRIBUTING.md** - Understand the full contribution process

## Development Setup

```bash
# Clone and install
git clone https://github.com/guyon-it-consulting/cdk-power-constructs.git
cd cdk-power-constructs
npm ci

# Build
npm run build

# Test
npm test
npm run test:coverage

# Lint and format
npm run lint
npm run format
```

## Pull Request Requirements

### Code Quality
- ✅ All tests pass (`npm test`)
- ✅ Coverage thresholds met (`npm run test:coverage`)
- ✅ No linting errors (`npm run lint`)
- ✅ Code formatted (`npm run format`)
- ✅ Build succeeds (`npm run build`)

### Documentation
- ✅ README updated with examples
- ✅ API documentation (TSDoc comments)
- ✅ CHANGELOG.md entry (for releases)
- ✅ Inline code comments for complex logic

### Testing
- ✅ Construct tests for CloudFormation templates
- ✅ Handler tests for business logic (if applicable)
- ✅ Test different configurations and edge cases
- ✅ Error cases tested

### Commit Messages
Follow conventional commits:
- `feat: add new construct for X`
- `fix: resolve issue with Y`
- `docs: update README examples`
- `test: add coverage for Z`
- `chore: update dependencies`

## File Organization

### Adding a New Construct

1. **Create construct file**: `lib/service/construct-name.construct.ts`
2. **Create index**: `lib/service/index.ts` (export construct)
3. **Update main index**: `lib/index.ts` (re-export)
4. **Add tests**: `test/service/construct-name.test.ts`
5. **Update README**: Add usage example

### Adding a Custom Resource Handler

1. **Create handler**: `custom-resource-handlers/lib/service/handler.ts`
2. **Create utils**: `custom-resource-handlers/lib/service/utils.ts` (business logic)
3. **Add tests**: `custom-resource-handlers/test/service/handler.test.ts`
4. **Update build**: Handler auto-generated during build

## Code Style

### TypeScript
- Use TypeScript strict mode
- Prefer `const` over `let`
- Use explicit types for public APIs
- Avoid `any` - use `unknown` if needed

### Construct Patterns
```typescript
export interface MyConstructProps {
  /**
   * Required property with clear documentation
   */
  readonly requiredProp: string;
  
  /**
   * Optional property with default behavior documented
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
```typescript
// handler.ts - Lambda entry point
export async function handler(event: CloudFormationCustomResourceEvent) {
  // AWS SDK interactions
  const client = new GlueClient({});
  const policy = await client.send(new GetResourcePolicyCommand({}));
  
  // Delegate to utils for business logic
  const updated = upsertStatement(policy.statements, event.Sid, event.Statement);
  
  // Return response
  return { PhysicalResourceId: event.Sid };
}

// utils.ts - Pure business logic (100% testable)
export function upsertStatement(
  statements: Statement[],
  sid: string,
  statement: Statement
): Statement[] {
  // Pure function - no AWS SDK calls
  const existing = statements.findIndex(s => s.Sid === sid);
  if (existing >= 0) {
    statements[existing] = statement;
  } else {
    statements.push(statement);
  }
  return statements;
}
```

## Testing Guidelines

### Construct Tests
- Test CloudFormation template generation
- Verify resource properties
- Test different configurations
- Don't aim for 100% code coverage

### Handler Tests
- Test business logic in isolation
- Mock AWS SDK calls
- Aim for 100% coverage on utils
- Test error cases

## Common Issues

### jsii Compatibility
- No generics in public APIs
- No union types in public interfaces
- All public APIs must be jsii-compatible

### Coverage Issues
- Ensure `moduleFileExtensions: ['ts', ...]` in Jest config
- TypeScript must be first to use source files

### Build Issues
- Run `npm run build:handlers` first
- Check for TypeScript errors
- Verify jsii compatibility

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

This automatically updates version, creates commit and tag. GitHub Actions handles publishing.

## Community Standards

- **CODE_OF_CONDUCT.md** - Be respectful and inclusive
- **SECURITY.md** - Report vulnerabilities responsibly
- **LICENSE** - Apache 2.0

## Getting Help

- 🐛 [Report Issues](https://github.com/guyon-it-consulting/cdk-power-constructs/issues)
- 💬 [Discussions](https://github.com/guyon-it-consulting/cdk-power-constructs/discussions)
- 📚 [Documentation](https://guyon-it-consulting.github.io/cdk-power-constructs/)
