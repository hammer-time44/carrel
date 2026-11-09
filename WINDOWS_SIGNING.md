# Windows Packaging & Authenticode Code Signing Guide: Carrel

This guide outlines the production packaging and Authenticode code signing process for **Carrel** on Windows, designed to satisfy Windows Smart App Control (SAC) and Microsoft SmartScreen publisher verification requirements.

---

## 1. Overview & Smart App Control Context

Windows Smart App Control evaluates executables before execution. Unsigned binaries (such as raw development binaries or unpacked Electron executables) are blocked by default with:
```
STATUS_INVALID_IMAGE_HASH: An Application Control policy has blocked this file.
```

To deliver a trusted desktop experience on Windows:
1. **Packaging:** Carrel produces two Windows targets configured in `electron-builder.yml`:
   - **NSIS Installer:** `Carrel-Setup-<version>.exe` (per-user installation, automatic shortcut creation, clean uninstaller).
   - **Portable Executable:** `Carrel-Portable-<version>.exe` (single self-contained binary, zero-installation).
2. **Authenticode Signing:** All `.exe` and `.dll` binaries inside the application and the installer wrapper are cryptographically signed with an Authenticode certificate trusted by Microsoft Root CA.
3. **Important Note on Smart App Control Acceptance:**
   > [!IMPORTANT]
   > Cryptographic signing with an Authenticode certificate is a mandatory prerequisite for Windows Smart App Control. However, code signing alone does **not** guarantee immediate Smart App Control acceptance on day one. Standard certificates must build reputation over time with Microsoft SmartScreen cloud telemetry based on user download volume, unless signed with an Extended Validation (EV) certificate or Microsoft Trusted Signing.

---

## 2. Configuration Overview (`electron-builder.yml`)

The Windows build pipeline in `electron-builder.yml` is configured with:

```yaml
appId: com.carrel.app
productName: Carrel
copyright: Copyright © 2026 hammer-time

directories:
  output: release
  buildResources: public

files:
  - "dist/**"
  - "dist-electron/**"
  - "package.json"

fileAssociations:
  - ext: pdf
    name: PDF Document
    role: Viewer
    mimeType: application/pdf
  - ext: pptx
    name: PowerPoint Presentation
    role: Viewer
    mimeType: application/vnd.openxmlformats-officedocument.presentationml.presentation

win:
  target:
    - target: nsis
      arch:
        - x64
    - target: portable
      arch:
        - x64
  artifactName: "${productName}-Setup-${version}.${ext}"
  icon: public/icon.svg
  signingHashAlgorithms:
    - sha256
  rfc3161TimeStampServer: "http://timestamp.digicert.com"

nsis:
  oneClick: true
  perMachine: false
  allowToChangeInstallationDirectory: false
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: Carrel
  uninstallDisplayName: "${productName} ${version}"
  artifactName: "${productName}-Setup-${version}.${ext}"

portable:
  artifactName: "${productName}-Portable-${version}.${ext}"
```

---

## 3. Secure Certificate Configuration via Environment Variables

Never commit certificate files (`.pfx`, `.p12`), private keys, or passwords to source control. They are protected by `.gitignore` in this repository.

Supply credentials via environment variables during the CI/CD pipeline or build session:

### Option A: Standard PFX / P12 File or Base64 Encoded Certificate
Set the following environment variables:

```powershell
# In PowerShell:
$env:CSC_LINK = "C:\secure\certificates\carrel_authenticode.pfx"
# Or provide the entire certificate as a Base64 encoded string:
# $env:CSC_LINK = "MIIK2gIBAzCCCp8GCSqGSIb3DQEHAaCCCpAEg..."

$env:CSC_KEY_PASSWORD = "YourSecureCertificatePassword"
```

In GitHub Actions / CI:
```yaml
env:
  CSC_LINK: ${{ secrets.WINDOWS_CERTIFICATE_BASE64 }}
  CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
```

### Option B: Hardware Token / Windows Certificate Store (EV Certificate)
If using an Extended Validation (EV) hardware token (e.g. YubiKey, SafeNet eToken) attached to the build machine:

```powershell
# Set the certificate SHA1 fingerprint or subject name
$env:WIN_CERT_SHA1 = "A1B2C3D4E5F6789012345678901234567890ABCD"
# or
$env:WIN_CERT_SUBJECT_NAME = "hammer-time"
```

### Option C: Microsoft Trusted Signing (formerly Azure Code Signing)
For cloud-based hardware-backed signing without physical USB dongles:
Use `trusted-signing` / `AzureSignTool` invoked via electron-builder's custom sign hook.

---

## 4. Build & Signing Commands

Run the build pipeline and generate the signed installers:

### 1. Compile the Application
```powershell
npm run build
```
This runs `npm run build:main` (TypeScript compiler) and `npm run build:renderer` (Vite client build).

### 2. Generate Both Windows Installers (NSIS + Portable)
```powershell
npm run dist:win
```

### 3. Generate NSIS Installer Only
```powershell
npm run dist:win:nsis
```

### 4. Generate Portable Executable Only
```powershell
npm run dist:win:portable
```

### 5. Pack Unpacked Directory for Inspection (Without Installer Compression)
```powershell
npm run pack
```

---

## 5. Verifying the Signature

After packaging, verify the Authenticode signature and timestamp on the output executable:

```powershell
# Inspect signature using Windows PowerShell
Get-AuthenticodeSignature ".\release\Carrel-Setup-0.1.0.exe"

# Or using SignTool from Windows SDK:
signtool verify /pa /v ".\release\Carrel-Setup-0.1.0.exe"
```

Expected output:
- **Status:** `Valid`
- **SignerCertificate:** Issued by a recognized Root CA (e.g. DigiCert, Sectigo, GlobalSign).
- **TimeStamper:** Verified RFC 3161 timestamp (`http://timestamp.digicert.com`).

---

## 6. Preserved Electron Security Boundaries

The packaging configuration maintains all hardened security boundaries established for Carrel:
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- Zero web navigation (`will-navigate` denied)
- Popups and new windows denied (`setWindowOpenHandler` returns `action: 'deny'`)
- Strict offline Content Security Policy (`connect-src 'none'`, no remote font or CDN loading)
- Single instance lock enabled
- Local-only reading position state
