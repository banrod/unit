import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const port = 4173;
const url = `http://127.0.0.1:${port}/`;
const failures = [];
const evidence = {};

const pass = (name, detail = '') => {
  evidence[name] = detail || true;
  console.log(`PASS ${name}${detail ? `: ${detail}` : ''}`);
};
const fail = (name, detail) => {
  evidence[name] = { pass: false, detail };
  failures.push(`${name}: ${detail}`);
  console.error(`FAIL ${name}: ${detail}`);
};
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function findChrome() {
  for (const candidate of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const probe = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (probe.status === 0 && probe.stdout.trim()) return probe.stdout.trim();
  }
  throw new Error('No supported Chromium/Chrome executable found');
}

async function pollJson(endpoint, timeoutMs = 10000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return response.json();
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw lastError || new Error(`Timed out waiting for ${endpoint}`);
}

function waitForDevToolsEndpoint(process, timeoutMs = 10000) {
  return new Promise((resolveEndpoint, rejectEndpoint) => {
    let stderr = '';
    let settled = false;

    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      process.stderr?.off('data', onData);
      process.off('exit', onExit);
      if (error) rejectEndpoint(error);
      else resolveEndpoint(value);
    };

    const onData = (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) finish(null, match[1]);
    };

    const onExit = (code, signal) => {
      const detail = stderr.trim().slice(-4000);
      finish(
        new Error(
          `Chromium exited before DevTools became ready (code=${code ?? 'null'}, signal=${signal ?? 'null'})${detail ? `\n${detail}` : ''}`
        )
      );
    };

    const timer = setTimeout(() => {
      const detail = stderr.trim().slice(-4000);
      finish(new Error(`Timed out waiting for Chromium DevTools endpoint${detail ? `\n${detail}` : ''}`));
    }, timeoutMs);

    process.stderr?.on('data', onData);
    process.once('exit', onExit);
  });
}

class Cdp {
  constructor(wsUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(wsUrl);
    this.ready = new Promise((resolveReady, rejectReady) => {
      this.socket.addEventListener('open', resolveReady, { once: true });
      this.socket.addEventListener('error', rejectReady, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result || {});
        return;
      }
      const queue = this.listeners.get(message.method);
      if (queue?.length) queue.shift()(message.params || {});
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    return new Promise((resolveSend, rejectSend) => {
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  wait(method, timeoutMs = 10000) {
    return new Promise((resolveWait, rejectWait) => {
      const timer = setTimeout(() => rejectWait(new Error(`Timed out waiting for ${method}`)), timeoutMs);
      const wrapped = (params) => {
        clearTimeout(timer);
        resolveWait(params);
      };
      const queue = this.listeners.get(method) || [];
      queue.push(wrapped);
      this.listeners.set(method, queue);
    });
  }

  close() {
    this.socket.close();
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
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key: keyValue,
    code,
    windowsVirtualKeyCode
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: keyValue,
    code,
    windowsVirtualKeyCode
  });
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
      return {
        r: channels[0] * 255,
        g: channels[1] * 255,
        b: channels[2] * 255,
        a: Number.isFinite(alpha) ? alpha : 1
      };
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
    if (!foreground || !background) return {
      selector,
      error: 'unparsed-color',
      foreground: getComputedStyle(element).color,
      background: getComputedStyle(element).backgroundColor
    };
    return { selector, ratio: ratio(foreground, background) };
  });
})()`;

let server;
let chrome;
let profile;
let cdp;

try {
  profile = await mkdtemp(join(tmpdir(), 'visionarybrains-chrome-'));
  server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const serverReady = await (async () => {
    const started = Date.now();
    while (Date.now() - started < 10000) {
      try {
        const response = await fetch(url);
        if (response.ok) return true;
      } catch {}
      await sleep(100);
    }
    return false;
  })();
  if (!serverReady) throw new Error('Local HTTP server did not become ready');

  const chromePath = findChrome();
  chrome = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const browserWsUrl = await waitForDevToolsEndpoint(chrome);
  const browserEndpoint = new URL(browserWsUrl);
  const cdpHttpBase = `${browserEndpoint.protocol === 'wss:' ? 'https:' : 'http:'}//${browserEndpoint.host}`;
  await pollJson(`${cdpHttpBase}/json/version`);
  const page = await fetch(`${cdpHttpBase}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }).then((response) => {
    if (!response.ok) throw new Error(`Unable to create Chromium target: ${response.status}`);
    return response.json();
  });

  cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: false
  });
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  });

  const loaded = await waitFor(
    cdp,
    `document.querySelector('#load-status')?.textContent.includes('loaded from integrated doctrine and teaching files')`
  );
  if (loaded) pass('browser:content-loading', 'integrated public-safe JSON rendered over local HTTP');
  else fail('browser:content-loading', 'integrated content did not reach the loaded state');

  const pathCount = await evaluate(cdp, `document.querySelectorAll('#visitor-paths .path-card').length`);
  if (pathCount >= 2) pass('browser:visitor-paths', `${pathCount} integrated learning paths rendered`);
  else fail('browser:visitor-paths', `expected at least 2 rendered paths, found ${pathCount}`);

  const narrow = await evaluate(cdp, `(() => ({
    toggle: getComputedStyle(document.querySelector('.nav-toggle')).display,
    nav: getComputedStyle(document.querySelector('#primary-nav')).display,
    columns: getComputedStyle(document.querySelector('#principle-list')).gridTemplateColumns
  }))()`);
  if (narrow.toggle !== 'none' && narrow.nav === 'none') pass('browser:responsive-narrow', JSON.stringify(narrow));
  else fail('browser:responsive-narrow', JSON.stringify(narrow));

  await evaluate(cdp, `document.querySelector('.nav-toggle').focus()`);
  await key(cdp, 'Enter', 'Enter', 13);
  const keyboardOpen = await evaluate(cdp, `(() => ({
    expanded: document.querySelector('.nav-toggle').getAttribute('aria-expanded'),
    navDisplay: getComputedStyle(document.querySelector('#primary-nav')).display,
    focused: document.activeElement === document.querySelector('.nav-toggle')
  }))()`);
  if (keyboardOpen.expanded === 'true' && keyboardOpen.navDisplay !== 'none' && keyboardOpen.focused) {
    pass('browser:keyboard-navigation', JSON.stringify(keyboardOpen));
  } else {
    fail('browser:keyboard-navigation', JSON.stringify(keyboardOpen));
  }

  const reducedMotion = await evaluate(cdp, `(() => ({
    media: matchMedia('(prefers-reduced-motion: reduce)').matches,
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    transitionDuration: getComputedStyle(document.querySelector('.nav-toggle')).transitionDuration
  }))()`);
  if (reducedMotion.media && reducedMotion.scrollBehavior === 'auto') pass('browser:reduced-motion', JSON.stringify(reducedMotion));
  else fail('browser:reduced-motion', JSON.stringify(reducedMotion));

  const contrasts = await evaluate(cdp, contrastExpression);
  const contrastFailures = contrasts.filter((entry) => entry.error || entry.ratio < 4.5);
  if (contrastFailures.length === 0) {
    pass('browser:contrast', contrasts.map((entry) => `${entry.selector}=${entry.ratio.toFixed(2)}`).join(', '));
  } else {
    fail('browser:contrast', JSON.stringify(contrastFailures));
  }

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  const wide = await evaluate(cdp, `(() => ({
    toggle: getComputedStyle(document.querySelector('.nav-toggle')).display,
    nav: getComputedStyle(document.querySelector('#primary-nav')).display,
    columns: getComputedStyle(document.querySelector('#principle-list')).gridTemplateColumns
  }))()`);
  if (wide.toggle === 'none' && wide.nav !== 'none' && wide.columns.split(' ').length >= 3) {
    pass('browser:responsive-wide', JSON.stringify(wide));
  } else {
    fail('browser:responsive-wide', JSON.stringify(wide));
  }
} catch (error) {
  fail('browser:harness', error.stack || error.message);
} finally {
  try { cdp?.close(); } catch {}
  chrome?.kill('SIGTERM');
  server?.kill('SIGTERM');
  if (profile) await rm(profile, { recursive: true, force: true });
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
