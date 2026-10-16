# Memory & Performance Specification (MEMORY) — FileShare

## 1. Browser RAM Sizing & Heap Strategy
- **Idle Memory Footprint**: Under 18 MB JS heap.
- **Active Streaming Footprint**: Under 45 MB JS heap during a continuous 10 GB file transfer.

---

## 2. Chunk Slicing & Garbage Collection
- **ArrayBuffer Recycling**: File chunks are read using `FileReader.readAsArrayBuffer()` in discrete 64 KB slices.
- **Disk Streaming via File System Access API**: On supporting browsers (Chrome, Edge), inbound chunks pipe directly into a `FileSystemWritableFileStream` writing to disk in real time, eliminating the need to accumulate gigabytes of binary chunks in a giant RAM Blob.
- **Blob Fallback Cap**: On browsers lacking the File System Access API (e.g. mobile Safari), incoming file size is capped at 1.5 GB to prevent mobile WebKit tab crashes from memory eviction.
