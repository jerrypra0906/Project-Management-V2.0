#!/bin/bash
# Backup PM uploaded documents on the backend server.
# Usage: ./scripts/backup-uploads.sh
# See docs/BACKUP-UPLOADS.md

set -euo pipefail

UPLOADS="/opt/Project-Management-V2.0/uploads"
BACKUP_DIR="/opt/Project-Management-V2.0/backups/uploads"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DATE=$(date +%Y-%m-%d)
ARCHIVE="$BACKUP_DIR/uploads-$DATE.tar.gz"

mkdir -p "$BACKUP_DIR"

if [ ! -d "$UPLOADS" ]; then
  echo "ERROR: Uploads folder not found: $UPLOADS"
  exit 1
fi

FILE_COUNT=$(find "$UPLOADS" -type f | wc -l)
echo "Backing up $FILE_COUNT file(s) from $UPLOADS ..."

tar -czf "$ARCHIVE" -C /opt/Project-Management-V2.0 uploads

SIZE=$(du -h "$ARCHIVE" | cut -f1)

# Remove archives older than RETENTION_DAYS
DELETED=$(find "$BACKUP_DIR" -name "uploads-*.tar.gz" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)

echo ""
echo "Done!"
echo "  Files backed up : $FILE_COUNT"
echo "  Archive         : $ARCHIVE"
echo "  Size            : $SIZE"
echo "  Old archives removed (> ${RETENTION_DAYS} days): $DELETED"
echo ""
echo "Download to your laptop (PowerShell — SSH port 1818):"
echo "  scp -P 1818 root@172.28.80.51:$ARCHIVE D:\\Backups\\PM\\"
echo ""
echo "Or with PuTTY pscp:"
echo "  pscp -P 1818 root@172.28.80.51:$ARCHIVE D:\\Backups\\PM\\"
