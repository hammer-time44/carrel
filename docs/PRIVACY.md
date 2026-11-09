# Privacy Policy: Study Workspace

**Effective Date:** November 8, 2026

## 1. Local-First Principle
Study Workspace is designed as a private, local-first academic desktop environment.
- **Your files stay on your device:** Opening Word (.docx), Excel (.xlsx), PowerPoint (.pptx), or PDF (.pdf) files does not upload your documents to any cloud server by default.
- **Local Storage:** Document annotations, reading positions, and study notes are stored on your local machine.

## 2. Cloud Synchronization (Opt-In)
If you register for an optional sync account:
- We sync metadata, note content, flashcards, and reading positions between your authenticated devices.
- Sync payloads can be end-to-end encrypted with a local user passphrase.
- We never sell or share academic data with third parties or data brokers.

## 3. AI Study Assistant (Bring-Your-Own-Key)
- The AI Study Assistant is disabled by default.
- When enabled, your personal API key (Google Gemini, OpenAI, or Anthropic) is stored strictly on your local device.
- Direct queries are sent only to the provider you explicitly select.

## 4. GDPR & CCPA Compliance
- **Data Export:** You can export 100% of your account profile, device records, and sync data in JSON format at any time via `POST /api/v1/user/export-data`.
- **Right to Erasure:** Deleting your account via `DELETE /api/v1/user/account` permanently removes all user records, devices, and sync history.

