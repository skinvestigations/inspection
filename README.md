# Aircraft Condition Inspection App
## Arion Lightning LS-1 — 100-Hour / Annual Inspection

### Quick Start — Building the Windows Executable

#### Prerequisites
- **Node.js** 18 or higher — https://nodejs.org
- **Windows** machine (for final .exe packaging) OR use GitHub Actions (see below)

#### Build Steps

```bash
# 1. Install dependencies
npm install

# 2. Test in browser (optional)
npm start

# 3. Build Windows installer + portable EXE
npm run dist
```

Output files will be in the `dist/` folder:
- `Aircraft Condition Inspection Setup 1.0.0.exe` — Windows installer
- `AircraftInspection-Portable.exe` — Single file, no install needed

#### Development (live reload)
```bash
npm run electron-dev
```

---

### Data Storage
All inspection data is saved to:
```
C:\Users\<YourName>\Documents\AircraftInspections\
  inspection_data.json     ← All inspection state
  photos\                  ← Inspection photos
  attachments\             ← Attached files
```

Data auto-saves as you work. Safe to close and reopen across multiple days.

---

### Features
- 74 checklist items from Arion Aircraft AA-100CONISP-LS1 R1-4-2012
- Pass / Fail / Reset per item
- Discrepancy tracking with Repaired / Deferred disposition
- Per-item timer (start/stop) + manual time entry
- Photo attachments per item
- File attachments per item
- Add custom inspection items
- HTML report generation with print support
- Service invoice with labor + parts totals
- FAR Part 43 certification language and signature block
- Auto-save, multi-day inspection support

---

### Building on macOS (cross-compile for Windows)
```bash
npm install
npm run build
npx electron-builder --win --x64 --publish never
```

### Adding an App Icon
Place a `icon.ico` file (256×256 recommended) in the `public/` folder before building.
Free converter: https://convertio.co/png-ico/

---

### Signing (optional, removes Windows SmartScreen warning)
Add to package.json build section:
```json
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "yourpassword"
}
```
