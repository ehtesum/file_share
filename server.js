const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url === '/' ? '/index.html' : req.url;
  reqPath = reqPath.split('?')[0];
  const filePath = path.resolve(PUBLIC_DIR, '.' + path.normalize(reqPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

const wss = new WebSocketServer({ server });

const ADJECTIVES = ['Swift', 'Silent', 'Cosmic', 'Amber', 'Brave', 'Golden', 'Shadow', 'Frost'];
const ANIMALS = ['Falcon', 'Wolf', 'Otter', 'Fox', 'Eagle', 'Tiger', 'Lynx', 'Panda'];

function generateAlias() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}

const peers = new Map(); // id -> { id, alias, ws }

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).substring(2, 8);
  const alias = generateAlias();

  const peerInfo = { id, alias };
  peers.set(id, { ...peerInfo, ws });

  // Send initial identity and list of existing peers
  const activePeers = Array.from(peers.values())
    .filter(p => p.id !== id)
    .map(p => ({ id: p.id, alias: p.alias }));

  ws.send(JSON.stringify({
    type: 'init',
    peer: peerInfo,
    peers: activePeers
  }));

  // Announce to other peers
  broadcast({ type: 'peer-joined', peer: peerInfo }, id);

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);
      if (data.targetId && peers.has(data.targetId)) {
        // Forward signal (offer, answer, candidate) directly to recipient
        peers.get(data.targetId).ws.send(JSON.stringify({
          ...data,
          senderId: id,
          senderAlias: alias
        }));
      }
    } catch (e) {
      console.error('Invalid message from peer', id, e.message);
    }
  });

  ws.on('close', () => {
    peers.delete(id);
    broadcast({ type: 'peer-left', peerId: id });
  });
});

function broadcast(msg, excludeId = null) {
  const str = JSON.stringify(msg);
  for (const [peerId, peer] of peers.entries()) {
    if (peerId !== excludeId && peer.ws.readyState === 1) {
      peer.ws.send(str);
    }
  }
}

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`📡 FileShare server running at http://localhost:${PORT}`);
  });
}

module.exports = { server, wss, generateAlias, broadcast, peers, MIME_TYPES };
