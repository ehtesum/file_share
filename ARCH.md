# Architecture Specification (ARCH) — FileShare

## 1. High-Level System Architecture

```
+--------------------------------------------------------------------------+
|                       Browser A (Sender Device)                          |
|         [Radar View UI] ──▶ [File Slicer (64KB)] ──▶ [WebRTC RTCDataChannel]
+--------------------------------------------------------------------------+
                                     │ (P2P Binary UDP / DTLS)
                                     ▼
+--------------------------------------------------------------------------+
|                      Browser B (Receiver Device)                         |
|         [WebRTC RTCDataChannel] ──▶ [Chunk Assembler] ──▶ [Disk Stream]  |
+--------------------------------------------------------------------------+
             ▲                                              ▲
             │                                              │
             └─────────────┬──────────────────┬─────────────┘
                           │                  │
                           │ WebSocket        │ WebSocket
                           │ SDP/ICE Signals  │ SDP/ICE Signals
                           ▼                  ▼
+--------------------------------------------------------------------------+
|                  Lightweight Node.js Signaling Server                    |
|                (Ephemeral in-memory room & peer matching)                |
+--------------------------------------------------------------------------+
```

---

## 2. Connection & Transfer Sequence

```
1. Browser A & B open page -> Connect to Signaling Server via WebSocket
2. Signaling Server assigns random aliases and matches peers on same subnet
3. Browser A initiates WebRTC Offer (SDP) -> Server relays to Browser B
4. Browser B generates WebRTC Answer (SDP) -> Server relays to Browser A
5. Direct ICE candidate exchange establishes local LAN connection
6. Direct P2P RTCDataChannel opens (Signaling server is no longer involved)
7. Browser A drags file:
   - Reads 64KB slice from disk
   - Sends binary chunk over DataChannel
   - Listens to `bufferedAmount` backpressure
8. Browser B receives chunks:
   - Writes directly to FileSystemWritableFileStream
   - Updates progress percentage on UI
9. Transfer completes -> Triggers browser download prompt / completion chime
```
