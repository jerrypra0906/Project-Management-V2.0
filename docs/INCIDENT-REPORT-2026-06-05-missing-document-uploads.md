# Incident Report: Missing Document Uploads on Production

| Field | Value |
|-------|-------|
| **Incident ID** | INC-2026-06-05-001 |
| **Report date** | 5 June 2026 |
| **Severity** | Medium |
| **Status** | Root cause identified — fix pending deployment |
| **Affected system** | Project Management V2.0 — Production (`pm.energi-up.com`) |
| **Affected server** | Backend + DB server (`172.28.80.51` / ECS-DB) |
| **Reporter** | Operations / IT (via user report) |

---

## 1. Executive Summary

Users reported that uploaded documents appear in the Request Management UI but fail to download with the error:

> **Failed to download document: File not found on server**

Investigation confirmed that document **metadata** is stored in PostgreSQL and survives server redeployments, but the actual **PDF files** are stored inside the Docker container filesystem at `/app/uploads` without a persistent volume mount. When the backend container was rebuilt on approximately **20 May 2026**, all files uploaded before that date were permanently lost. Files uploaded after the rebuild remain accessible but are still at risk until a persistent volume is configured.

This is a **configuration defect present since the initial project deployment (31 December 2025)**, not a bug in upload/download application logic.

---

## 2. Incident Description

### 2.1 Reported symptom

- **URL:** `pm.energi-up.com` — Change Request `ERP0151095`
- **File:** `ERP0151095_Enhance & Fixing Bugs ZSD_Salestax.pdf`
- **UI behaviour:** File listed under Documents with size (99.07 KB) and upload date (22 April 2026)
- **Download behaviour:** Browser alert — `Failed to download document: File not found on server`

### 2.2 Technical error

The backend API returns HTTP `404` with body:

```json
{ "error": "File not found on server" }
```

This error is thrown only when the document record exists in the database but the physical file at the stored `filePath` does not exist on disk.

---

## 3. Investigation Summary

### 3.1 Application flow (expected behaviour)

| Step | Action | Storage |
|------|--------|---------|
| Upload | User uploads file via UI | File written to `/app/uploads/<uuid>-<originalName>` |
| Upload | Metadata saved | PostgreSQL `documents` table (`fileName`, `filePath`, `sizeBytes`, `uploadedAt`, etc.) |
| List | UI shows documents | Reads from PostgreSQL — no filesystem check |
| Download | User clicks Download | Backend looks up DB record, then checks `fs.access(filePath)` |
| Download fail | File missing on disk | Returns `404 File not found on server` |

Relevant code: `backend/routes/documents.js`

```javascript
const uploadsDir = path.join(process.cwd(), 'uploads');  // → /app/uploads in Docker

// On upload:
filePath: req.file.path  // e.g. /app/uploads/<uuid>-filename.pdf

// On download:
const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
if (!fileExists) {
  return res.status(404).json({ error: 'File not found on server' });
}
```

### 3.2 Production server findings

**Server:** `root@ECS-DB:/opt/Project-Management-V2.0`

#### Container status

```
project_management_backend   Up 8 days   Created ~2 weeks ago   0.0.0.0:13000->3000/tcp
```

#### Volume mounts (actual production config)

| Host path | Container path | Purpose |
|-----------|----------------|---------|
| `/opt/Project-Management-V2.0/.env` | `/app/.env` | Environment config |
| `/opt/Project-Management-V2.0/backend` | `/app/backend` | Application code |
| `/opt/Project-Management-V2.0/docs` | `/app/docs` | Static assets |
| *(none)* | `/app/uploads` | **Upload storage — NOT MOUNTED** |

#### Files inside container (`/app/uploads`)

8 files present, all uploaded **after 20 May 2026**:

| Uploaded | File |
|----------|------|
| 21 May 2026 | `885ed9d9-...-CR ZNEGO_CHG.pdf` |
| 21 May 2026 | `eae14925-...-CR ZNEGO_CHG.pdf` |
| 21 May 2026 | `a4e4108f-...-CR Adjustment in Logistic Report.pdf` |
| 22 May 2026 | `1f6835f1-...-ERP0155055-Display Sales US$ Amount in IDR on ZVOUT_EXPORT.pdf` |
| 26 May 2026 | `a7c3b711-...-PMO - Change Request PO integration.pdf` |
| 28 May 2026 | `395b4ea3-...-Comprehensive Aging report process material purchase.pdf` |
| 1 Jun 2026 | `17077c83-...-ERP0152434 - Enhance Display Sequence in Attachment Paypro.pdf` |
| 2 Jun 2026 | `839494fa-...-DO Blocking Based on Market Price Phase-2.pdf` |

#### Host uploads directory

```
ls -la /opt/Project-Management-V2.0/uploads
→ No such file or directory
```

#### Affected file — database record

```sql
SELECT "fileName", "filePath", "uploadedAt"
FROM documents
WHERE "fileName" LIKE '%ERP0151095%';
```

| fileName | filePath | uploadedAt |
|----------|----------|------------|
| `ERP0151095_Enhance & Fixing Bugs ZSD_Salestax.pdf` | `/app/uploads/fbef9ee7-f1fc-4610-a1f4-10835708c14a-ERP0151095_Enhance & Fixing Bugs ZSD_Salestax.pdf` | `2026-04-22T04:26:12.021Z` |

The file at the stored `filePath` does not exist inside the current container.

---

## 4. Root Cause Analysis

### 4.1 Primary root cause

**Uploaded files are stored in ephemeral container storage while only database metadata is persisted across container rebuilds.**

- PostgreSQL uses a named Docker volume (`postgres_data`) → survives redeployments.
- Upload files are written to `/app/uploads` inside the backend container → **no bind mount or named volume** → lost on container rebuild.

### 4.2 Contributing factor — configuration gap since initial release

Git history confirms the main `docker-compose.yml` (used for production) **never included** an uploads volume mount:

| Date | Commit | Change |
|------|--------|--------|
| 31 Dec 2025 | `ca00802` | Initial commit — `docker-compose.yml` without `./uploads:/app/uploads` |
| 8 May 2026 | `7fd3052` | `docker-compose.local.yml` added **with** uploads mount (local dev only) |
| 26 May 2026 | `41d595a` | `docker-compose.staging.backend.yml` added **with** uploads mount (staging only) |
| — | — | `DEPLOYMENT-ALIYUN.md` (production guide) never documents uploads persistence |

Production was never updated to match staging/local configuration.

### 4.3 Triggering event

The backend container was **recreated around 20 May 2026** (container directory timestamp `May 20 03:27`, container age ~2 weeks at time of investigation). This wiped all files in `/app/uploads` from the previous container instance.

### 4.4 Why the UI still showed the file

The UI reads document metadata from PostgreSQL. The database was unaffected by the container rebuild. There is no filesystem validation when listing documents — only on download.

### 4.5 Root cause diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     User uploads PDF                          │
└──────────────────────────┬───────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│  PostgreSQL (volume) │         │  /app/uploads        │
│  ✅ PERSISTS         │         │  ❌ EPHEMERAL        │
│  metadata saved      │         │  file saved in       │
│                      │         │  container only      │
└─────────────────────┘         └─────────────────────┘
                                           │
                           Container rebuilt (~20 May 2026)
                                           │
                                           ▼
                                  Files deleted ❌
                                  DB records remain ✅
                                           │
                                           ▼
                              UI shows file, download fails
```

---

## 5. Impact Assessment

### 5.1 Scope

| Category | Detail |
|----------|--------|
| **Affected environment** | Production only (`pm.energi-up.com`) |
| **Unaffected** | Staging (has uploads mount since 26 May 2026), local dev (has uploads mount since 8 May 2026) |
| **Data type** | Uploaded PDF/document attachments on Change Requests and Projects |
| **User-facing impact** | Cannot download previously uploaded documents |

### 5.2 Estimated data loss window

All documents uploaded **before ~20 May 2026** on production are likely lost, unless recovered from:

- Original uploader's local copy (re-upload)
- CR creation email attachments (if email was sent with documents attached)
- Any external backup not identified during this investigation

Documents uploaded **after ~20 May 2026** are currently accessible but **will be lost on the next container rebuild** unless the volume mount is applied.

### 5.3 Confirmed affected file

| CR / Reference | File name | Upload date | Status |
|----------------|-----------|-------------|--------|
| ERP0151095 | `ERP0151095_Enhance & Fixing Bugs ZSD_Salestax.pdf` | 22 Apr 2026 | **Missing** |

Additional missing files can be identified by running the audit script in Section 7.3.

### 5.4 Business impact

- Users cannot retrieve historical CR supporting documents
- Audit/compliance risk if uploaded documents are required evidence
- Trust impact — system displays files that cannot be retrieved

---

## 6. Resolution

### 6.1 Immediate fix — persist uploads on production (required)

Execute on backend server (`172.28.80.51`):

```bash
cd /opt/Project-Management-V2.0

# 1. Create persistent uploads directory on host
mkdir -p uploads

# 2. Rescue files currently inside the container (before next rebuild)
docker cp project_management_backend:/app/uploads/. ./uploads/
ls -la uploads/

# 3. Add volume mount to docker-compose.yml under backend → volumes:
#      - ./uploads:/app/uploads

# 4. Recreate backend with persistent storage
docker compose up -d backend

# 5. Verify mount is active
docker inspect project_management_backend --format '{{json .Mounts}}' | python3 -m json.tool
# Expected: Source = /opt/Project-Management-V2.0/uploads, Destination = /app/uploads
```

### 6.2 Recover lost files (manual)

For each file identified as **MISSING** in the audit (Section 7.3):

1. Contact the original uploader to re-upload the document, **or**
2. Check CR creation email outbox/inbox for attachments (app attaches documents to CR creation emails within 10 minutes of CR creation for eligible CRs), **or**
3. Restore from external backup if available

**Note:** Files lost from container storage cannot be recovered from the server itself.

### 6.3 Repository fix (prevent recurrence)

Update the following in the Git repository:

1. **`docker-compose.yml`** — add under `backend.volumes`:
   ```yaml
   - ./uploads:/app/uploads
   ```

2. **`DEPLOYMENT-ALIYUN.md`** — add production deployment step:
   ```bash
   mkdir -p uploads
   ```
   and document the volume mount requirement.

3. **Optional:** Add `uploads/` to `.gitignore` if not already present (user-uploaded content should not be committed).

### 6.4 Optional application improvement

Consider adding a startup or admin health check that compares `documents.filePath` entries against the filesystem and logs/alerts on missing files. This would surface data loss before users attempt a download.

---

## 7. Verification & Audit Commands

### 7.1 Verify volume mount after fix

```bash
docker inspect project_management_backend --format '{{json .Mounts}}' | python3 -m json.tool
docker exec project_management_backend ls -la /app/uploads
ls -la /opt/Project-Management-V2.0/uploads
```

Both paths should show the same files after the fix.

### 7.2 List all documents in database

```bash
docker exec -it project_management_db psql -U postgres -d project_management_v2 -c \
"SELECT \"fileName\", \"filePath\", \"uploadedAt\", \"sizeBytes\"
 FROM documents
 ORDER BY \"uploadedAt\" DESC;"
```

### 7.3 Audit — find all missing files

```bash
echo "=== MISSING FILES ==="
docker exec project_management_db psql -U postgres -d project_management_v2 -t -A -c \
"SELECT \"fileName\", \"filePath\", \"uploadedAt\" FROM documents ORDER BY \"uploadedAt\";" | while IFS='|' read -r filename filepath uploadedat; do
  if ! docker exec project_management_backend test -f "$filepath" 2>/dev/null; then
    echo "MISSING | $uploadedat | $filename"
  fi
done

echo ""
echo "=== SUMMARY ==="
TOTAL=$(docker exec project_management_db psql -U postgres -d project_management_v2 -t -A -c "SELECT COUNT(*) FROM documents;")
ON_DISK=$(docker exec project_management_db psql -U postgres -d project_management_v2 -t -A -c \
"SELECT \"filePath\" FROM documents;" | while read fp; do
  docker exec project_management_backend test -f "$fp" 2>/dev/null && echo ok
done | wc -l)
echo "Total in DB:     $TOTAL"
echo "Present on disk: $ON_DISK"
echo "Missing:         $((TOTAL - ON_DISK))"
```

### 7.4 Test download after fix

1. Upload a new test PDF on any CR
2. Confirm file appears on host: `ls -la /opt/Project-Management-V2.0/uploads/`
3. Download via UI — should succeed
4. Restart backend: `docker compose restart backend`
5. Download again — should still succeed (confirms persistence)

---

## 8. Timeline

| Date / Time | Event |
|-------------|-------|
| 31 Dec 2025 | Project initial commit — production `docker-compose.yml` ships without uploads volume |
| 22 Apr 2026 | `ERP0151095_Enhance & Fixing Bugs ZSD_Salestax.pdf` uploaded to production |
| 8 May 2026 | Local dev compose updated with persistent uploads mount |
| ~20 May 2026 | Production backend container rebuilt — all pre-existing uploads lost |
| 21 May – 2 Jun 2026 | New uploads succeed (stored in new container, still ephemeral) |
| 5 Jun 2026 | User reports download failure for ERP0151095 |
| 5 Jun 2026 | Investigation completed — root cause confirmed |

---

## 9. Lessons Learned

1. **Stateful data must use persistent storage.** Any data written to the container filesystem (uploads, logs requiring retention, temp exports) needs an explicit Docker volume or bind mount.

2. **Environment parity matters.** Staging and local were fixed in May 2026; production was not. Deployment checklists should be environment-agnostic for data persistence.

3. **UI should not imply availability without validation.** The document list shows files based on DB records only. A missing-file indicator or periodic integrity check would reduce user surprise.

4. **Production deployment guide was incomplete.** `DEPLOYMENT-ALIYUN.md` covers database persistence but omitted uploads directory setup.

5. **Container rebuilds are data-destructive events** unless volumes are configured. Treat `docker compose up -d --build` and image updates as potential data loss events for non-mounted paths.

---

## 10. Action Items

| # | Action | Owner | Priority | Status |
|---|--------|-------|----------|--------|
| 1 | Create host `uploads/` directory and copy existing container files | Ops / Server Admin | **P0 — Immediate** | Pending |
| 2 | Add `./uploads:/app/uploads` to production `docker-compose.yml` and restart backend | Ops / Server Admin | **P0 — Immediate** | Pending |
| 3 | Run missing-files audit (Section 7.3) and compile full list of lost documents | Ops / Server Admin | **P1 — This week** | Pending |
| 4 | Coordinate re-upload of missing documents with CR owners | Business / IT | **P1 — This week** | Pending |
| 5 | Update `docker-compose.yml` and `DEPLOYMENT-ALIYUN.md` in Git repository | Development | **P1 — This week** | Pending |
| 6 | Add `uploads/` to backup procedures alongside PostgreSQL | Ops | **P2 — Next sprint** | Pending |
| 7 | Consider application-level file integrity check or missing-file UI indicator | Development | **P3 — Backlog** | Pending |

---

## 11. References

| Resource | Location |
|----------|----------|
| Upload/download route | `backend/routes/documents.js` |
| Production compose (missing mount) | `docker-compose.yml` |
| Staging compose (correct mount) | `docker-compose.staging.backend.yml` |
| Local compose (correct mount) | `docker-compose.local.yml` |
| Production deployment guide | `DEPLOYMENT-ALIYUN.md` |
| Staging deployment guide (includes `mkdir -p uploads`) | `docs/DEPLOYMENT-ALICLOUD-STAGING.md` |
| Initial commit (no uploads mount) | `ca00802` — 31 Dec 2025 |
| Staging uploads fix | `41d595a` — 26 May 2026 |

---

## 12. Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Investigated by | Cursor AI Agent + Operations Team | 5 Jun 2026 | Remote investigation via PuTTY server output |
| Fix implemented by | | | |
| Verified by | | | |
| Closed by | | | |

---

*End of incident report*
