# Database & State Specification (DATABASE) — FileShare

## 1. Storage Architecture
- **Zero Central Storage Mandate**: The signaling server maintains zero persistent databases, storing only ephemeral socket IDs in RAM.
- **Client-Side State**: Browser `IndexedDB` or `localStorage` is used strictly to retain:
  - User's preferred device alias (`fileshare:device_name`).
  - Auto-accept peer whitelist (`fileshare:trusted_peers`).
  - Recent transfer history logs (filename, size, peer, timestamp).

---

## 2. In-Memory Signaling Data Structures (Node.js)

```javascript
// Server-side ephemeral state in RAM
const rooms = new Map(); // roomId -> Set of socket connections

interface PeerSession {
  socketId: string;
  alias: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  room: string;
  connectedAt: number;
}
```

---

## 3. Client-Side Transfer History Schema (IndexedDB)

```javascript
const DB_SCHEMA = {
  name: 'FileShareDB',
  version: 1,
  stores: {
    transfers: {
      keyPath: 'id',
      indices: ['timestamp', 'direction', 'peerAlias']
    }
  }
};

interface TransferRecord {
  id: string;              // UUID
  fileName: string;
  fileSizeBytes: number;
  direction: 'SENT' | 'RECEIVED';
  peerAlias: string;
  durationMs: number;
  timestamp: number;
}
```
