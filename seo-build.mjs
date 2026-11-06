// Kullanım: node seo-build.mjs https://siteadresin.com
// Yayındaki kartlardan k/<kart>.html sayfaları, sitemap.xml ve robots.txt üretir.
// Paylaşım önizlemeleri (WhatsApp, X) ve arama motorları için. Ücretsiz, sunucu gerekmez.
import fs from 'node:fs';
const SITE = (process.argv[2] || '').replace(/\/$/, '');
if (!/^https?:\/\//.test(SITE)) { console.error('Kullanım: node seo-build.mjs https://siteadresin.com'); process.exit(1); }
const PROJECT = 'hatiradeger';
const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
const val = v => v == null ? '' : v.stringValue ?? v.booleanValue ?? v.integerValue ?? (v.arrayValue ? (v.arrayValue.values || []).map(val) : '');
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function parse(rows){
  return rows.filter(r => r.document).map(r => {
    const o = {id: r.document.name.split('/').pop()};
    for (const [k, v] of Object.entries(r.document.fields || {})) o[k] = val(v);
    return o;
  });
}
export function page(c){
  const link = `${SITE}/#/kart/${encodeURIComponent(c.id)}`, me = `${SITE}/k/${encodeURIComponent(c.id)}.html`;
  const img = /^https:\/\//.test(c.imageUrl || '') ? c.imageUrl : `${SITE}/icon-512.png`;
  const desc = String(c.summary || '').slice(0, 200);
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.title)} · Hatıra Değer</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(me)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Hatıra Değer"><meta property="og:title" content="${esc(c.title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${esc(img)}"><meta property="og:url" content="${esc(me)}"><meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(link)}"></head>
<body style="font-family:Georgia,serif;max-width:40em;margin:3em auto;padding:0 1em"><h1>${esc(c.title)}</h1><p>${esc(c.summary)}</p><p>${esc(String(c.description || '').slice(0, 600))}</p><p><a href="${esc(link)}">Kartın tamamını aç</a></p></body></html>`;
}
if (process.argv[1] && process.argv[1].endsWith('seo-build.mjs')) {
  const res = await fetch(url, {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({structuredQuery:{from:[{collectionId:'cards'}], where:{fieldFilter:{field:{fieldPath:'status'}, op:'EQUAL', value:{stringValue:'published'}}}}})});
  if (!res.ok) { console.error('Firestore yanıtı:', res.status, await res.text()); process.exit(1); }
  const cards = parse(await res.json());
  fs.mkdirSync('k', {recursive:true});
  for (const c of cards) fs.writeFileSync(`k/${c.id}.html`, page(c));
  const urls = [`${SITE}/`, ...['hakkinda','topluluk','gizlilik','sartlar'].map(p => `${SITE}/#/${p}`), ...cards.map(c => `${SITE}/k/${encodeURIComponent(c.id)}.html`)];
  fs.writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${esc(u)}</loc></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log(`${cards.length} kart için sayfa üretildi. k/ klasörünü, sitemap.xml ve robots.txt dosyasını sitenle birlikte yayına al.`);
}
