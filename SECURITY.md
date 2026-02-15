# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please send an email to:

**jerome.guyon@guyon-it-consulting.com**

Include the following information:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability, including how an attacker might exploit it

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours.
- **Investigation**: We will investigate and validate the vulnerability.
- **Updates**: We will keep you informed of our progress.
- **Resolution**: We will work on a fix and coordinate disclosure timing with you.
- **Credit**: We will credit you in the security advisory (unless you prefer to remain anonymous).

### Disclosure Policy

- We will coordinate public disclosure with you
- We prefer to fully remediate vulnerabilities before public disclosure
- We will publish a security advisory on GitHub
- We will release a patched version as soon as possible

## Security Best Practices

When using this library:

1. **Keep Dependencies Updated**: Regularly update to the latest version
2. **Review IAM Policies**: Carefully review generated IAM policies and resource policies
3. **Least Privilege**: Follow the principle of least privilege for all permissions
4. **Secrets Management**: Never hardcode credentials or secrets
5. **Audit Logs**: Enable CloudTrail and monitor for suspicious activity

## Known Security Considerations

### Custom Resource Handlers

- Custom resource handlers run with Lambda execution role permissions
- Review the IAM policies attached to custom resource Lambda functions
- Handlers use AWS SDK v3 with minimal required permissions

### Glue Resource Policies

- Resource policies grant cross-account access - review carefully
- Use specific resource ARNs instead of wildcards when possible
- Test policies in non-production environments first

## Security Updates

Security updates will be released as patch versions and documented in:

- GitHub Security Advisories
- CHANGELOG.md
- Release notes

Subscribe to repository notifications to stay informed about security updates.

## Contact

For security concerns, contact: jerome.guyon@guyon-it-consulting.com

For general questions, use GitHub Issues or Discussions.
