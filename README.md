Logistic Excellence PM - MVP

Minimal web-based Project & Change Request management app.

Storage: JSON file at `data.json` (no database required).

Setup
1) Install Node.js (v18+ works; no native build tools needed)
2) Install deps: npm install
3) Initialize datastore: npm run migrate (creates/updates data.json)
4) Start the server:
   - **Windows (Batch)**: Double-click `start-server.bat`
   - **Windows (PowerShell)**: Run `.\start-server.ps1`
   - **Or manually**: npm run dev

Open http://localhost:3000

API
- GET /api/initiatives
- GET /api/initiatives/:id
- POST /api/initiatives
- PUT /api/initiatives/:id
- DELETE /api/initiatives/:id
- GET /api/dashboard

See docs/requirements.md for full requirements.


Google Sheets Integration

The application automatically syncs data from Google Sheets every 5 minutes when the server is started with the provided scripts.

Configuration
- **Sheet ID**: 1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY
- **Project GID**: 1287888772
- **CR GID**: 355802550

Quick Start Scripts

**Start Server with Auto-Sync:**
- Windows Batch: `start-server.bat` (just double-click)
- PowerShell: `.\start-server.ps1`

**Stop Server:**
- Windows Batch: `stop-server.bat` (just double-click)
- PowerShell: `.\stop-server.ps1`

**Manual Sync (immediate sync without waiting):**
- Windows Batch: `sync-now.bat` (just double-click)
- PowerShell: `.\sync-now.ps1`

Manual Commands

```bash
# Sync Project data
node src/sync_google_sheets.js --sheetId=1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY --gid=1287888772 --type=Project

# Sync CR data
node src/sync_google_sheets_cr.js --sheetId=1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY --gid=355802550
```

Notes

- Auto-sync runs every **5 minutes** when the server starts with environment variables configured
- The importer auto-detects `Project` vs `CR` based on columns; you can force type via `--type=Project|CR|auto`
- Column headers are matched flexibly (e.g., `Initiative Name`, `Project Name`, or `Name`)
- Ensure the Google Sheet is published or shared publicly for CSV export to work
- Source spreadsheet: `https://docs.google.com/spreadsheets/d/1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY/edit`
