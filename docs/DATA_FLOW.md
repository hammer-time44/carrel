# Data Flow Diagram

```mermaid
flowchart TD
    User["Student User"]
    FileSystem["Local File System (.docx, .pdf, .xlsx, .pptx)"]
    ElectronMain["Electron Main Process (Safe File Service)"]
    PreloadBridge["ContextBridge (Least Privilege)"]
    Renderer["React 19 Renderer (Zustand Store)"]
    LocalStorage["Local Storage (App State & Session)"]
    SyncEngine["Sync Service (LWW Vector Clocks)"]
    BackendAPI["Fastify Backend (/server)"]
    PostgreSQL[("PostgreSQL Database")]
    MinIO[("MinIO / S3 Encrypted Backup")]
    AIProvider["AI Provider (BYOK Gemini / Claude / OpenAI)"]

    User -->|Opens / Edits File| Renderer
    Renderer <-->|IPC Invocation| PreloadBridge
    PreloadBridge <-->|Validated IPC| ElectronMain
    ElectronMain <-->|Atomic Read / Write| FileSystem
    
    Renderer <-->|Save / Restore Session| LocalStorage
    Renderer -->|Manual / Periodic Sync| SyncEngine
    SyncEngine <-->|TLS 1.3 / JWT Auth| BackendAPI
    BackendAPI <-->|SQL Sync Records| PostgreSQL
    BackendAPI <-->|Opt-in Encrypted Files| MinIO

    Renderer -.->|Optional BYOK Query| AIProvider
```

### Data Flow Guarantees:
1. **Zero Unintended Uploads:** Files opened from the local drive are read and written directly via Electron Main process APIs; no document content leaves the machine without explicit opt-in.
2. **Encrypted in Transit:** All synchronization traffic requires HTTPS/TLS 1.3 with cryptographic JWT bearer tokens.
3. **Resilient Offline Operation:** When network connectivity is absent, the renderer continues reading, writing, and saving to local disk and localStorage. Convergence occurs automatically once reconnected.

