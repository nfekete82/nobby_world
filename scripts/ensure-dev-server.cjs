/**
 * Start the RPG-JS/Vite preview only if no Nobby World server is already
 * available on 127.0.0.1:5173. Leave user-started servers untouched.
 */
const { spawn, spawnSync } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');
const { join } = require('node:path');
const http = require('node:http');

const ADDRESS = 'http://127.0.0.1:5173/';

// Node 25 on macOS can crash inside undici's socket.setTypeOfService()
// even when a fetch rejection is caught. Use Node's HTTP client here.
async function isReady() {
  const response = await new Promise(resolve => {
    let settled = false;
    const finish = value => { if (!settled) { settled = true; resolve(value); } };
    const request = http.get(ADDRESS, { timeout: 1500, agent: false }, res => {
      let html = '';
      res.on('data', chunk => {
        html += chunk.toString();
        if (html.length > 50000) request.destroy();
      });
      res.on('end', () => finish({ ok: res.statusCode === 200, html }));
      res.on('error', () => finish(null));
    });
    request.on('error', () => finish(null));
    request.on('timeout', () => { request.destroy(); finish(null); });
  });
  if (!response || !response.ok) return false;
  if (!response.html.includes('Nobby World')) {
    throw new Error('Port 5173 is occupied by another application, not Nobby World.');
  }
  return true;
}

module.exports = async function ensureDevServer() {
  if (await isReady()) {
    console.log('Using existing Nobby World development server on port 5173.');
    return async () => {};
  }

  const result = spawnSync(process.execPath, ['scripts/world-data.mjs'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error('Failed to generate the Tiled world data before starting Vite.');
  }

  const child = spawn(
    process.execPath,
    [join(process.cwd(), 'node_modules/vite/bin/vite.js'),
      '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
    { cwd: process.cwd(), stdio: 'inherit' },
  );
  let exited = false;
  let spawnError;
  child.once('error', (error) => { spawnError = error; });
  child.once('exit', () => { exited = true; });
  const stop = async () => {
    if (exited || !child.pid) return;
    child.kill('SIGTERM');
    for (let i = 0; i < 30 && !exited; i++) await sleep(100);
    if (!exited) child.kill('SIGKILL');
  };

  try {
    for (let i = 0; i < 150; i++) {
      if (spawnError) throw spawnError;
      if (exited) throw new Error('Vite stopped before the visual review could start.');
      if (await isReady()) {
        console.log('Nobby World test preview is ready on port 5173.');
        return stop;
      }
      await sleep(100);
    }
    throw new Error('Timed out starting Vite for the visual review (port 5173).');
  } catch (error) {
    await stop();
    throw error;
  }
};
