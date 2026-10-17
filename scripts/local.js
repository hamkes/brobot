/* ============================================================
   ✨ Brobot — local development launcher
   Starts a persistent local MongoDB (no install required),
   then boots the dashboard. Usage:  npm run local
   ============================================================ */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB_DIR = path.join(ROOT, '.localdb');
const MONGOMEM_DIR = process.env.MONGOMS_DOWNLOAD_DIR || path.join(os.homedir(), '.brobot-mongodb');
const MONGOD_VERSION = '8.2.6';

process.env.MONGOMS_DOWNLOAD_DIR = MONGOMEM_DIR;
process.chdir(ROOT);

const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  fs.mkdirSync(DB_DIR, { recursive: true });
  fs.mkdirSync(MONGOMEM_DIR, { recursive: true });

  const mongod = await MongoMemoryServer.create({
    binary: { version: MONGOD_VERSION },
    instance: {
      dbName: 'brobot',
      dbPath: DB_DIR,
      storageEngine: 'wiredTiger'
    }
  });

  const uri = mongod.getUri('brobot');
  process.env.MONGODB_URI = uri;

  require(path.join(ROOT, 'dashboard', 'server.js'));

  const port = process.env.PORT || 3000;
  console.log('[local] MongoDB ready      ' + uri);
  console.log('[local] Dashboard running  http://localhost:' + port);
  console.log('[local] Press Ctrl+C to stop');

  const stop = async () => {
    console.log('\n[local] shutting down...');
    try { await mongod.stop(); } catch (e) { /* ignore */ }
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
})().catch((err) => {
  console.error('[local] failed to start:', err);
  process.exit(1);
});
