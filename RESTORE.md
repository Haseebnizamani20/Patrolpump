# Database Restore Guide — Diesel Pump Management System

Use this guide to restore the Pump database from a backup created by `backup-script.js`.

---

## When to Restore

- Hard drive failure / new laptop
- Accidental data deletion
- Moving the system to a new machine

---

## Prerequisites

- MongoDB Community Server installed and running on `localhost:27017`
- **MongoDB Database Tools** installed (`mongorestore` available on PATH or in MongoDB bin folder)
- The backup folder from `backup/data/backup_YYYY-MM-DD_HH-MM-SS/`

---

## Restore Steps

### Step 1 — Stop the Application

Close the Diesel Pump Management System if it is running.

### Step 2 — Locate Your Backup

Open the backup folder. Each backup is a timestamped subfolder:

```
backup/
  data/
    backup_2024-01-15_23-00-00/
      Pump/                    ← your database dump
        SaleEntry.bson
        Customer.bson
        ...
      backup-meta.json
```

Choose the backup you want to restore (usually the most recent one).

### Step 3 — (Optional) Drop the Existing Database

> ⚠️ **Warning:** This permanently removes all current data. Skip this step if you only want to add missing data.

Open PowerShell and run:

```powershell
mongosh --eval "db.getSiblingDB('Pump').dropDatabase()"
```

### Step 4 — Run mongorestore

In PowerShell, navigate to the backup folder and run:

```powershell
# Replace the path with your actual backup folder
mongorestore --host=localhost:27017 --db=Pump "backup\data\backup_2024-01-15_23-00-00\Pump"
```

Or using the full path to mongorestore if it is not on PATH:

```powershell
& "C:\Program Files\MongoDB\Tools\100\bin\mongorestore.exe" `
    --host=localhost:27017 `
    --db=Pump `
    "backup\data\backup_2024-01-15_23-00-00\Pump"
```

### Step 5 — Verify the Restore

```powershell
mongosh --eval "db.getSiblingDB('Pump').getCollectionNames()"
```

You should see collections like `SaleEntry`, `Customer`, `Supplier`, etc.

### Step 6 — Start the Application

Launch Diesel Pump Management System and log in as owner. Verify:
- Dashboard shows correct totals
- Customer list is intact
- Recent sales entries appear in the Sale page

---

## Quick Reference Card

| Task | Command |
|------|---------|
| List backups | `dir backup\data` |
| Run backup now | `node backup\backup-script.js` |
| Restore from backup | `mongorestore --db=Pump <backupFolder>\Pump` |
| Drop database | `mongosh --eval "db.getSiblingDB('Pump').dropDatabase()"` |
| Check collections | `mongosh --eval "db.getSiblingDB('Pump').getCollectionNames()"` |

---

## Setting Up Automatic Daily Backup

1. Open **Task Scheduler** (search in Start Menu)
2. Click **Create Basic Task…**
3. Name: `PumpDB Daily Backup`
4. Trigger: **Daily** at **11:00 PM**
5. Action: **Start a program**
   - Program: `node`
   - Arguments: `"C:\path\to\PatrolPump\backup\backup-script.js"`
   - Start in: `C:\path\to\PatrolPump`
6. Click **Finish**
7. Right-click the task → **Run** to test it immediately

---

## Backup Retention

By default the script keeps the **last 7 backups** and deletes older ones.
To change this:

```powershell
node backup\backup-script.js --keep 14
```

To save to an external drive or USB:

```powershell
node backup\backup-script.js --dir "E:\PumpBackups"
```
