# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.17] - 2026-02-15

### Fixed
- Exclude TypeScript source files from npm package
- Add proper exports for submodule imports (`cdk-power-constructs/glue`)

## [0.1.16] - 2026-02-15

### Changed
- Improved package structure for better module resolution

## [0.1.0] - 2026-02-12

### Added
- Initial release
- `GlueResourcePolicyStatement` construct for managing AWS Glue Data Catalog resource policies
- Support for cross-account access and Lake Formation integration
- Multi-language support (TypeScript, Python, Java, .NET, Go)
- Custom resource handler for Glue policy management
- Comprehensive documentation site
- CI/CD workflows for build, test, and release

[Unreleased]: https://github.com/guyon-it-consulting/cdk-power-constructs/compare/v0.1.17...HEAD
[0.1.17]: https://github.com/guyon-it-consulting/cdk-power-constructs/compare/v0.1.16...v0.1.17
[0.1.16]: https://github.com/guyon-it-consulting/cdk-power-constructs/compare/v0.1.0...v0.1.16
[0.1.0]: https://github.com/guyon-it-consulting/cdk-power-constructs/releases/tag/v0.1.0
