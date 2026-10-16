# Project Work Definition (PWD) — FileShare

## 1. Executive Summary & Vision
FileShare is a zero-install, zero-cloud browser-to-browser peer-to-peer file and text transfer tool running purely on web standards (WebRTC DataChannels and WebSocket signaling). When you need to send a 2 GB video from your Windows PC to your friend's MacBook or an Android phone in the same room, uploading it to Google Drive or emailing yourself is slow, burns internet bandwidth, and risks privacy leaks. FileShare lets users open a local web page, instantly discover other devices on the same Wi-Fi network, and stream files directly device-to-device at full local network speeds.

---

## 2. Core Value Proposition
- **Direct P2P Streaming**: Files transfer directly between devices over local LAN at full Wi-Fi speeds (up to 50–100 MB/s), bypassing the internet entirely.
- **Zero File Size Limits**: Stream arbitrarily large files (4 GB+ ISOs, 4K video clips) using streaming chunk buffers without crashing browser memory.
- **End-to-End Encrypted**: WebRTC DataChannels are encrypted by default via DTLS/SCTP protocols.
- **Zero Account Registration**: Devices generate friendly random names (e.g. "Swift Falcon", "Silent Wolf") and automatically discover each other via lightweight local mDNS / WebSocket signaling.
- **Cross-Platform Everywhere**: Works seamlessly across Windows, macOS, Linux, iOS Safari, and Android Chrome.

---

## 3. Target User Personas
- **Students & Coworkers**: Transferring lecture notes, project archives, or software builds across mismatched operating systems in study rooms.
- **Photographers & Creators**: Moving raw camera files and video clips from laptop to phone without cloud compression.
- **Privacy-Minded Users**: Transferring sensitive PDFs and recovery keys without leaving digital paper trails on external servers.

---

## 4. MVP Feature Scope
1. Automatic local network peer discovery via a lightweight local Node.js signaling server.
2. Drag-and-drop file dropzone with real-time transfer progress bar (transfer speed, MB sent, ETA).
3. Text clipboard sender for instantaneous text snippet and link exchange.
4. Auto-accept file transfer toggle for trusted paired devices.
5. Desktop notification when an inbound transfer is completed.
