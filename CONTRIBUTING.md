# Contributing to CDK Power Constructs

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- Clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- CDK version and environment details
- Code samples if applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- Clear and descriptive title
- Detailed description of the proposed functionality
- Use cases and examples
- Why this enhancement would be useful

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

#### PR Guidelines

- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed
- Keep PRs focused on a single feature/fix
- Write clear commit messages

## Development Setup

### Prerequisites

- Node.js 20.x or later
- npm 10.x or later

### Setup

```bash
# Clone the repository
git clone https://github.com/guyon-it-consulting/cdk-power-constructs.git
cd cdk-power-constructs

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Project Structure

```
cdk-power-constructs/
├── lib/                          # CDK constructs (TypeScript)
│   ├── glue/                    # Glue-related constructs
│   └── generated/               # Auto-generated handler imports
├── custom-resource-handlers/    # Lambda handlers
│   ├── lib/                     # Handler source code
│   ├── test/                    # Handler tests
│   └── scripts/                 # Build scripts
├── test/                        # Construct tests
├── website/                     # Docusaurus documentation
└── .github/workflows/           # CI/CD workflows
```

### Development Workflow

```bash
# Watch mode for development
npm run watch

# Run tests
npm test

# Run tests for handlers only
npm run test:handlers

# Run tests for constructs only
npm run test:constructs

# Build documentation
npm run docs

# Run documentation site locally
npm run docs:dev
```

### Testing

- Write unit tests for all new constructs
- Write tests for custom resource handlers
- Ensure all tests pass before submitting PR
- Aim for high test coverage

### Code Style

- Use TypeScript strict mode
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Use meaningful variable and function names

### Commit Messages

Follow conventional commits format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

Example: `feat: add S3 bucket construct with encryption`

## Adding New Constructs

1. Create construct in `lib/` directory
2. Add tests in `test/` directory
3. Update documentation in `website/docs/`
4. Add examples to README
5. Update CHANGELOG.md

## Custom Resource Handlers

When adding custom resource handlers:

1. Add handler code in `custom-resource-handlers/lib/`
2. Add handler tests in `custom-resource-handlers/test/`
3. Register handler in `custom-resource-handlers/scripts/generate.ts`
4. Use generated imports in constructs

## Documentation

- Update README.md for user-facing changes
- Add/update docs in `website/docs/` for new features
- Include code examples
- Update API documentation (auto-generated from JSDoc)

## Release Process

Releases are managed by maintainers:

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create git tag
4. Trigger release workflow
5. Packages published to npm, PyPI, Maven Central, NuGet

## Questions?

Feel free to open an issue for questions or join discussions.

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 License.
