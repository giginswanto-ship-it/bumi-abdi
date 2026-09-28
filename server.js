const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const PORT = 8080;
const DB_FILE = path.join(__dirname, 'database', 'database.json');

// Ensure database directory exists
if (!fs.existsSync(path.join(__dirname, 'database'))) {
  fs.mkdirSync(path.join(__dirname, 'database'), { recursive: true });
}

// Connected SSE clients for dynamic real-time sync
const sseClients = [];

function broadcastSSE(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(payload);
    } catch (e) {
      // client disconnected
    }
  });
}

function readDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }
  return { restaurant: {}, categories: [], menu: [], orders: [] };
}

function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing to database file:', err);
    return false;
  }
}

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.sql': 'text/plain',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // CORS headers for multi-device Wi-Fi access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // --- 1. SERVER-SENT EVENTS (SSE) FOR REALTIME DYNAMIC PUSH ---
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('\n');
    
    const clientId = Date.now() + Math.random();
    const client = { id: clientId, res };
    sseClients.push(client);

    req.on('close', () => {
      const idx = sseClients.findIndex(c => c.id === clientId);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
    return;
  }

  // --- 2. GET FULL DATABASE ---
  if (pathname === '/api/database' && req.method === 'GET') {
    const db = readDatabase();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(db));
  }

  // --- 3. SAVE / SYNC ENTIRE DATABASE ---
  if (pathname === '/api/save-database' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        writeDatabase(payload);
        broadcastSSE('DATABASE_UPDATED', payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, message: 'Database saved' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // --- 4. CREATE / UPDATE ORDER DYNAMICALLY ---
  if (pathname === '/api/orders' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const newOrder = JSON.parse(body);
        const db = readDatabase();
        if (!db.orders) db.orders = [];
        
        const existingIdx = db.orders.findIndex(o => o.id === newOrder.id);
        if (existingIdx > -1) {
          db.orders[existingIdx] = newOrder;
        } else {
          db.orders.unshift(newOrder);
        }

        writeDatabase(db);
        broadcastSSE('ORDER_RECEIVED', newOrder);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, order: newOrder }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // --- 5. CALL WAITER NOTIFICATION ---
  if (pathname === '/api/call-waiter' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        broadcastSSE('WAITER_CALLED', data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  // --- 6. BACKUP DOWNLOAD ---
  if (pathname === '/api/backup-download' && req.method === 'GET') {
    const db = readDatabase();
    const filename = `backup_bumi_abdi_${new Date().toISOString().slice(0,10)}.json`;
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`
    });
    return res.end(JSON.stringify(db, null, 2));
  }

  // --- 7. STATIC ASSET SERVING ---
  let reqUrl = pathname === '/' || pathname === '' ? '/index.html' : pathname;
  const filePath = path.join(__dirname, reqUrl);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  const localIp = getLocalIp();
  console.log('================================================================');
  console.log('  🌟 APLIKASI KASIR DINAMIS - AYAM GORENG KAMPUNG BUMI ABDI 🌟');
  console.log('  Tagline: Asli. Gurih. Berkah.');
  console.log('================================================================');
  console.log(`[*] Mode Aplikasi       : Full Dynamic Real-Time Server & PWA`);
  console.log(`[*] File Database Fisik : database/database.json`);
  console.log(`[*] Layar Kasir Desktop : http://localhost:${PORT}`);
  console.log(`[*] Akses HP di Wi-Fi   : http://${localIp}:${PORT}`);
  console.log(`[*] Scan Menu Meja 1    : http://${localIp}:${PORT}/order.html?table=Meja%2001`);
  console.log('================================================================');
  console.log('Tekan Ctrl + C untuk keluar.\n');

  // Auto-launch in app mode with Chrome / Edge or default browser
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    // Try launching as standalone app window in Edge or Chrome
    exec(`start msedge --app=http://localhost:${PORT}`, (err) => {
      if (err) {
        exec(`start chrome --app=http://localhost:${PORT}`, (err2) => {
          if (err2) {
            exec(`start http://localhost:${PORT}`);
          }
        });
      }
    });
  } else {
    exec(`xdg-open http://localhost:${PORT}`);
  }
});
