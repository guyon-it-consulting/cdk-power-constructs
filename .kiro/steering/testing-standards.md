---
inclusion: fileMatch
fileMatchPattern: ["**/*.test.ts", "**/jest.config.js"]
---

# Testing Standards

## Testing Philosophy

Following AWS CDK patterns, we distinguish between two types of tests with different coverage expectations:

### Construct Tests (Integration Tests)
- **Purpose**: Verify CloudFormation template generation
- **Coverage**: 35% branches, 55% statements (AWS CDK standard)
- **Focus**: Template assertions, not code execution paths
- **Location**: `test/` directory

### Handler Tests (Unit Tests)
- **Purpose**: Test Lambda handler business logic
- **Coverage**: 70% for all metrics (branches, functions, lines, statements)
- **Focus**: Pure functions, isolated from AWS SDK
- **Location**: `custom-resource-handlers/test/` directory

## Jest Configuration

Single unified Jest config at project root:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/custom-resource-handlers/test'],
  testMatch: ['**/*.test.ts'],
  coverageProvider: 'v8',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'], // ts first!
  collectCoverageFrom: [
    'lib/**/*.ts',
    'custom-resource-handlers/lib/**/*.ts',
    '!**/*.d.ts',
    '!**/*.generated.ts',
    '!lib/index.ts',
    '!custom-resource-handlers/lib/**/handler.ts', // Exclude Lambda entry points
  ],
  coverageThreshold: {
    global: { branches: 35, statements: 55 },
    './custom-resource-handlers/lib/**/*.ts': {
      branches: 70, functions: 70, lines: 70, statements: 70
    },
  },
};
```

**Critical**: `moduleFileExtensions: ['ts', ...]` - TypeScript MUST be first to ensure Jest uses source files, not compiled JS.

## Construct Test Patterns

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { MyConstruct } from '../lib';

describe('MyConstruct', () => {
  test('creates expected resources', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    
    new MyConstruct(stack, 'Test', { /* props */ });
    
    const template = Template.fromStack(stack);
    
    // Assert CloudFormation resources
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
    });
    
    // Count resources
    template.resourceCountIs('AWS::Lambda::Function', 1);
    
    // Use Match for flexible assertions
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Effect: 'Allow' })
        ])
      }
    });
  });
});
```

## Handler Test Patterns

```typescript
import { upsertStatement, removeStatement } from '../lib/policy-utils';

describe('Policy Utils', () => {
  test('adds new statement to empty policy', () => {
    const result = upsertStatement([], 'TestSid', { /* statement */ });
    
    expect(result).toHaveLength(1);
    expect(result[0].Sid).toBe('TestSid');
  });
  
  test('updates existing statement with same SID', () => {
    const existing = [{ Sid: 'TestSid', Effect: 'Allow' }];
    const result = upsertStatement(existing, 'TestSid', { Effect: 'Deny' });
    
    expect(result).toHaveLength(1);
    expect(result[0].Effect).toBe('Deny');
  });
});
```

## Coverage Commands

```bash
npm test                  # Run all tests (fast)
npm run test:coverage     # Run with coverage report
```

## CI/CD Coverage Strategy

### Build Workflow (PRs & main branch)
- Runs coverage with `fail_ci_if_error: false`
- Provides visibility without blocking PRs
- Uploads to Codecov for tracking

### Release Workflow (Publishing)
- Runs coverage with `fail_ci_if_error: true`
- **Blocks release** if coverage drops below thresholds
- Quality gate before publishing to package managers

## Best Practices

1. **Construct Tests**: Focus on different configurations, edge cases, and resource properties
2. **Handler Tests**: Test pure business logic, mock AWS SDK calls
3. **Coverage**: Don't chase 100% on constructs - focus on meaningful test scenarios
4. **Naming**: Test files match source files with `.test.ts` suffix
5. **Isolation**: Each test should be independent and not rely on execution order

## Common Patterns

### Testing Multiple Scenarios
```typescript
describe('MyConstruct', () => {
  test.each([
    ['minimal config', { prop: 'value1' }],
    ['full config', { prop: 'value2', optional: true }],
  ])('works with %s', (name, props) => {
    const stack = new Stack();
    new MyConstruct(stack, 'Test', props);
    const template = Template.fromStack(stack);
    // assertions...
  });
});
```

### Testing Error Cases
```typescript
test('throws on invalid props', () => {
  const stack = new Stack();
  expect(() => {
    new MyConstruct(stack, 'Test', { invalid: 'props' });
  }).toThrow('Invalid configuration');
});
```

## References

- [AWS CDK Testing Guide](https://docs.aws.amazon.com/cdk/v2/guide/testing.html)
- [AWS CDK CONTRIBUTING.md](https://github.com/aws/aws-cdk/blob/main/CONTRIBUTING.md)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
