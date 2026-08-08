import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sitePort = 4173;
const siteUrl = `http://127.0.0.1:${sitePort}/`;
const failures = [];
const evidence = {};

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const pass = (name, detail = '') => {
  evidence[name] = detail || true;
  console.log(`PASS ${name}${detail ? `: ${detail}` : ''}`);
};
const fail = (name, detail) => {
  evidence[name] = { pass: false, detail };
  failures.push(`${name}: ${detail}`);
  console.error(`FAIL ${name}: ${detail}`);
};

function findChrome() {
  for (const candidate of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const probe = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (probe.status === 0 && probe.stdout.trim()) return probe.stdout.trim();
  }
  throw new Error('No supported Chromium/Chrome executable found');
}

async function pollOk(endpoint, timeoutMs = 10000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return true;
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw lastError || new Error(`Timed out waiting for ${endpoint}`);
}

class CdpPipe {
  constructor(writePipe, readPipe, timeoutMs = 10000) {
    this.writePipe = writePipe;
    this.readPipe = readPipe;
    this.timeoutMs = timeoutMs;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);

    readPipe.on('data', (chunk) => this.onData(chunk));
    readPipe.on('error', (error) => this.rejectAll(error));
    readPipe.on('close', () => this.rejectAll(new Error('Chromium DevTools pipe closed')));
    writePipe.on('error', (error) => this.rejectAll(error));
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let delimiter = this.buffer.indexOf(0);
    while (delimiter !== -1) {
      const frame = this.buffer.subarray(0, delimiter).toString('utf8');
      this.buffer = this.buffer.subarray(delimiter + 1);
      if (frame) this.onMessage(frame);
      delimiter = this.buffer.indexOf(0);
    }
  }

  onMessage(frame) {
    let message;
    try {
      message = JSON.parse(frame);
    } catch {
      return;
    }
    if (!message.id) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
    else pending.resolve(message.result || {});
  }

  rejectAll(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolveSend, rejectSend) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        rejectSend(new Error(`${method}: timed out waiting for Chromium DevTools pipe response`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend, method, timer });
      const message = { id, method, params };
      if (sessionId) message.sessionId = sessionId;
      this.writePipe.write(`${JSON.stringify(message)}\0`);
    });
  }

  close() {
    try { this.writePipe.end(); } catch {}
    try { this.readPipe.destroy(); } catch {}
  }
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed');
  return result.result?.value;
}

async function waitFor(cdp, expression, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(cdp, expression)) return true;
    await sleep(100);
  }
  return false;
}

async function key(cdp, keyValue, code, windowsVirtualKeyCode) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyValue, code, windowsVirtualKeyCode });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyValue, code, windowsVirtualKeyCode });
}

async function stopProcess(process) {
  if (!process || process.exitCode !== null) return;
  const exited = new Promise((resolveExit) => process.once('exit', resolveExit));
  process.kill('SIGTERM');
  await Promise.race([exited, sleep(2000)]);
  if (process.exitCode === null) {
    process.kill('SIGKILL');
    await Promise.race([exited, sleep(1000)]);
  }
}

const contrastExpression = `(() => {
  const parse = (value) => {
    const rgb = value.match(/rgba?\\(([^)]+)\\)/i);
    if (rgb) {
      const parts = rgb[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r: parts[0], g: parts[1], b: parts[2], a: Number.isFinite(parts[3]) ? parts[3] : 1 };
    }
    const srgb = value.match(/color\\(srgb\\s+([^)]+)\\)/i);
    if (srgb) {
      const [channelsPart, alphaPart] = srgb[1].split('/').map((part) => part.trim());
      const channels = channelsPart.split(/\\s+/).filter(Boolean).map(Number);
      if (channels.length < 3 || channels.some((channel) => !Number.isFinite(channel))) return null;
      const alpha = alphaPart === undefined ? 1 : Number(alphaPart);
      return { r: channels[0] * 255, g: channels[1] * 255, b: channels[2] * 255, a: Number.isFinite(alpha) ? alpha : 1 };
    }
    return null;
  };
  const luminance = ({ r, g, b }) => {
    const channel = (v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const ratio = (a, b) => {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const backgroundFor = (element) => {
    for (let node = element; node; node = node.parentElement) {
      const parsed = parse(getComputedStyle(node).backgroundColor);
      if (parsed && parsed.a > 0.98) return parsed;
    }
    return parse(getComputedStyle(document.body).backgroundColor);
  };
  const selectors = ['body', '#hero-summary', '.card p', '.path-audience', '.glossary-grid dd'];
  return selectors.map((selector) => {
    const element = document.querySelector(selector);
    if (!element) return { selector, error: 'missing' };
    const foreground = parse(getComputedStyle(element).color);
    const background = backgroundFor(element);
    if (!foreground || !background) return { selector, error: 'unparsed-color' };
    return { selector, ratio: ratio(foreground, background) };
  });
})()`;

let server;
let chrome;
let profile;
let cdp;
let pageCdp;
let chromeStderr = '';

try {
  profile = await mkdtemp(join(tmpdir(), 'visionarybrains-chrome-'));
  server = spawn('python3', ['-m', 'http.server', String(sitePort), '--bind', '127.0.0.1'], {
    cwd: root,
    stdio: ['ignore', 'ignore', 'pipe']
  });
  await pollOk(siteUrl);

  chrome = spawn(findChrome(), [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--remote-debugging-pipe',
    `--user-data-dir=${profile}`,
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
  chrome.stderr?.on('data', (chunk) => {
    chromeStderr = `${chromeStderr}${chunk.toString()}`.slice(-4000);
  });

  const pipeWrite = chrome.stdio[3];
  const pipeRead = chrome.stdio[4];
  if (!pipeWrite || !pipeRead) throw new Error('Chromium DevTools pipe descriptors were not created');
  cdp = new CdpPipe(pipeWrite, pipeRead);

  try {
    await cdp.send('Browser.getVersion');
  } catch (error) {
    throw new Error(`Chromium DevTools pipe readiness failed: ${error.message}${chromeStderr.trim() ? `\n${chromeStderr.trim()}` : ''}`);
  }

  const target = await cdp.send('Target.createTarget', { url: siteUrl });
  if (!target.targetId) throw new Error('Chromium DevTools did not return a targetId');
  const attached = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  if (!attached.sessionId) throw new Error('Chromium DevTools did not return a sessionId');
  pageCdp = {
    send(method, params = {}) {
      return cdp.send(method, params, attached.sessionId);
    }
  };

  await pageCdp.send('Page.enable');
  await pageCdp.send('Runtime.enable');
  await pageCdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await pageCdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });

  const loaded = await waitFor(pageCdp, `document.querySelector('#load-status')?.textContent.includes('loaded from integrated doctrine and teaching files')`);
  loaded ? pass('browser:content-loading', 'integrated public-safe JSON rendered over local HTTP') : fail('browser:content-loading', 'integrated content did not reach loaded state');

  const pathCount = await evaluate(pageCdp, `document.querySelectorAll('#visitor-paths .path-card').length`);
  pathCount >= 2 ? pass('browser:visitor-paths', `${pathCount} integrated learning paths rendered`) : fail('browser:visitor-paths', `expected at least 2 rendered paths, found ${pathCount}`);

  const narrow = await evaluate(pageCdp, `(() => ({toggle:getComputedStyle(document.querySelector('.nav-toggle')).display,nav:getComputedStyle(document.querySelector('#primary-nav')).display,columns:getComputedStyle(document.querySelector('#principle-list')).gridTemplateColumns}))()`);
  narrow.toggle !== 'none' && narrow.nav === 'none' ? pass('browser:responsive-narrow', JSON.stringify(narrow)) : fail('browser:responsive-narrow', JSON.stringify(narrow));

  await evaluate(pageCdp, `document.querySelector('.nav-toggle').focus()`);
  await key(pageCdp, ' ', 'Space', 32);
  const keyboardOpen = await evaluate(pageCdp, `(() => ({expanded:document.querySelector('.nav-toggle').getAttribute('aria-expanded'),navDisplay:getComputedStyle(document.querySelector('#primary-nav')).display,focused:document.activeElement===document.querySelector('.nav-toggle')}))()`);
  keyboardOpen.expanded === 'true' && keyboardOpen.navDisplay !== 'none' && keyboardOpen.focused
    ? pass('browser:keyboard-navigation', JSON.stringify(keyboardOpen))
    : fail('browser:keyboard-navigation', JSON.stringify(keyboardOpen));

  const reducedMotion = await evaluate(pageCdp, `(() => ({media:matchMedia('(prefers-reduced-motion: reduce)').matches,scrollBehavior:getComputedStyle(document.documentElement).scrollBehavior}))()`);
  reducedMotion.media && reducedMotion.scrollBehavior === 'auto'
    ? pass('browser:reduced-motion', JSON.stringify(reducedMotion))
    : fail('browser:reduced-motion', JSON.stringify(reducedMotion));

  const contrasts = await evaluate(pageCdp, contrastExpression);
  const contrastFailures = contrasts.filter((entry) => entry.error || entry.ratio < 4.5);
  contrastFailures.length === 0
    ? pass('browser:contrast', contrasts.map((entry) => `${entry.selector}=${entry.ratio.toFixed(2)}`).join(', '))
    : fail('browser:contrast', JSON.stringify(contrastFailures));

  await pageCdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const wide = await evaluate(pageCdp, `(() => ({toggle:getComputedStyle(document.querySelector('.nav-toggle')).display,nav:getComputedStyle(document.querySelector('#primary-nav')).display,columns:getComputedStyle(document.querySelector('#principle-list')).gridTemplateColumns}))()`);
  wide.toggle === 'none' && wide.nav !== 'none' && wide.columns.split(' ').length >= 3
    ? pass('browser:responsive-wide', JSON.stringify(wide))
    : fail('browser:responsive-wide', JSON.stringify(wide));
} catch (error) {
  fail('browser:harness', error.stack || error.message);
} finally {
  try { cdp?.close(); } catch {}
  await stopProcess(chrome);
  await stopProcess(server);
  if (profile) await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
}

console.log(`\nBROWSER_QUALIFICATION_EVIDENCE ${JSON.stringify(evidence)}`);
if (failures.length) {
  for (const failure of failures) {
    const annotation = failure.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    console.error(`::error title=VisionaryBrains browser qualification::${annotation}`);
  }
  console.error(`\n${failures.length} browser qualification failure(s).`);
  process.exit(1);
}
console.log('\nPASS visionarybrains browser qualification');
