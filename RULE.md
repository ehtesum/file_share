# Engineering Rules & Guidelines (RULE) — FileShare

## 1. Zero-Cloud Relay Mandate
- **RULE-01: No File Payload on Signaling Server**: File bytes MUST flow exclusively through WebRTC DataChannels directly between browser endpoints. The signaling WebSocket server MUST NEVER receive or buffer file chunks.
- **RULE-02: Strict Link-Local Negotiation**: If both peers share the same public IP address, the ICE connection MUST prioritize host candidate pairs (`typ host`) to ensure traffic stays on the local Wi-Fi switch and does not loop through external WAN gateways.

---

## 2. Transfer Safety & Sanitization
- **RULE-03: Filename Sanitization**: Inbound filenames MUST be sanitized by stripping path traversal characters (`../`, `..\\`) and replacing reserved OS characters (`:`, `*`, `?`, `"`, `<`, `>`, `|`) before offering download.
- **RULE-04: Explicit Transfer Consent**: By default, the receiver MUST see an interactive prompt with the file name, size, and sender alias before receiving bytes, unless the sender is explicitly whitelisted.

---

## 3. Backpressure & Stability Rules
- **RULE-05: Backpressure Throttling**: Senders MUST pause chunk dispatch whenever `RTCDataChannel.bufferedAmount > 1048576` (1 MB) and resume only upon `bufferedamountlow` event to prevent browser memory exhaustion.
