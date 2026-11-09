# Decision 003: Backend Architecture, Local-First Sync, and Database Design

* **Context:** Study Workspace requires a full-stack backend supporting user authentication, multi-device sync, conflict resolution after offline periods, device session management, and optional encrypted backups, while maintaining local-first speed and reliability when offline.
* **Options Considered:** 
  1. NestJS + TypeORM + Redis + PostgreSQL
  2. Fastify + TypeScript + PostgreSQL + Drizzle ORM + MinIO
* **Choice:** Fastify + TypeScript + PostgreSQL + Drizzle ORM + MinIO.
* **Why:** Fastify is extremely lightweight, fast, has native JSON schema validation, low memory footprint, and first-class TypeScript support. Drizzle ORM provides zero-overhead, fully typed schema definitions, instant migrations, and zero bloat. Sync uses deterministic per-record vector timestamps with CRDT semantics for text and notes, ensuring conflict-free reconciliation between offline devices.

