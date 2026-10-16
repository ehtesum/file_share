const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocket = require('ws');
const { server } = require('../server');

describe('FileShare Security Tests', () => {
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

  test('Path traversal attempts outside public directory are blocked with 403', async () => {
    const maliciousPaths = [
      '/../server.js',
      '/../../package.json',
      '/....//....//server.js',
      '/..\\..\\package.json',
    ];

    for (const p of maliciousPaths) {
      const res = await new Promise((resolve) => {
        http.get(`http://localhost:${port}${p}`, resolve);
      });
      // Traversal must be rejected (403 or 404) and never expose outside files (200)
      assert.notEqual(res.statusCode, 200, `Path traversal leaked file: ${p}`);
      assert.ok([403, 404].includes(res.statusCode));
    }
  });

  test('Malformed and non-JSON WebSocket payloads do not crash signaling server', async () => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise((resolve) => ws.on('open', resolve));

    // Send malformed non-JSON
    ws.send('NOT_JSON_AT_ALL {{{');
    ws.send(Buffer.from([0x00, 0xFF, 0xFE, 0xAA]));
    ws.send(JSON.stringify({ randomKey: 'noTarget' }));

    // Verify socket remains alive and responsive
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(ws.readyState, WebSocket.OPEN);
    ws.close();
  });
});
