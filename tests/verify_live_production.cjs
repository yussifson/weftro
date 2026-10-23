const https = require('https');

https.get('https://weftro.com/', (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    const t = html.match(/<title>([^<]+)<\/title>/);
    const d = html.match(/<meta name="description" content="([^"]+)"/);
    const c = html.match(/<link rel="canonical" href="([^"]+)"/);
    const og = html.match(/<meta property="og:title" content="([^"]+)"/);
    console.log('--- LIVE PRODUCTION HEAD AUDIT (https://weftro.com) ---');
    console.log('HTTP Status:', res.statusCode);
    console.log('Title:', t ? t[1] : 'NOT FOUND');
    console.log('Description:', d ? d[1] : 'NOT FOUND');
    console.log('Canonical:', c ? c[1] : 'NOT FOUND');
    console.log('OG Title:', og ? og[1] : 'NOT FOUND');
    console.log('Schema @graph Included:', html.includes('@graph'));
  });
});
