# Design Specification (DESIGN) — FileShare

## 1. Visual Theme & Aesthetics
- **Theme**: Ambient Radar Network (Dark minimalist theme).
- **Primary Canvas**: Deep Navy (`#0A0E1A`), Card Surface (`#141B2D`).
- **Interactive Accents**: Pulse Cyan (`#00F2FE`), Electric Violet (`#4FACFE`).
- **Typography**: Space Grotesk for headings and peer handles, Inter for file details and transfer metrics.

---

## 2. Interface Layout & Interactions

### 2.1 The Radar Network View (`index.html`)
- **Center Node**: Your device representation ("You: Azure Falcon") with subtle radiating pulse rings.
- **Surrounding Satellite Nodes**: Nearby discovered devices floating dynamically. Each node displays:
  - Device icon (Laptop, Phone, Tablet based on User-Agent).
  - Assigned alias name.
  - Connection status badge (Connecting, Ready, Transferring).

### 2.2 Drag-and-Drop Interaction
- Dragging any file over a peer's avatar expands a drop ring with an animation.
- Releasing the file initiates immediate transfer with a circular radial progress bar surrounding the peer avatar.

### 2.3 Transfer Progress Modal
- Live stats HUD:
  - File Name & File Size (e.g. `recording_4k.mp4 (1.82 GB)`).
  - Instantaneous Speedometer (e.g. `48.2 MB/s`).
  - Progress percentage & Time Remaining (`72% — 14s remaining`).
  - Cancel transfer button.
