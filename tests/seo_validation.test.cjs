const fs = require('fs');
const path = require('path');

console.log('--- RUNNING WEFTRO V3 SEO & DISCOVERABILITY TEST SUITE ---');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log('  PASS:', message);
    passed++;
  } else {
    console.error('  FAIL:', message);
    failed++;
  }
}

const rootDir = path.resolve(__dirname, '..');

// 1. Tagline invariant test
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
assert(indexHtml.includes('#1 Enterprise Intelligence Platform'), 'index.html contains exact official tagline "#1 Enterprise Intelligence Platform"');
assert(!indexHtml.includes('by Clipad'), 'index.html does not contain legacy "by Clipad" branding');

// 2. Canonical domain & URLs test
assert(indexHtml.includes('<link rel="canonical" href="https://weftro.com/" />'), 'index.html has self-referencing canonical to https://weftro.com/');

// 3. Open Graph & Twitter / X cards in index.html
assert(indexHtml.includes('property="og:site_name" content="Weftro"'), 'index.html has og:site_name Weftro');
assert(indexHtml.includes('name="twitter:card" content="summary_large_image"'), 'index.html has twitter:card summary_large_image');

// 4. JSON-LD structured data in index.html
assert(indexHtml.includes('"@type": "Organization"') && indexHtml.includes('"@type": "WebSite"'), 'index.html includes valid Organization and WebSite JSON-LD graph');

// 5. Sitemap validation
const sitemap = fs.readFileSync(path.join(rootDir, 'public/sitemap.xml'), 'utf8');
const locMatches = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert(locMatches.length >= 7, 'sitemap.xml contains all expected public routes (' + locMatches.length + ' found)');
assert(locMatches.every(u => u.startsWith('https://weftro.com/')), 'All sitemap URLs use canonical https://weftro.com/ domain');
assert(!locMatches.some(u => u.includes('dashboard') || u.includes('admin') || u.includes('reset')), 'Private/internal routes are excluded from sitemap.xml');

// 6. Robots.txt validation
const robots = fs.readFileSync(path.join(rootDir, 'public/robots.txt'), 'utf8');
assert(robots.includes('Sitemap: https://weftro.com/sitemap.xml'), 'robots.txt points to canonical sitemap location');
assert(robots.includes('Disallow: /dashboard') && robots.includes('Disallow: /admin/*'), 'robots.txt disallows private authenticated workspaces and admin routes');
assert(robots.includes('Disallow: /reset-password') && robots.includes('Disallow: /forgot-password'), 'robots.txt protects password recovery routes from indexing');

// 7. Public page SEO components validation
const meetLanding = fs.readFileSync(path.join(rootDir, 'src/pages/MeetLandingPage.jsx'), 'utf8');
assert(meetLanding.includes('title="Weftro V3 — #1 Enterprise Intelligence Platform"'), 'MeetLandingPage has Weftro V3 and exact tagline');
assert(meetLanding.includes('url="https://weftro.com/"'), 'MeetLandingPage has canonical url to https://weftro.com/');

const pricing = fs.readFileSync(path.join(rootDir, 'src/pages/PricingPage.jsx'), 'utf8');
assert(pricing.includes('#1 Enterprise Intelligence Platform') && pricing.includes('https://weftro.com/pricing'), 'PricingPage has updated title and canonical url');

const security = fs.readFileSync(path.join(rootDir, 'src/pages/SecurityPage.jsx'), 'utf8');
assert(security.includes('#1 Enterprise Intelligence Platform') && security.includes('https://weftro.com/security'), 'SecurityPage has updated title and canonical url');

const customPricing = fs.readFileSync(path.join(rootDir, 'src/pages/clipad/CliPadCustomPricing.jsx'), 'utf8');
assert(customPricing.includes('#1 Enterprise Intelligence Platform') && customPricing.includes('https://weftro.com/custom-pricing'), 'CliPadCustomPricing has updated title and canonical url');

// 8. Auth pages noindex & brand validation
const login = fs.readFileSync(path.join(rootDir, 'src/pages/clipad/CliPadLogin.jsx'), 'utf8');
assert(login.includes('Weftro V3 — #1 Enterprise Intelligence Platform'), 'CliPadLogin uses Weftro V3 title');

const forgotPw = fs.readFileSync(path.join(rootDir, 'src/pages/clipad/CliPadForgotPassword.jsx'), 'utf8');
assert(forgotPw.includes('content="noindex, follow"'), 'CliPadForgotPassword contains noindex directive');

const resetPw = fs.readFileSync(path.join(rootDir, 'src/pages/clipad/CliPadResetPassword.jsx'), 'utf8');
assert(resetPw.includes('content="noindex, nofollow"'), 'CliPadResetPassword contains noindex directive');

console.log('SUMMARY: ' + passed + ' passed, ' + failed + ' failed.');
if (failed > 0) process.exit(1);
