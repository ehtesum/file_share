const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocket = require('ws');
const { server, generateAlias, MIME_TYPES } = require('../server');

describe('FileShare Server & Signaling', () => {
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

  test('generateAlias should return two-word string', () => {
    const alias = generateAlias();
    assert.equal(typeof alias, 'string');
    const parts = alias.split(' ');
    assert.equal(parts.length, 2);
    assert.ok(parts[0].length > 0);
    assert.ok(parts[1].length > 0);
  });

  test('MIME_TYPES dictionary contains required web asset types', () => {
    assert.equal(MIME_TYPES['.html'], 'text/html');
    assert.equal(MIME_TYPES['.css'], 'text/css');
    assert.equal(MIME_TYPES['.js'], 'application/javascript');
  });

  test('HTTP static file handler returns index.html', async () => {
    const res = await new Promise((resolve) => {
      http.get(`http://localhost:${port}/`, resolve);
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'text/html');
  });

  test('HTTP static file handler returns 404 for nonexistent files', async () => {
    const res = await new Promise((resolve) => {
      http.get(`http://localhost:${port}/nonexistent-page-xyz.html`, resolve);
    });
    assert.equal(res.statusCode, 404);
  });

  test('WebSocket peer connection gets init message with peer identity', async () => {
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      ws.on('error', reject);
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'init') {
            assert.ok(msg.peer.id);
            assert.ok(msg.peer.alias);
            assert.ok(Array.isArray(msg.peers));
            ws.close();
            resolve();
          }
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  test('WebSocket peer signaling between two clients', async () => {
    await new Promise((resolve, reject) => {
      const ws1 = new WebSocket(`ws://localhost:${port}`);
      let ws2 = null;

      ws1.on('error', reject);
      ws1.on('message', (raw1) => {
        try {
          const msg1 = JSON.parse(raw1.toString());
          if (msg1.type === 'init') {
            const peer1Info = msg1.peer;

            ws2 = new WebSocket(`ws://localhost:${port}`);
            ws2.on('error', reject);

            ws2.on('message', (raw2) => {
              const msg2 = JSON.parse(raw2.toString());
              if (msg2.type === 'init') {
                ws2.send(JSON.stringify({
                  type: 'signal',
                  targetId: peer1Info.id,
                  candidate: { candidate: 'candidate:dummy' }
                }));
              }
            });

            ws1.on('message', (incoming) => {
              const signal = JSON.parse(incoming.toString());
              if (signal.type === 'signal' && signal.candidate) {
                assert.equal(signal.candidate.candidate, 'candidate:dummy');
                ws1.close();
                ws2.close();
                resolve();
              }
            });
          }
        } catch (e) {
          reject(e);
        }
      });
    });
  });
});
