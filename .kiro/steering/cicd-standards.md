---
inclusion: fileMatch
fileMatchPattern: [".github/workflows/*.yml", ".github/workflows/*.yaml"]
---

# CI/CD Standards

## Workflow Strategy

We use **steps within a single job** rather than multiple jobs for the build pipeline because:
- Steps share the same environment (no artifact upload/download overhead)
- Faster execution (no VM startup between steps)
- Sequential execution (if build fails, tests don't run)
- Simpler to understand and maintain

## Build Workflow

**Trigger**: PRs and pushes to main branch
**Purpose**: Fast validation and feedback

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'  # Speed up dependency installation
      
      # Multi-language setup (for jsii-pacmak)
      - uses: actions/setup-python@v6
      - uses: actions/setup-java@v5
      - uses: actions/setup-go@v6
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Test
        run: npm test
      
      - name: Test Coverage
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false  # Don't block PRs
      
      - name: Generate packages
        run: npm run package
```

## Release Workflow

**Trigger**: Version tags (`v*`) or manual workflow dispatch
**Purpose**: Build, test, and publish to multiple package managers

### Build Job (Quality Gate)

```yaml
build:
  steps:
    - name: Test Coverage
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v4
      with:
        fail_ci_if_error: true  # BLOCK release if coverage fails
```

### Publish Jobs (Parallel)

After build succeeds, publish to package managers in parallel:
- `publish-npm` - npm registry
- `publish-pypi` - Python Package Index
- `publish-maven` - Maven Central
- `publish-nuget` - NuGet Gallery

Each publish job:
1. Downloads artifacts from build job
2. Uses `publib` for publishing
3. Requires secrets for authentication
4. Can be individually disabled via workflow inputs

## Coverage Strategy

| Workflow | Coverage Check | Fail on Error | Purpose |
|----------|---------------|---------------|---------|
| Build | ✅ Yes | ❌ No | Visibility, tracking |
| Release | ✅ Yes | ✅ Yes | Quality gate |

**Rationale**:
- PRs get coverage feedback without being blocked by Codecov issues
- Releases are blocked if coverage drops below thresholds
- Coverage is enforced where it matters (before publishing)

## Secrets Required

- `NPM_TOKEN` - npm authentication
- `PYPI_TOKEN` - PyPI authentication
- `MAVEN_CENTRAL_USERNAME` / `MAVEN_CENTRAL_PASSWORD` - Maven Central
- `MAVEN_GPG_PRIVATE_KEY` / `MAVEN_GPG_PRIVATE_KEY_PASSPHRASE` - Maven signing
- `NUGET_API_KEY` - NuGet authentication

**Note**: `CODECOV_TOKEN` is not required when using the Codecov GitHub App.

## Best Practices

1. **Use `npm ci`** instead of `npm install` for reproducible builds
2. **Cache dependencies** with `cache: 'npm'` in setup-node
3. **Fail fast** - if build fails, don't run tests
4. **Parallel publishing** - publish to all package managers simultaneously
5. **Manual control** - allow disabling individual publishers via workflow inputs
6. **Artifact retention** - keep build artifacts for 1 day only (reduce storage costs)

## Workflow Execution Order

```
Build Workflow (PR/main):
npm ci → build → test → coverage (warn) → package

Release Workflow (tags):
npm ci → build → test → coverage (block) → package → upload artifacts
  ↓
[publish-npm, publish-pypi, publish-maven, publish-nuget] (parallel)
  ↓
create-release (GitHub release with artifacts)
```

## Debugging Failed Workflows

1. **Build failures**: Check TypeScript compilation errors
2. **Test failures**: Run `npm test` locally
3. **Coverage failures**: Run `npm run test:coverage` locally
4. **Package failures**: Check jsii compatibility
5. **Publish failures**: Verify secrets are set correctly

## Release Process

Releases use `npm version` to manage versioning:

```bash
# Patch release (0.1.0 -> 0.1.1)
npm version patch

# Minor release (0.1.0 -> 0.2.0)
npm version minor

# Major release (0.1.0 -> 1.0.0)
npm version major
```

This automatically:
1. Updates version in `package.json`
2. Creates a git commit
3. Creates a git tag (e.g., `v0.1.1`)

Then push to trigger release:

```bash
git push --follow-tags
```

GitHub Actions will publish to all package managers.
5. **Publish failures**: Verify secrets are set correctly

## Version Management

- Version is managed in `package.json`
- Use `npm version [major|minor|patch]` to bump version and create tag
- Tag triggers release workflow
- All packages published with same version number
