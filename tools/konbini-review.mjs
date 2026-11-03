// Local Chrome CDP helper. No browser automation dependency; uses Node's built-in WebSocket.
// Start a dedicated headless Chrome with --remote-debugging-port=9333, then:
// node tools/konbini-review.mjs 'JavaScript expression returning a serializable value'
const base = process.env.CITY_REVIEW_CDP ?? 'http://127.0.0.1:9333';
const targets = await (await fetch(`${base}/json/list`)).json();
const target = targets.find(t => t.type === 'page' && t.url.startsWith('http://127.0.0.1:5173')) ?? targets.find(t => t.type === 'page');
if (!target) throw new Error('No review page available');
const socket = new WebSocket(target.webSocketDebuggerUrl), pending = new Map(); let next = 0;
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
socket.addEventListener('message', ({ data }) => { const m = JSON.parse(data); if (pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  const expression = process.argv[2] === '--review' ? "import('/tools/konbini-browser-checks.mjs').then(m=>m.review())" : process.argv[2] ?? '({ready: !!window.__shinmachi, title: document.title})';
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 120000 });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  if (process.argv[2] === '--review') { const { writeFile } = await import('node:fs/promises'); await writeFile('quality/konbini-measurements.json', JSON.stringify(result.result.value, null, 2)+'\n'); }
  console.log(JSON.stringify(result.result.value, null, 2));
} finally { socket.close(); }
