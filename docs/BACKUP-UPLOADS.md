# Daily backup of uploaded documents (temporary mitigation)

This guide describes a **simple manual backup** of uploaded PDFs and other documents from the production backend server to your laptop.

Use this as **temporary mitigation and monitoring** after the uploads volume fix (see [INCIDENT-REPORT-2026-06-05-missing-document-uploads.md](./INCIDENT-REPORT-2026-06-05-missing-document-uploads.md)). Long-term storage should move to Synology NAS (see [SYNOLOGY-INTEGRATION.md](./SYNOLOGY-INTEGRATION.md)).

---

## Connection details (production)

| Setting | Value |
|---------|--------|
| Server | `172.28.80.51` (ECS-DB) |
| PuTTY / SSH port | **1818** (not the default port 22) |
| Upload folder | `/opt/Project-Management-V2.0/uploads/` |
| Backup folder | `/opt/Project-Management-V2.0/backups/uploads/` |

**PuTTY alone cannot download files** — it is terminal-only. Use `scp` or `pscp` on your laptop for the download step.

---

## Quick start (recommended — no git push/pull required)

### Step 1 — Create backup on server (PuTTY)

Connect with PuTTY (port **1818**), then run:

```bash
mkdir -p /opt/Project-Management-V2.0/backups/uploads && \
tar -czf /opt/Project-Management-V2.0/backups/uploads/uploads-$(date +%Y-%m-%d).tar.gz \
  -C /opt/Project-Management-V2.0 uploads && \
ls -lh /opt/Project-Management-V2.0/backups/uploads/
```

**Example output:**

```
total 2.0M
-rw-r--r-- 1 root root 2.0M Jun  9 10:26 uploads-2026-06-09.tar.gz
```

Note the **exact filename** (date uses **server time**, not your laptop).

### Step 2 — Download to laptop (PowerShell)

Create a local folder once:

```powershell
mkdir D:\Backups\PM -Force
```

Download using **port 1818** (`-P` is uppercase for `scp`):

```powershell
scp -P 1818 root@172.28.80.51:/opt/Project-Management-V2.0/backups/uploads/uploads-2026-06-09.tar.gz D:\Backups\PM\
```

Replace `uploads-2026-06-09.tar.gz` with the filename from Step 1 `ls` output.

Enter the server password when prompted. First connection may ask:

```
Are you sure you want to continue connecting (yes/no)?
```

Type `yes`.

**Verify on laptop:**

```powershell
dir D:\Backups\PM\
```

### Step 3 — Extract on Windows (optional)

```powershell
mkdir D:\Backups\PM\extracted-2026-06-09
tar -xzf D:\Backups\PM\uploads-2026-06-09.tar.gz -C D:\Backups\PM\extracted-2026-06-09
dir D:\Backups\PM\extracted-2026-06-09\uploads
```

Or use **7-Zip**: right-click the `.tar.gz` → Extract.

---

## What gets backed up

| Item | Path on server |
|------|----------------|
| Upload folder (source) | `/opt/Project-Management-V2.0/uploads/` |
| Backup archives | `/opt/Project-Management-V2.0/backups/uploads/` |

PostgreSQL (document metadata) is **not** included. For full recovery you also need periodic DB backups.

---

## Alternative — reusable script on server

If you prefer a script instead of the one-liner, create it once on the server (no git required):

```bash
nano /opt/Project-Management-V2.0/backup-uploads.sh
```

Paste contents from `scripts/backup-uploads.sh` in this repo, then:

```bash
chmod +x /opt/Project-Management-V2.0/backup-uploads.sh
/opt/Project-Management-V2.0/backup-uploads.sh
```

Or after `git pull`:

```bash
cd /opt/Project-Management-V2.0
chmod +x scripts/backup-uploads.sh
./scripts/backup-uploads.sh
```

---

## Download options (laptop)

All commands must use **port 1818** and the **exact archive filename** from `ls -lh` on the server.

### Option 1 — Windows `scp` (recommended)

```powershell
scp -P 1818 root@172.28.80.51:/opt/Project-Management-V2.0/backups/uploads/uploads-YYYY-MM-DD.tar.gz D:\Backups\PM\
```

### Option 2 — PuTTY `pscp`

```powershell
pscp -P 1818 root@172.28.80.51:/opt/Project-Management-V2.0/backups/uploads/uploads-YYYY-MM-DD.tar.gz D:\Backups\PM\
```

### Option 3 — PuTTY `psftp` (interactive)

```powershell
psftp -P 1818 root@172.28.80.51
```

Then:

```
cd /opt/Project-Management-V2.0/backups/uploads
lcd D:\Backups\PM
get uploads-YYYY-MM-DD.tar.gz
quit
```

### Option 4 — SSH config (shorter commands)

Create `C:\Users\<you>\.ssh\config`:

```
Host pm-server
    HostName 172.28.80.51
    Port 1818
    User root
```

Then:

```powershell
scp pm-server:/opt/Project-Management-V2.0/backups/uploads/uploads-2026-06-09.tar.gz D:\Backups\PM\
```

---

## Optional — automatic daily backup on server

Creates the archive every night on the server (you still download to laptop when needed):

```bash
crontab -e
```

Add:

```
0 2 * * * mkdir -p /opt/Project-Management-V2.0/backups/uploads && tar -czf /opt/Project-Management-V2.0/backups/uploads/uploads-$(date +\%Y-\%m-\%d).tar.gz -C /opt/Project-Management-V2.0 uploads >> /opt/Project-Management-V2.0/backups/uploads/backup.log 2>&1
```

---

## Monitoring checklist

| Check | How |
|-------|-----|
| Backup created | `ls -lh /opt/Project-Management-V2.0/backups/uploads/` shows today's `.tar.gz` |
| File count | `find /opt/Project-Management-V2.0/uploads -type f \| wc -l` |
| Downloaded to laptop | `dir D:\Backups\PM\` shows the archive |
| Archive valid | Extract and spot-check a few PDFs |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Connection timed out` on `scp` | Add **`-P 1818`**. Default port 22 is not used. |
| `No such file or directory` on download | Wrong date in filename — run `ls -lh .../backups/uploads/` on server and use exact name |
| `Uploads folder not found` | Run `mkdir -p /opt/Project-Management-V2.0/uploads` and ensure `./uploads:/app/uploads` is in `docker-compose.yml` |
| `scp` not recognized | Enable **OpenSSH Client** in Windows Settings → Apps → Optional features |
| `pscp` not recognized | Install full PuTTY from [putty.org](https://www.putty.org/) |
| Server date ≠ laptop date | Always use filename from server `ls`, not laptop `Get-Date` |
| Archive size suddenly smaller | Compare file count on server — investigate missing uploads |

---

## Suggested laptop folder layout

```
D:\Backups\PM\
├── uploads-2026-06-09.tar.gz
├── uploads-2026-06-10.tar.gz
├── extracted-2026-06-09\
│   └── uploads\
│       └── *.pdf
└── ...
```

Keep at least **7–14 days** of archives on your laptop for monitoring.

---

## Related documentation

| Document | Purpose |
|----------|---------|
| [INCIDENT-REPORT-2026-06-05-missing-document-uploads.md](./INCIDENT-REPORT-2026-06-05-missing-document-uploads.md) | Root cause and production fix |
| [SYNOLOGY-INTEGRATION.md](./SYNOLOGY-INTEGRATION.md) | Long-term NAS storage |
| [DEPLOYMENT-ALIYUN.md](../DEPLOYMENT-ALIYUN.md) | Production deployment (`uploads` volume mount) |
| `scripts/backup-uploads.sh` | Optional server backup script |

---

## Quick reference (copy-paste)

**Server (PuTTY, port 1818):**

```bash
mkdir -p /opt/Project-Management-V2.0/backups/uploads && \
tar -czf /opt/Project-Management-V2.0/backups/uploads/uploads-$(date +%Y-%m-%d).tar.gz \
  -C /opt/Project-Management-V2.0 uploads && \
ls -lh /opt/Project-Management-V2.0/backups/uploads/
```

**Laptop (PowerShell) — replace `YYYY-MM-DD` with date from `ls` output:**

```powershell
mkdir D:\Backups\PM -Force
scp -P 1818 root@172.28.80.51:/opt/Project-Management-V2.0/backups/uploads/uploads-YYYY-MM-DD.tar.gz D:\Backups\PM\
```
