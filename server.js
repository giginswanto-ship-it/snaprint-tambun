const http = require('http');
const fs = require('fs');
const path = require('path');
const SqlGenerator = require('./js/sql_generator.js');
const mariaDb = require('./js/mariadb_service.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(__dirname, 'data');
const DB_JSON_FILE = path.join(DATA_DIR, 'database.json');
const DB_JS_FILE = path.join(DATA_DIR, 'database.js');
const DB_SQL_FILE = path.join(DATA_DIR, 'database.sql');
const ROOT_SQL_FILE = path.join(PUBLIC_DIR, 'database.sql');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Active Server-Sent Events (SSE) client connections
const sseClients = new Set();

function broadcastDatabaseUpdate(data, source = 'server') {
  const payload = JSON.stringify({
    type: 'database_updated',
    source: source,
    timestamp: new Date().toISOString(),
    data: data
  });

  for (const client of sseClients) {
    client.write(`data: ${payload}\n\n`);
  }
}

// Helper to write database.json, database.js, and database.sql (backup on disk)
function saveDatabaseFiles(dataObj) {
  dataObj._lastUpdated = new Date().toISOString();
  const jsonStr = JSON.stringify(dataObj, null, 2);

  try {
    // 1. Write database.json
    fs.writeFileSync(DB_JSON_FILE, jsonStr, 'utf8');

    // 2. Write database.js wrapper (universal UMD)
    const jsStr = `// data/database.js - Embedded Live Database Wrapper\n(function(root) {\n  const dbData = ${jsonStr};\n  if (typeof module !== 'undefined' && module.exports) { module.exports = dbData; }\n  if (typeof window !== 'undefined') { window.LIVE_DATABASE = dbData; }\n  root.LIVE_DATABASE = dbData;\n})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);\n`;
    fs.writeFileSync(DB_JS_FILE, jsStr, 'utf8');

    // 3. Auto-generate and sync database.sql
    const sqlStr = SqlGenerator.generateSqlDump(dataObj);
    fs.writeFileSync(ROOT_SQL_FILE, sqlStr, 'utf8');
    fs.writeFileSync(DB_SQL_FILE, sqlStr, 'utf8');
  } catch (err) {
    console.error('Error writing file backups:', err);
  }
}

// Helper to read database from file
function readDatabase() {
  if (fs.existsSync(DB_JSON_FILE)) {
    try {
      const raw = fs.readFileSync(DB_JSON_FILE, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading database.json:', e);
    }
  }
  return null;
}

// Watch data/database.json for external file modifications
let watchDebounce = null;
try {
  fs.watch(DATA_DIR, (eventType, filename) => {
    if (filename === 'database.json') {
      clearTimeout(watchDebounce);
      watchDebounce = setTimeout(async () => {
        const currentData = readDatabase();
        if (currentData) {
          console.log(`[LIVE SYNC] Perubahan terdeteksi pada ${filename}, memperbarui klien...`);
          // Also sync to MariaDB if connected
          try {
            const isConn = await mariaDb.checkConnection();
            if (isConn) {
              await mariaDb.saveDatabaseToMariaDB(currentData);
            }
          } catch (e) {
            console.warn('Sync disk change to MariaDB failed:', e.message);
          }
          broadcastDatabaseUpdate(currentData, 'disk_change');
        }
      }, 250);
    }
  });
} catch (e) {
  console.warn('Watch warning:', e.message);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.sql': 'application/sql; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // SSE Live Stream Endpoint
  if (pathname === '/api/database/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // Database Connection Status Endpoint
  if (pathname === '/api/database/status' && req.method === 'GET') {
    const isConn = await mariaDb.checkConnection();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      connected: isConn,
      engine: 'MariaDB 10.4',
      host: mariaDb.DB_CONFIG.host,
      port: mariaDb.DB_CONFIG.port,
      database: mariaDb.DB_CONFIG.database,
      tableCount: 12,
      viewCount: 3,
      time: new Date().toISOString()
    }));
    return;
  }

  // SQL Dump REST API Endpoint
  if (pathname === '/api/database/sql' || pathname === '/api/export-sql') {
    let db = null;
    try {
      const isConn = await mariaDb.checkConnection();
      if (isConn) {
        db = await mariaDb.getDatabaseFromMariaDB();
      }
    } catch (e) {
      console.warn('Fetch from MariaDB for SQL dump failed:', e.message);
    }

    if (!db) {
      db = readDatabase();
    }

    if (db) {
      try {
        const sqlContent = SqlGenerator.generateSqlDump(db);
        res.writeHead(200, {
          'Content-Type': 'application/sql; charset=utf-8',
          'Content-Disposition': 'attachment; filename="database.sql"'
        });
        res.end(sqlContent);
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to generate SQL dump', message: e.message }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Database not found' }));
    }
    return;
  }

  // Database REST API Endpoints
  if (pathname === '/api/database' || pathname === '/api/state') {
    if (req.method === 'GET') {
      let db = null;
      let fromMariaDB = false;

      // 1. Try MariaDB directly first
      try {
        const isConn = await mariaDb.checkConnection();
        if (isConn) {
          db = await mariaDb.getDatabaseFromMariaDB();
          fromMariaDB = true;
        }
      } catch (e) {
        console.warn('Query MariaDB failed, fallback to JSON:', e.message);
      }

      // 2. Fallback to file database
      if (!db) {
        db = readDatabase();
      }

      if (db) {
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'X-Database-Engine': fromMariaDB ? 'MariaDB-10.4' : 'JSON-File'
        });
        res.end(JSON.stringify(db));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Database not found' }));
      }
      return;
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          let savedToMariaDB = false;

          // 1. Save to MariaDB directly via SQL
          try {
            const isConn = await mariaDb.checkConnection();
            if (isConn) {
              await mariaDb.saveDatabaseToMariaDB(parsed);
              savedToMariaDB = true;
              console.log('✅ Perubahan berhasil disimpan langsung ke tabel MariaDB (rab_snaprint)');
            }
          } catch (e) {
            console.error('❌ Gagal menyimpan ke MariaDB:', e.message);
          }

          // 2. Always sync disk backups
          saveDatabaseFiles(parsed);

          // 3. Broadcast to all clients
          broadcastDatabaseUpdate(parsed, savedToMariaDB ? 'mariadb' : 'client_post');

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'success',
            message: savedToMariaDB 
              ? 'Database MariaDB & file backup berhasil diperbarui'
              : 'File backup diperbarui (MariaDB tidak terjangkau)',
            engine: savedToMariaDB ? 'MariaDB 10.4' : 'File JSON',
            timestamp: new Date().toISOString()
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON payload', message: e.message }));
        }
      });
      return;
    }
  }

  // Static File Serving
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  if (pathname === '/portal' || pathname === '/login') {
    reqPath = '/portal.html';
  }
  let safePath = path.normalize(path.join(PUBLIC_DIR, reqPath));

  // Path traversal protection
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  });
});

server.listen(PORT, async () => {
  console.log(`================================================================`);
  console.log(`🟢 SNAPRINT DIGITAL PRINTING - LIVE DATABASE SYSTEM AKTIF`);
  console.log(`   URL Aplikasi      : http://localhost:${PORT}`);
  
  const isConn = await mariaDb.checkConnection();
  if (isConn) {
    console.log(`   🔌 MariaDB SQL    : TERHUBUNG LANGSUNG`);
    console.log(`      Host / Port    : ${mariaDb.DB_CONFIG.host}:${mariaDb.DB_CONFIG.port}`);
    console.log(`      Database       : ${mariaDb.DB_CONFIG.database} (12 Tabel, 3 Views)`);
  } else {
    console.log(`   ⚠️ MariaDB SQL    : Terputus / Menggunakan File Backup`);
  }

  console.log(`   💾 Backup File    : ${DB_JSON_FILE}`);
  console.log(`   📄 Backup SQL     : ${ROOT_SQL_FILE}`);
  console.log(`   🔄 Sinkronisasi   : Real-time SSE Stream & File Watcher Aktif`);
  console.log(`   Tekan Ctrl + C untuk menghentikan server`);
  console.log(`================================================================`);
});
