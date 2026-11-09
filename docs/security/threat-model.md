# Threat Model: Study Workspace Full-Stack Architecture

**Standard:** OWASP Application Security Verification Standard (ASVS) Level 2 Mindset  
**Scope:** Electron Client, Local Storage, Transport Layer, Fastify API Server, PostgreSQL Database, MinIO Object Storage

---

## 1. System Architecture & Trust Boundaries

```
[ Electron Desktop App (Renderer Sandbox) ]
                     │
          (ContextBridge / IPC)
                     ▼
[ Electron Main Process (OS Hardened) ]
                     │  (TLS 1.3 / HTTPS / Signed JWT)
                     ▼
             [ Reverse Proxy ]
                     │
                     ▼
   [ Fastify Backend Service (/server) ]
           │                 │
    (Internal SQL)     (S3 API / IAM)
           ▼                 ▼
   [ PostgreSQL DB ]    [ MinIO Storage ]
```

### Trust Boundaries:
1. **Renderer Process to Main Process:** Renderer is isolated via `contextIsolation: true`, `sandbox: true`, and zero `nodeIntegration`. All IPC is validated with strict Zod schemas.
2. **Client to Backend (Network Boundary):** All communications use HTTPS with short-lived JWT access tokens (15m expiry) and rotating refresh tokens with device fingerprint binding.
3. **Multi-Tenant Data Boundary:** PostgreSQL queries enforce strict tenant scoping via `userId` foreign keys on all sync records.

---

## 2. Threat Analysis (STRIDE)

| Threat Category | Potential Vector | Mitigation Strategy |
|---|---|---|
| **Spoofing** | Forged JWT access token or fake device ID | Cryptographically signed tokens (HMAC-SHA256 / EdDSA), rotating refresh tokens with family tracking and revocation on reuse. |
| **Tampering** | Man-in-the-middle tampering of sync updates | Mandatory TLS, per-record cryptographic hashes, client-side signature / E2EE verification. |
| **Repudiation** | Denying an unauthorized device sign-in or data export | Audit log table (`audit_logs`) capturing timestamp, IP, device ID, user ID, and action for all security-sensitive events. |
| **Information Disclosure** | Leakage of academic notes or study materials | Zero document upload by default. Opt-in cloud backup with AES-256 client-side encryption. Database encryption at rest. |
| **Denial of Service** | Flooding sync write endpoints with heavy batches | Rate limiting per IP and per user account via Fastify rate-limiter; maximum payload size constraints (10MB). |
| **Elevation of Privilege** | Accessing another student's workspaces or cards | Row-Level Security and strict parameterized queries in Drizzle ORM scoped to authenticated `user.id`. |

---

## 3. Security Controls Verification Matrix

* **Authentication:** Password hashing via Argon2id (or scrypt/bcrypt standard with salt), lockout after consecutive failed attempts.
* **Token Rotation:** Refresh tokens rotate on every token exchange. If an old refresh token is reused, all tokens for that user session family are revoked immediately.
* **Data Sanitization:** Strict Zod schema validation on 100% of API endpoints.
* **CORS & Headers:** Restricted CORS origin policy, HSTS, X-Content-Type-Options: nosniff, Content-Security-Policy.

