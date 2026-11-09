# Known Limitations & Honest Architectural Trade-Offs

## 1. Complex PowerPoint Animations & SmartArt
* **Limitation:** PowerPoint presentations with intricate 3D transitions, complex timing triggers, and proprietary embedded media may render with standard presentation slides rather than replicating Microsoft Office's exact animation timing.
* **Alternative Implemented:** High-fidelity slide text, layout rendering, presenter mode with slide preview thumbnail list, and fullscreen keyboard presentation mode.

## 2. Legacy Binary Office Formats (.doc, .ppt, .xls)
* **Limitation:** Legacy pre-2007 binary formats (Word 97-2003 `.doc`, PowerPoint 97-2003 `.ppt`) rely on obsolete proprietary compound binary file formats and are not supported for editing.
* **Recommendation:** Convert legacy files to modern OpenXML (`.docx`, `.pptx`) using Microsoft Office, LibreOffice, or Google Docs prior to import. Modern `.xlsx` and `.csv` are fully supported.

## 3. Operating System Code Signing in CI without Developer Certificates
* **Limitation:** Apple Developer ID signing/notarization and Microsoft Authenticode EV hardware tokens require private cryptographic keys and physical HSM tokens not present in automated CI environments.
* **Alternative Implemented:** Packaging scripts and `electron-builder.yml` configure full NSIS (Windows), DMG/ZIP (macOS), and AppImage/DEB (Linux) targets, with signing and notarization hooks documented and ready for signing keys when deployed to production build agents.

