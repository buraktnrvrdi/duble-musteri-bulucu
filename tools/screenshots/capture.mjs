// README ekran görüntülerini otomatik üretir.
//
//   node tools/screenshots/capture.mjs [uygulama-ikilisi]
//
// Ne yapar?
//   1. Sahte Overpass + sahte işletme siteleri sunucusunu başlatır (tamamen kurgusal veri).
//   2. Uygulamayı GEÇİCİ bir kullanıcı veri klasörüyle başlatır (gerçek kayıtlarına dokunmaz).
//   3. Chrome DevTools Protocol ile arayüzü sürer: arama → zenginleştirme → kaydet → durumlar → düzenle → ayarlar.
//   4. docs/screenshots/ altına PNG'leri yazar.
//
// Gereksinim: Node 22+ (yerleşik WebSocket/fetch). Ek bağımlılık yoktur.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMock, PORT } from './mock-server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const OUT = path.join(root, 'docs', 'screenshots');
const DEBUG_PORT = 9333;

const APP_BIN =
  process.argv[2] ||
  process.env.APP_BIN ||
  path.join(root, 'release', 'Duble Musteri Bulucu.app', 'Contents', 'MacOS', 'Duble Musteri Bulucu');

if (!fs.existsSync(APP_BIN)) {
  console.error(`Uygulama ikilisi bulunamadı: ${APP_BIN}\nYol vermek için: node tools/screenshots/capture.mjs <yol>`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'dmb-shots-'));
fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify({ endpoints: [`http://127.0.0.1:${PORT}/api`] }));

const mock = await startMock();
const app = spawn(APP_BIN, [`--user-data-dir=${userData}`, `--remote-debugging-port=${DEBUG_PORT}`], { stdio: 'ignore' });
const cleanup = () => { try { app.kill(); } catch {} try { mock.close(); } catch {} fs.rmSync(userData, { recursive: true, force: true }); };
process.on('exit', cleanup);

// --- CDP bağlantısı ---------------------------------------------------------
let target;
for (let i = 0; i < 40 && !target; i++) {
  try { target = (await (await fetch(`http://localhost:${DEBUG_PORT}/json`)).json()).find((t) => t.type === 'page'); } catch {}
  if (!target) await sleep(500);
}
if (!target) { console.error('Uygulama penceresine bağlanılamadı.'); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let msgId = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id); };
const cdp = (method, params = {}) => new Promise((res) => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const run = async (expr) => {
  const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'js hatası');
  return r.result?.result?.value;
};

// Sayfa içi yardımcılar (React kontrollü alanlar için yerel setter + olay).
await run(`window.__h = {
  nativeSet(el, v) { const proto = el.tagName === 'SELECT' ? HTMLSelectElement : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, String(v));
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); },
  setCount(v) { this.nativeSet(document.querySelector('input[type=number]'), v); },
  city(name, on) { const cb = [...document.querySelectorAll('input[type=checkbox]')].find((c) => c.parentElement.innerText.trim() === name);
    if (!cb) throw new Error('il yok: ' + name); if (cb.checked !== on) cb.click(); },
  btn(text, nth = 0) { const bs = [...document.querySelectorAll('button')].filter((b) => b.innerText.trim().startsWith(text));
    if (!bs[nth]) throw new Error('düğme yok: ' + text); bs[nth].click(); },
  setStatuses(list) { const rows = [...document.querySelectorAll('select')].filter((s) => [...s.options].some((o) => o.text === 'Müşteri oldu') && s.options[0].text === 'Yeni');
    list.forEach((v, i) => rows[i] && this.nativeSet(rows[i], v)); },
}`);

async function shot(name, { width = 1440, height = 900, dpr = 1.5, scrollTop = 0 } = {}) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
  await sleep(350);
  await run(`window.scrollTo(0, ${scrollTop})`);
  await sleep(250);
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, name), Buffer.from(r.result.data, 'base64'));
  console.log('✓', name);
}
async function waitFor(expr, label, timeoutMs = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) { if (await run(expr)) return; await sleep(500); }
  throw new Error('zaman aşımı: ' + label);
}

try {
  await sleep(1000);

  // 1) Arama formu
  await run(`__h.btn('Arama'); __h.setCount(12)`);
  await shot('01-arama.png', { height: 880 });

  // 2) Arama + zenginleştirme (sahte Overpass; web siteleri gerçekten taranır)
  await run(`__h.btn('Araştır')`);
  await waitFor(`/Sonuçlar \\(12\\)/.test(document.body.innerText)`, 'sonuçlar');
  await shot('02-arama-ilerleme.png', { height: 1500, scrollTop: 0 });
  await waitFor(`!document.querySelector('.btn-primary.flex-1').disabled`, 'zenginleştirme bitişi');
  await shot('03-sonuclar.png', { width: 1680, height: 1500 });

  // 3) Kaydet → Kayıtlı İşletmeler
  await run(`__h.btn('Hepsini kaydet')`);
  await sleep(800);
  await run(`__h.btn('Kayıtlı İşletmeler')`);
  await sleep(800);
  await run(`__h.setStatuses(['Müşteri oldu','Mesaj atıldı','Cevap geldi','Demo gönderildi','Mesaj atıldı','Yeni','İlgilenmiyor','Cevap geldi','Yeni','Mesaj atıldı','Yeni','Demo gönderildi'])`);
  await sleep(600);
  await shot('04-kayitli-isletmeler.png', { width: 1680, height: 1250 });

  // 4) Kaydı düzenle
  await run(`__h.btn('Düzenle', 0)`);
  await sleep(700);
  await shot('05-kaydi-duzenle.png', { width: 1440, height: 1000 });
  await run(`__h.btn('Vazgeç')`);
  await sleep(300);

  // 5) Arama: elle yaz modu
  await run(`__h.btn('Arama'); __h.nativeSet(document.querySelector('select'), '__custom__')`);
  await sleep(500);
  await shot('06-elle-yaz.png', { height: 880 });

  // 6) Ayarlar (varsayılan uç noktalar görünsün diye yalnızca arayüzde sıfırlanır, kaydedilmez)
  await run(`__h.btn('Ayarlar'); __h.btn('Varsayılanlara dön', 0)`);
  await sleep(600);
  await shot('07-ayarlar.png', { width: 1440, height: 1700 });

  console.log('\nBitti →', OUT);
} catch (e) {
  console.error('Hata:', e.message);
  process.exitCode = 1;
} finally {
  ws.close();
  cleanup();
  process.exit(process.exitCode || 0);
}
