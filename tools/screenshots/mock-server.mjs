// Ekran görüntüleri için sahte (tamamen kurgusal) Overpass + işletme web siteleri sunucusu.
// Gerçek kişi/işletme verisi içermez; telefonlar 000 örüntülü, e-postalar .example alanındadır.
//
//   POST /api            → Overpass yanıtı (elements[])
//   GET  http://<slug>.localhost:PORT/  → işletmenin "web sitesi" (Instagram/e-posta bağlantıları)
//   GET  /robots.txt     → 404 (her şeye izin)
import http from 'node:http';

export const PORT = Number(process.env.MOCK_PORT || 9444);
const BASE = `http://127.0.0.1:${PORT}`;

const SHOPS = [
  { slug: 'usta-makas', name: 'Usta Makas Erkek Kuaförü', lat: 40.9903, lon: 29.0252, phone: '+90 216 000 00 11', web: true,
    street: 'Bağdat Caddesi', no: '120', hood: 'Caddebostan', dist: 'Kadıköy', hours: 'Mo-Sa 09:00-21:00',
    site: { ig: 'ustamakas.demo', mail: 'info@ustamakas.example', fb: 'ustamakas.demo' } },
  { slug: 'efe-barber', name: 'Efe Barber Shop', lat: 40.9871, lon: 29.0301, phone: '+90 532 000 00 12', web: true,
    street: 'Moda Caddesi', no: '48', hood: 'Moda', dist: 'Kadıköy', hours: 'Mo-Su 10:00-22:00',
    site: { ig: 'efebarber.demo', mail: 'merhaba@efebarber.example' } },
  { slug: 'altin-tarak', name: 'Altın Tarak Berber', lat: 41.0422, lon: 29.0083, phone: '0212 000 00 13', web: false,
    street: 'Barbaros Bulvarı', no: '33', hood: 'Dikilitaş', dist: 'Beşiktaş', hours: 'Mo-Sa 09:30-20:00' },
  { slug: 'moda-barber-club', name: 'Moda Barber Club', lat: 40.9842, lon: 29.0269, phone: '+90 533 000 00 14', web: true,
    street: 'Kadife Sokak', no: '7', hood: 'Moda', dist: 'Kadıköy', hours: 'Tu-Su 11:00-21:00',
    site: { ig: 'modabarberclub.demo', mail: 'rezervasyon@modabarberclub.example', fb: 'modabarberclub' } },
  { slug: 'besiktas-jilet', name: 'Beşiktaş Jilet Berber', lat: 41.0433, lon: 29.0071, phone: '+90 212 000 00 15', web: false,
    street: 'Çarşı Sokak', no: '5', hood: 'Sinanpaşa', dist: 'Beşiktaş' },
  { slug: 'sisli-dandy', name: 'Şişli Dandy Barber', lat: 41.0602, lon: 28.9877, phone: '+90 534 000 00 16', web: true,
    street: 'Halaskargazi Caddesi', no: '210', hood: 'Harbiye', dist: 'Şişli', hours: 'Mo-Sa 10:00-20:00',
    site: { ig: 'sislidandy.demo', mail: 'info@sislidandy.example' } },
  { slug: 'bomonti-usta', name: 'Bomonti Usta Berber', lat: 41.0584, lon: 28.9833, phone: '', web: false,
    street: 'Silahşör Caddesi', no: '61', hood: 'Bomonti', dist: 'Şişli' },
  { slug: 'cihangir-fade', name: 'Cihangir Fade Studio', lat: 41.0319, lon: 28.9822, phone: '+90 535 000 00 18', web: true,
    street: 'Akarsu Caddesi', no: '14', hood: 'Cihangir', dist: 'Beyoğlu', hours: 'Mo-Sa 10:00-21:00',
    site: { ig: 'cihangirfade.demo', mail: 'randevu@cihangirfade.example', fb: 'cihangirfadestudio' } },
  { slug: 'uskudar-nostalji', name: 'Üsküdar Nostalji Berber', lat: 41.0257, lon: 29.0151, phone: '+90 216 000 00 19', web: false,
    street: 'Hakimiyet-i Milliye Caddesi', no: '9', hood: 'Mimar Sinan', dist: 'Üsküdar' },
  { slug: 'fatih-sakal', name: 'Fatih Sakal & Saç', lat: 41.0186, lon: 28.9497, phone: '+90 536 000 00 20', web: true,
    street: 'Fevzi Paşa Caddesi', no: '77', hood: 'Fındıkzade', dist: 'Fatih',
    site: { ig: 'fatihsakalsac.demo', mail: 'info@fatihsakalsac.example' } },
  { slug: 'bakirkoy-royal', name: 'Bakırköy Royal Barber', lat: 40.9794, lon: 28.8722, phone: '+90 212 000 00 21', web: false,
    street: 'İstanbul Caddesi', no: '102', hood: 'Cevizlik', dist: 'Bakırköy', hours: 'Mo-Su 09:00-22:00' },
  { slug: 'atasehir-keskin', name: 'Ataşehir Keskin Makas', lat: 40.9923, lon: 29.1244, phone: '+90 537 000 00 22', web: false,
    street: 'Atatürk Mahallesi, Ihlamur Sokak', no: '3', hood: 'Atatürk', dist: 'Ataşehir' },
];

function elements() {
  const els = SHOPS.map((s, i) => ({
    type: 'node', id: 9100000 + i, lat: s.lat, lon: s.lon,
    tags: {
      name: s.name, shop: 'hairdresser',
      ...(s.phone ? { phone: s.phone } : {}),
      ...(s.web ? { website: `http://${s.slug}.localhost:${PORT}/` } : {}),
      'addr:street': s.street, 'addr:housenumber': s.no, 'addr:neighbourhood': s.hood, 'addr:district': s.dist,
      ...(s.hours ? { opening_hours: s.hours } : {}),
    },
  }));
  // Aynı işletmenin ikinci OSM kaydı (aynı telefon) — uygulama bunu tek kayda birleştirmeli.
  const dup = SHOPS[1];
  els.push({
    type: 'way', id: 9200001, center: { lat: dup.lat + 0.00003, lon: dup.lon },
    tags: { name: 'Efe Barber', shop: 'hairdresser', phone: dup.phone, 'addr:district': dup.dist },
  });
  return els;
}

function sitePage(slug) {
  const s = SHOPS.find((x) => x.slug === slug);
  if (!s || !s.site) return null;
  const { ig, mail, fb } = s.site;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${s.name}</title></head><body>
  <h1>${s.name}</h1><p>${s.street} No:${s.no}, ${s.dist}</p>
  <a href="https://www.instagram.com/${ig}/">Instagram</a>
  ${fb ? `<a href="https://www.facebook.com/${fb}">Facebook</a>` : ''}
  <a href="mailto:${mail}">${mail}</a>
  </body></html>`;
}

export function startMock() {
  const handler = (req, res) => {
    const url = new URL(req.url, BASE);
    if (req.method === 'POST' && url.pathname === '/api') {
      req.resume();
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ version: 0.6, generator: 'mock-overpass', elements: elements() }));
      });
      return;
    }
    const slug = (req.headers.host || '').split(':')[0].replace(/\.localhost$/, '');
    if (url.pathname === '/') {
      const html = sitePage(slug);
      if (html) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(html); }
    }
    res.writeHead(404); res.end('not found');
  };
  // *.localhost IPv6 (::1) çözülebildiği için hem IPv4 hem IPv6 geri döngüsüne bağlan (LAN'a açılmaz).
  const servers = [['127.0.0.1'], ['::1']].map(([host]) => {
    const srv = http.createServer(handler);
    srv.on('error', () => {}); // ::1 yoksa sessizce atla
    srv.listen(PORT, host);
    return srv;
  });
  return new Promise((resolve) => setTimeout(() => resolve({ close: () => servers.forEach((x) => x.close()) }), 200));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startMock();
  console.log(`mock-server hazır: ${BASE}/api`);
}
