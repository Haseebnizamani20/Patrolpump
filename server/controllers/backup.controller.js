const path = require('path');
const { runBackup, findMongodump } = require('../../backup/backup-script');
const fs = require('fs');

const BACKUP_ROOT = path.join(__dirname, '..', '..', 'backup', 'data');

/**
 * GET /api/backup/status
 * Returns list of existing backups and mongodump availability.
 */
exports.getBackupStatus = async (req, res, next) => {
  try {
    const mongodumpAvailable = !!findMongodump();

    let backups = [];
    if (fs.existsSync(BACKUP_ROOT)) {
      backups = fs.readdirSync(BACKUP_ROOT)
        .filter(f => fs.statSync(path.join(BACKUP_ROOT, f)).isDirectory())
        .map(name => {
          const dir = path.join(BACKUP_ROOT, name);
          const metaPath = path.join(dir, 'backup-meta.json');
          const failedPath = path.join(dir, 'BACKUP_FAILED.txt');
          let meta = null;
          let failed = false;
          try { if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath)); } catch {}
          if (fs.existsSync(failedPath)) failed = true;
          const stat = fs.statSync(dir);
          return {
            name,
            timestamp: meta?.timestamp || stat.mtime.toISOString(),
            database: meta?.database,
            success: !failed,
            path: dir,
          };
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    res.json({
      success: true,
      data: {
        mongodumpAvailable,
        backupRoot: BACKUP_ROOT,
        backups,
        totalBackups: backups.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/backup/run
 * Trigger a manual backup. Owner only. Runs synchronously (small DB).
 */
exports.triggerBackup = async (req, res, next) => {
  try {
    const result = runBackup();

    if (result.success) {
      res.json({
        success: true,
        data: {
          message: 'Backup completed successfully',
          backupDir: result.backupDir,
          timestamp: result.timestamp,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Backup failed',
        data: { backupDir: result.backupDir },
      });
    }
  } catch (error) {
    next(error);
  }
};
