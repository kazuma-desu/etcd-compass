# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in ETCD Compass, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email **kazuma-desu** via [GitHub private messaging](https://github.com/kazuma-desu) or use [GitHub's private vulnerability reporting](https://github.com/kazuma-desu/etcd-compass/security/advisories/new).

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### What to expect

- Acknowledgment within **48 hours**
- A fix or mitigation plan within **7 days** for critical issues
- Credit in the release notes (unless you prefer to remain anonymous)

## Scope

ETCD Compass is a desktop client that connects to ETCD clusters. Security concerns include:

- **Credential handling** — how passwords and auth tokens are stored and transmitted
- **Tauri IPC** — command injection or unauthorized access to backend commands
- **CSP bypasses** — cross-site scripting via the webview
- **Dependency vulnerabilities** — known CVEs in direct dependencies
