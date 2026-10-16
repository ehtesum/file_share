# Requirements Specification (REQ) — FileShare

## 1. Functional Requirements (FR)

### FR-01: Peer Discovery & Ephemeral Handshake
- When a client connects, the signaling server MUST assign a randomized animal alias (e.g. "Crimson Tiger") and broadcast peer presence to the local network room.
- Clients MUST establish a direct `RTCPeerConnection` with an `RTCDataChannel` (ordered, binary mode).
- If STUN servers are unreachable, direct local LAN ICE candidates MUST be utilized.

### FR-02: Chunked File Streaming Pipeline
- Senders MUST slice files using the `File.slice()` API into 64 KB binary chunks.
- The sender MUST monitor the `dataChannel.bufferedAmount` backpressure buffer, pausing chunk dispatch when the buffer exceeds 1 MB and resuming on `bufferedamountlow` event.
- The receiver MUST assemble chunks using streaming `FileSystemWritableFileStream` (File System Access API) or fallback to in-memory Blob assembly.

### FR-03: Quick Text & Link Broadcast
- Users MUST be able to paste plain text snippets or URLs into an instant dispatch drawer.
- Text messages MUST appear immediately on the target peer's screen with a one-click "Copy to Clipboard" button.

---

## 2. Non-Functional Requirements (NFR)

### NFR-01: Transfer Speed & Throughput
- Transfer throughput on a standard 802.11ac 5 GHz Wi-Fi link MUST reach a minimum of 25 MB/s.
- CPU overhead during active 50 MB/s file transfers MUST remain under 15% on dual-core laptops.

### NFR-02: Memory Footprint
- Senders MUST stream files sequentially; reading a 5 GB file MUST NOT consume more than 50 MB of browser RAM.
