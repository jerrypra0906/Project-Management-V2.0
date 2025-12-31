@echo off
REM Manual Sync Script - Syncs data from Google Sheets immediately

echo ========================================
echo Manual Google Sheets Sync
echo ========================================
echo.

echo Syncing Project data...
node src/sync_google_sheets.js --sheetId=1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY --gid=1287888772 --type=Project
echo.

echo Syncing CR data...
node src/sync_google_sheets_cr.js --sheetId=1sX4-W1A5pCHFXC3IiS0yJ8sXJlZG_KcY --gid=355802550
echo.

echo ========================================
echo Sync completed!
echo ========================================
pause

