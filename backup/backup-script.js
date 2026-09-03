#!/usr/bin/env node
/**
 * backup-script.js — Diesel Pump Management System
 *
 * Runs mongodump to create a timestamped backup of the Pump database.
 * Keeps the last N backups and deletes older ones automatically.
 *
 * Usage:
 *   node backup/backup-script.js
 *   node backup/backup-script.js --dir "D:\Backups\PumpDB" --keep 14
 *
 * Options:
 *   --dir   <path>   Target backup directory (default: ./backup/data)
 *   --keep  <n>      Number of backups to keep (default: 7)
 *   --db    <name>   MongoDB database name (default: Pump)
 *   --uri   <uri>    MongoDB URI (default: mongodb://localhost:27017)
 *
 * Schedule daily via Windows Task Scheduler:
 *   Action:  node "C:\path\to\backup\backup-script.js"
 *   Trigger: Daily at 11:00 PM
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ---- Parse CLI arguments ----
const cliArgs = process.argv.slice(2);
function getArg(flag, defaultVal) {
  const idx = cliArgs.indexOf(flag);
  return idx !== -1 && cliArgs[idx + 1] ? cliArgs[idx + 1] : defaultVal;
}

// Load .env if present
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8')
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('#'))
      .forEach(l => {
        const [k, ...v] = l.split('=');
        if (k && v.length && !process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim();
        }
      });
  }
} catch {}

const DB_URI    = getArg('--uri',  process.env.MONGODB_URI || 'mongodb://localhost:27017');
const DB_NAME   = getArg('--db',   'Pump');
const KEEP_COUNT = parseInt(getArg('--keep', '7'), 10);
const BACKUP_ROOT = getArg('--dir', path.join(__dirname, 'data'));

// ---- Helpers ----
function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  return line;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getTimestamp() {
  const now = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}_${p(now.getHours())}-${p(now.getMinutes())}-${p(now.getSeconds())}`;
}

function cleanOldBackups(dir, keep) {
  const entries = fs.readdirSync(dir)
    .filter(f => fs.statSync(path.join(dir, f)).isDirectory())
    .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);  // newest first

  const toDelete = entries.slice(keep);
  for (const entry of toDelete) {
    try {
      fs.rmSync(path.join(dir, entry.name), { recursive: true, force: true });
      log(`Deleted old backup: ${entry.name}`);
    } catch (e) {
      log(`Warning: could not delete ${entry.name}: ${e.message}`);
    }
  }
  return { kept: Math.min(entries.length, keep), deleted: toDelete.length };
}

function findMongodump() {
  // Try PATH first
  const onPath = spawnSync('mongodump', ['--version'], { shell: true, stdio: 'pipe' });
  if (onPath.status === 0) return 'mongodump';

  // Common Windows install locations
  const candidates = [
    'C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe',
    'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongodump.exe',
    'C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongodump.exe',
    'C:\\Program Files\\MongoDB\\Server\\5.0\\bin\\mongodump.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ---- Main ----
function runBackup() {
  const lines = [];
  const capture = (msg) => lines.push(log(msg));

  capture('=== Diesel Pump DB Backup Started ===');
  capture(`Database   : ${DB_NAME}`);
  capture(`Backup root: ${BACKUP_ROOT}`);
  capture(`Keep last  : ${KEEP_COUNT} backups`);

  ensureDir(BACKUP_ROOT);

  const timestamp = getTimestamp();
  const backupDir = path.join(BACKUP_ROOT, `backup_${timestamp}`);
  ensureDir(backupDir);

  // Find mongodump binary
  const mongodump = findMongodump();
  if (!mongodump) {
    capture('ERROR: mongodump not found. Install MongoDB Database Tools from:');
    capture('       https://www.mongodb.com/try/download/database-tools');
    fs.writeFileSync(path.join(backupDir, 'BACKUP_FAILED.txt'),
      `Backup failed at ${new Date().toISOString()}\nReason: mongodump not found`);
    return { success: false, error: 'mongodump not found', backupDir };
  }

  // Extract host from URI
  const uriMatch = DB_URI.match(/mongodb:\/\/([^/]+)/);
  const host = uriMatch ? uriMatch[1] : 'localhost:27017';

  capture(`Running: mongodump --host=${host} --db=${DB_NAME} --out=<backupDir>`);

  const result = spawnSync(mongodump, [
    `--host=${host}`,
    `--db=${DB_NAME}`,
    `--out=${backupDir}`,
  ], { stdio: 'inherit', shell: process.platform === 'win32' });

  if (result.status !== 0) {
    capture(`ERROR: mongodump exited with code ${result.status}`);
    fs.writeFileSync(path.join(backupDir, 'BACKUP_FAILED.txt'),
      `Backup failed at ${new Date().toISOString()}\nExit code: ${result.status}`);
    return { success: false, error: `mongodump exit code ${result.status}`, backupDir };
  }

  // Write metadata
  const meta = {
    timestamp: new Date().toISOString(),
    database: DB_NAME,
    host,
    backupDir,
    scriptVersion: '1.0',
  };
  fs.writeFileSync(path.join(backupDir, 'backup-meta.json'), JSON.stringify(meta, null, 2));

  // Clean old backups
  const { kept, deleted } = cleanOldBackups(BACKUP_ROOT, KEEP_COUNT);
  capture(`Cleanup: kept ${kept}, deleted ${deleted} old backups`);
  capture(`✅ Backup complete! → ${backupDir}`);

  return { success: true, backupDir, timestamp };
}

// Run when called directly
if (require.main === module) {
  const result = runBackup();
  process.exit(result.success ? 0 : 1);
}

module.exports = { runBackup, findMongodump };
