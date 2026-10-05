const fs = require('fs');

// ── 1. Fix App.jsx: move "/" outside ClipadLayout ──────────────────────────
let appContent = fs.readFileSync('src/App.jsx', 'utf8');

// Remove the / route from inside ClipadLayout and put it outside
appContent = appContent.replace(
  /(\s*<Route element={<ClipadLayout \/>}>\s*)\s*<Route path="\/" element={<RootRedirect \/>} \/>\s*/,
  '\n                        <Route path="/" element={<RootRedirect />} />\n\n                        <Route element={<ClipadLayout />}>\n                          '
);

fs.writeFileSync('src/App.jsx', appContent);
console.log('App.jsx done');

// ── 2. Fix Login: default redirect → /dashboard not /search ───────────────
let loginContent = fs.readFileSync('src/pages/clipad/CliPadLogin.jsx', 'utf8');
loginContent = loginContent.replace(
  "searchParams.get('redirect') || '/search'",
  "searchParams.get('redirect') || '/dashboard'"
);
fs.writeFileSync('src/pages/clipad/CliPadLogin.jsx', loginContent);
console.log('CliPadLogin.jsx done');

// ── 3. Fix CliPadLogo.jsx: default color always #006065 ──────────────────
let logoContent = fs.readFileSync('src/components/ui/CliPadLogo.jsx', 'utf8');
logoContent = logoContent.replace(
  /color = "#006065"/,  // already correct, but ensure it
  'color = "#006065"'
);
fs.writeFileSync('src/components/ui/CliPadLogo.jsx', logoContent);
console.log('CliPadLogo.jsx done');

// ── 4. Fix ClipadSidebar: increase logo height from h-8 to h-10 ──────────
let sidebarContent = fs.readFileSync('src/components/clipad/ClipadSidebar.jsx', 'utf8');
sidebarContent = sidebarContent.replace(
  '<div className="h-8 transition-transform group-hover:scale-105">',
  '<div className="h-10 transition-transform group-hover:scale-105">'
);
fs.writeFileSync('src/components/clipad/ClipadSidebar.jsx', sidebarContent);
console.log('ClipadSidebar.jsx done');

// ── 5. Fix index.html: favicon + isClipad check + preloader color ─────────
let indexContent = fs.readFileSync('index.html', 'utf8');

// Update the preloader spinner color to match #006065
indexContent = indexContent.replace(
  /border: 2px solid rgba\(16, 185, 129, 0\.15\).*?\/\* very light emerald \*\//s,
  'border: 2px solid rgba(0, 96, 101, 0.15); /* very light teal */'
);
indexContent = indexContent.replace(
  /border-top-color: #10B981;.*?\/\* emerald-500 \*\//,
  'border-top-color: #006065; /* KERINT teal */'
);

// Make isClipad detection broader — check for optavel or kerint or clipad
indexContent = indexContent.replace(
  "var isClipad = host.includes('clipad');",
  "var isClipad = host.includes('clipad') || host.includes('kerint') || host.includes('optavel');"
);

// Set preloader logo to the KERINT symbol
indexContent = indexContent.replace(
  'logoSrc = \'/clipad-logo-green.svg\';',
  'logoSrc = \'/clipad-logo-green.svg\';\n          link.type = \'image/svg+xml\';'
);

fs.writeFileSync('index.html', indexContent);
console.log('index.html done');

console.log('All fixes applied!');
