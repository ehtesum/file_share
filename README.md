# FileShare ⚡

> Direct browser-to-browser P2P file and text transfer over local Wi-Fi using WebRTC DataChannels—zero cloud uploads, zero size limits.

AirDrop is fantastic, but only if everyone in the room has an Apple device. If you're on a Windows workstation and need to send a 3 GB video file or a folder of high-res photos to an Android tablet or a Linux laptop sitting 2 feet away, your options are depressing: upload it to Google Drive (waiting 15 minutes on slow ISP upload bandwidth), email it in pieces, or go hunt for a USB flash drive.

**FileShare** solves this. You run a lightweight signaling server (or open the local URL), open the page on any device connected to the same Wi-Fi, and your devices discover each other instantly. Drop a file onto the peer's card, and it streams directly device-to-device through encrypted WebRTC DataChannels at full local router speeds.

---

## Highlights

- 🚀 **Full Local Network Speeds**: Bypasses the internet. Transfers flow directly over your local Wi-Fi or Ethernet switch at 30–90+ MB/s.
- 📦 **Zero File Size Limits**: Files are sliced and streamed in 64 KB binary chunks with active backpressure monitoring (`bufferedAmountLow`), preventing browser tab memory crashes even with multi-gigabyte files.
- 🔒 **End-to-End Encrypted**: WebRTC DataChannels natively enforce DTLS (Datagram Transport Layer Security) encryption. No intermediary or server can read your bytes.
- 🏷️ **Automatic Peer Discovery**: Every connected device gets assigned a friendly pseudonym (like *Swift Falcon* or *Cosmic Wolf*).
- 📋 **Instant Clipboard / Text Sharing**: Send URLs, API tokens, or code snippets directly across devices without needing chat apps.

---

## How It Works

```
Device A (Laptop)                                     Device B (Phone)
      │                                                     │
      ├─── 1. Connect WebSocket to Signaling Server ────────┤
      │    (Exchange SDP Offer / Answer & ICE Candidates)   │
      │                                                     │
      ▼                                                     ▼
┌─────────────────────────────────────────────────────────────┐
│       Direct P2P WebRTC DataChannel (Encrypted DTLS)        │
│       ──────────────────────────────────────────────        │
│       64 KB Chunks Streamed Device-to-Device via LAN        │
└─────────────────────────────────────────────────────────────┘
```

The WebSocket server only brokers the initial handshake (signaling). Once the WebRTC peer connection is established, all file data transfers directly between the two browsers.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Vanilla JavaScript (ES2022), HTML5, CSS3 (No framework bloat) |
| **P2P Protocol** | WebRTC `RTCDataChannel` (BinaryType: `arraybuffer`) |
| **Signaling Server** | Node.js with native `http` and lightweight `ws` WebSocket library |
| **Security** | Path traversal sanitization, DTLS/SCTP encryption |
| **Testing** | Node.js native test runner (`node:test`) + `node:assert` |

---

## Quickstart

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-username/file_share.git
cd file_share

# Install WebSocket dependency
npm install
```

### 2. Run the Server

```bash
# Start server (defaults to port 3000)
npm start
```

### 3. Connect Devices

Open `http://localhost:3000` on your host computer, or `http://<your-local-ip>:3000` (e.g. `http://192.168.1.100:3000`) on your phone or other computers on the same network.

1. You will see other devices appear as peer cards on the grid.
2. Click on a peer to select them.
3. Drag and drop any file onto their card, or pick a file using the file selector.
4. Watch the real-time transfer progress bar, transfer rate (MB/s), and ETA.

---

## Testing

The project includes an automated test suite executed with Node's native test runner:

```bash
npm test
```

Test suites verify:
- **Signaling & Handshake**: WebSocket connection, identity assignment, and signal forwarding.
- **Security & Path Traversal**: Blocks traversal attacks (`/../server.js`, `/../../package.json`) with HTTP 403.
- **Malformed Payloads**: Fuzzing with non-JSON strings and raw buffers without server crash.
- **Concurrency & Stress**: Spawns 20 concurrent peer connections joining and disconnecting simultaneously.

---

## Known Limitations

1. **Symmetric NAT / Cellular Connections**: When devices are on different networks or behind restrictive corporate NATs without a configured TURN relay, direct P2P connections cannot be established (relies on STUN on standard home Wi-Fi).
2. **Tab Inactivity Throttling**: Some mobile browsers (particularly iOS Safari) aggressively throttle WebRTC JavaScript when the screen locks or when switching tabs during an active transfer.
3. **No Resumable Uploads**: If the connection breaks mid-transfer on a 10 GB file, the transfer must currently be restarted from byte 0.

---

## Future Work & Roadmap

- [ ] **Chunk Checksum & Automatic Resume**: Implement chunk-level Blake3 or SHA-256 hashing to resume interrupted transfers where they left off.
- [ ] **Folder / Multi-File Drag-and-Drop**: Stream zipped tarballs or folder trees directly using the Web Streams API.
- [ ] **Local mDNS Auto-Announce**: Announce the web server over Bonjour / Zeroconf so devices can type `http://fileshare.local`.
- [ ] **Optional TURN Server Fallback**: Add turn server configuration support in `server.js` for transfers across differing subnets.

---

## License

MIT License. Crafted for friction-free local data transfers.
