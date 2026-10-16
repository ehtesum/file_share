const CHUNK_SIZE = 64 * 1024; // 64 KB slices
const BUFFER_THRESHOLD = 256 * 1024; // 256 KB backpressure limit

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

class FileShareApp {
  constructor() {
    this.myPeer = null;
    this.peers = new Map(); // id -> { id, alias, pc, dataChannel }
    this.selectedPeerId = null;

    // Active transfer state
    this.currentTransfer = null;
    this.receivingFile = null;

    this.initDOM();
    this.connectSignaling();
  }

  initDOM() {
    this.statusDot = document.getElementById('statusDot');
    this.myAlias = document.getElementById('myAlias');
    this.peersGrid = document.getElementById('peersGrid');
    this.peerCount = document.getElementById('peerCount');
    this.emptyState = document.getElementById('emptyState');

    this.transferSection = document.getElementById('transferSection');
    this.transferFileName = document.getElementById('transferFileName');
    this.transferPercent = document.getElementById('transferPercent');
    this.progressBarFill = document.getElementById('progressBarFill');
    this.transferSize = document.getElementById('transferSize');
    this.transferRate = document.getElementById('transferRate');
    this.transferEta = document.getElementById('transferEta');

    this.textPayload = document.getElementById('textPayload');
    this.sendTextBtn = document.getElementById('sendTextBtn');
    this.filePicker = document.getElementById('filePicker');

    this.inboundModal = document.getElementById('inboundModal');
    this.inboundPeer = document.getElementById('inboundPeer');
    this.inboundName = document.getElementById('inboundName');
    this.inboundSize = document.getElementById('inboundSize');
    this.acceptBtn = document.getElementById('acceptBtn');
    this.declineBtn = document.getElementById('declineBtn');

    this.sendTextBtn.addEventListener('click', () => this.sendTextMessage());
    this.filePicker.addEventListener('change', (e) => this.handleFileSelect(e));
  }

  connectSignaling() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${location.host}`);

    this.ws.onopen = () => {
      this.statusDot.classList.add('online');
    };

    this.ws.onclose = () => {
      this.statusDot.classList.remove('online');
      this.myAlias.textContent = 'Disconnected. Reconnecting...';
      setTimeout(() => this.connectSignaling(), 3000);
    };

    this.ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'init':
          this.myPeer = msg.peer;
          this.myAlias.textContent = `You: ${this.myPeer.alias}`;
          msg.peers.forEach(p => this.addPeer(p));
          break;
        case 'peer-joined':
          this.addPeer(msg.peer);
          break;
        case 'peer-left':
          this.removePeer(msg.peerId);
          break;
        case 'signal':
          await this.handleSignal(msg);
          break;
      }
    };
  }

  addPeer(peer) {
    if (this.peers.has(peer.id)) return;
    this.peers.set(peer.id, { ...peer, pc: null, dataChannel: null });
    this.renderPeers();
  }

  removePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      if (peer.pc) peer.pc.close();
      this.peers.delete(peerId);
      if (this.selectedPeerId === peerId) {
        this.selectedPeerId = null;
        this.updateActionButtons();
      }
      this.renderPeers();
    }
  }

  renderPeers() {
    const peerList = Array.from(this.peers.values());
    this.peerCount.textContent = `${peerList.length} device${peerList.length === 1 ? '' : 's'} nearby`;

    if (peerList.length === 0) {
      this.emptyState.style.display = 'flex';
      this.peersGrid.innerHTML = '';
      this.peersGrid.appendChild(this.emptyState);
      return;
    }

    this.emptyState.style.display = 'none';
    this.peersGrid.innerHTML = '';

    peerList.forEach(peer => {
      const card = document.createElement('div');
      card.className = `peer-card ${this.selectedPeerId === peer.id ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="peer-avatar">💻</div>
        <div class="peer-name">${peer.alias}</div>
        <div class="peer-action-hint">Click to select / Drop file</div>
      `;

      card.addEventListener('click', () => {
        this.selectedPeerId = peer.id;
        this.renderPeers();
        this.updateActionButtons();
      });

      // Drag and drop directly onto peer card
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.style.borderColor = 'var(--accent)';
      });

      card.addEventListener('dragleave', () => {
        card.style.borderColor = '';
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.style.borderColor = '';
        this.selectedPeerId = peer.id;
        if (e.dataTransfer.files.length > 0) {
          this.startFileTransfer(peer.id, e.dataTransfer.files[0]);
        }
      });

      this.peersGrid.appendChild(card);
    });
  }

  updateActionButtons() {
    this.sendTextBtn.disabled = !this.selectedPeerId;
    if (this.selectedPeerId) {
      const peer = this.peers.get(this.selectedPeerId);
      this.sendTextBtn.textContent = `Send to ${peer?.alias || 'Peer'}`;
    } else {
      this.sendTextBtn.textContent = 'Select a peer first';
    }
  }

  getOrCreatePeerConnection(peerId, isInitiator = false) {
    const peer = this.peers.get(peerId);
    if (!peer) return null;

    if (peer.pc) return peer.pc;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peer.pc = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, { candidate: event.candidate });
      }
    };

    if (isInitiator) {
      const dc = pc.createDataChannel('fileShareChannel');
      this.setupDataChannel(peerId, dc);
      peer.dataChannel = dc;
    } else {
      pc.ondatachannel = (event) => {
        this.setupDataChannel(peerId, event.channel);
        peer.dataChannel = event.channel;
      };
    }

    return pc;
  }

  setupDataChannel(peerId, dc) {
    dc.binaryType = 'arraybuffer';

    dc.onopen = () => console.log(`DataChannel open with peer ${peerId}`);
    dc.onclose = () => console.log(`DataChannel closed with peer ${peerId}`);

    dc.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const payload = JSON.parse(event.data);
        if (payload.type === 'text') {
          alert(`Message from ${this.peers.get(peerId)?.alias || 'Peer'}:\n\n${payload.content}`);
        } else if (payload.type === 'file-header') {
          this.handleInboundFileHeader(peerId, payload);
        }
      } else {
        // Binary chunk
        this.handleInboundChunk(event.data);
      }
    };
  }

  sendSignal(targetId, signalData) {
    this.ws.send(JSON.stringify({
      type: 'signal',
      targetId,
      ...signalData
    }));
  }

  async handleSignal(msg) {
    const peerId = msg.senderId;
    const pc = this.getOrCreatePeerConnection(peerId, false);

    if (msg.description) {
      await pc.setRemoteDescription(new RTCSessionDescription(msg.description));
      if (msg.description.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignal(peerId, { description: pc.localDescription });
      }
    } else if (msg.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
  }

  async ensureDataChannel(peerId) {
    const peer = this.peers.get(peerId);
    if (peer?.dataChannel && peer.dataChannel.readyState === 'open') {
      return peer.dataChannel;
    }

    const pc = this.getOrCreatePeerConnection(peerId, true);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.sendSignal(peerId, { description: pc.localDescription });

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
          clearInterval(checkInterval);
          resolve(peer.dataChannel);
        }
      }, 100);
    });
  }

  async sendTextMessage() {
    const text = this.textPayload.value.trim();
    if (!text || !this.selectedPeerId) return;

    const dc = await this.ensureDataChannel(this.selectedPeerId);
    dc.send(JSON.stringify({ type: 'text', content: text }));
    this.textPayload.value = '';
  }

  async startFileTransfer(peerId, file) {
    this.showTransferUI(file.name, file.size);
    const dc = await this.ensureDataChannel(peerId);

    // Send file metadata header
    dc.send(JSON.stringify({
      type: 'file-header',
      name: file.name,
      size: file.size,
      mime: file.type || 'application/octet-stream'
    }));

    let offset = 0;
    const startTime = performance.now();

    const readSlice = (start) => {
      const slice = file.slice(start, start + CHUNK_SIZE);
      const reader = new FileReader();
      reader.onload = (e) => {
        dc.send(e.target.result);
        offset += e.target.result.byteLength;

        this.updateTransferProgress(offset, file.size, startTime);

        if (offset < file.size) {
          if (dc.bufferedAmount > BUFFER_THRESHOLD) {
            dc.onbufferedamountlow = () => {
              dc.onbufferedamountlow = null;
              readSlice(offset);
            };
          } else {
            readSlice(offset);
          }
        } else {
          setTimeout(() => {
            alert(`File "${file.name}" sent successfully!`);
            this.transferSection.style.display = 'none';
          }, 500);
        }
      };
      reader.readAsArrayBuffer(slice);
    };

    readSlice(0);
  }

  handleInboundFileHeader(peerId, header) {
    this.receivingFile = {
      peerId,
      name: header.name,
      size: header.size,
      mime: header.mime,
      chunks: [],
      receivedBytes: 0,
      startTime: performance.now()
    };

    this.showTransferUI(header.name, header.size);
  }

  handleInboundChunk(arrayBuffer) {
    if (!this.receivingFile) return;

    this.receivingFile.chunks.push(arrayBuffer);
    this.receivingFile.receivedBytes += arrayBuffer.byteLength;

    this.updateTransferProgress(
      this.receivingFile.receivedBytes,
      this.receivingFile.size,
      this.receivingFile.startTime
    );

    if (this.receivingFile.receivedBytes >= this.receivingFile.size) {
      // Assemble and trigger download
      const blob = new Blob(this.receivingFile.chunks, { type: this.receivingFile.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.receivingFile.name;
      a.click();
      URL.revokeObjectURL(url);

      setTimeout(() => {
        this.transferSection.style.display = 'none';
        this.receivingFile = null;
      }, 800);
    }
  }

  showTransferUI(fileName, totalSize) {
    this.transferSection.style.display = 'block';
    this.transferFileName.textContent = fileName;
    this.transferPercent.textContent = '0%';
    this.progressBarFill.style.width = '0%';
    this.transferSize.textContent = `0 / ${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
    this.transferRate.textContent = 'Starting...';
  }

  updateTransferProgress(current, total, startTime) {
    const percent = Math.min(100, Math.round((current / total) * 100));
    this.progressBarFill.style.width = `${percent}%`;
    this.transferPercent.textContent = `${percent}%`;

    const currentMB = (current / (1024 * 1024)).toFixed(1);
    const totalMB = (total / (1024 * 1024)).toFixed(1);
    this.transferSize.textContent = `${currentMB} / ${totalMB} MB`;

    const elapsedSeconds = (performance.now() - startTime) / 1000;
    if (elapsedSeconds > 0.2) {
      const mbps = (current / (1024 * 1024) / elapsedSeconds).toFixed(1);
      this.transferRate.textContent = `${mbps} MB/s`;

      const remainingBytes = total - current;
      const etaSeconds = Math.round(remainingBytes / (current / elapsedSeconds));
      this.transferEta.textContent = `ETA: ${etaSeconds}s`;
    }
  }

  handleFileSelect(e) {
    if (e.target.files.length > 0 && this.selectedPeerId) {
      this.startFileTransfer(this.selectedPeerId, e.target.files[0]);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new FileShareApp();
});
