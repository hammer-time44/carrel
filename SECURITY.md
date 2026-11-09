# Security Policy: Study Workspace

## Supported Versions
| Version | Supported |
|---|---|
| 1.0.x | Yes |
| < 1.0 | No |

## Reporting a Vulnerability
To report a security vulnerability, please email `security@studyworkspace.app` with:
- Type of issue (e.g. IPC injection, XSS, token leakage)
- Steps to reproduce
- Proof of concept payload or scenario

We respond within 48 hours and coordinate public disclosure post-remediation.

## Security Controls
- **Hardened Electron Environment:** Zero node integration in renderer, sandbox enabled, context isolation enforced.
- **IPC Payload Validation:** All IPC invocations are validated with runtime Zod schemas.
- **Dependency Auditing:** Dependencies are scanned continuously with `npm audit`.
- **Authentication:** Password hashing via bcrypt with 10 salt rounds, rotating refresh tokens with device binding.

