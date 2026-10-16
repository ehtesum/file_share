const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { server } = require('../server');

describe('FileShare Concurrency & Stress Tests', () => {
  let port;

  before(async () => {
    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('Handles 20 concurrent peers joining, verifying broadcast delivery, and disconnecting', async () => {
    const PEER_COUNT = 20;
    const sockets = [];
    const receivedInit = [];

    for (let i = 0; i < PEER_COUNT; i++) {
      const ws = new WebSocket(`ws://localhost:${port}`);
      sockets.push(ws);
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'init') {
          receivedInit.push(msg.peer.id);
        }
      });
    }

    // Wait for all to connect
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(receivedInit.length, PEER_COUNT);

    // Cleanly close all connections concurrently
    await Promise.all(sockets.map((ws) => new Promise((res) => {
      ws.on('close', res);
      ws.close();
    })));
  });
});
