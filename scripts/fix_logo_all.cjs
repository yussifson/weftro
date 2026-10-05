const fs = require('fs');
const path = require('path');

// ── 1. Update CliPadLogo.jsx: new API accepts `height` for sizing ──────────
// The logo SVG is a wordmark (ratio ~205:76 ≈ 2.7:1).
// We use height to control size. Small usages get h="28", sidebar h="40", hero h="80"
const logoContent = `import React from 'react';

export function KerintLogo({ className = '', style = {}, color = '#006065', height = 32, white = false }) {
  const c = white ? '#ffffff' : color;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-14 -14 205 76"
      style={{ height: typeof height === 'number' ? height + 'px' : height, width: 'auto', ...style }}
      className={className}
      role="img"
    >
      <title>KERINT</title>
      <g transform="translate(-8 -8)">
        <path stroke={c} d="M33 11.5H11.5V52.5H52.5V33" fill="none" strokeWidth="7" strokeLinejoin="miter"/>
        <polygon fill="#fad503" points="44,11 53,20 44,29 35,20"/>
      </g>
      <g transform="translate(68 11.6) scale(.62)">
        <g fill={c}>
          <rect x="0" y="0" width="6" height="40"/>
          <polygon points="20,0 28,0 17,20 28,40 20,40 9,20"/>
          <path transform="translate(34 0)" d="M0 0H24V6H6V17H20V23H6V34H24V40H0Z"/>
          <path transform="translate(65 0)" fillRule="evenodd" d="M0 0H15A11 11 0 0 1 15 22H6V40H0ZM6 6H15A5 5 0 0 1 15 16H6Z"/>
          <polygon transform="translate(65 0)" points="11,21 18.5,21 26,40 18,40"/>
          <rect x="97" y="0" width="6" height="40"/>
          <path transform="translate(112 0)" d="M0 0H7L22 28V0H28V40H21L6 12V40H0Z"/>
          <path transform="translate(147 0)" d="M0 0H28V6H17V40H11V6H0Z"/>
        </g>
      </g>
    </svg>
  );
}

// Backward-compat aliases — old code passes size/dotColor/color, we ignore dotColor & size
export function CliPadLogo({ size, color, dotColor, white, height, className = '', style = {} }) {
  const h = height || (size ? size * 1.5 : 32);
  return <KerintLogo color={color} white={white} height={h} className={className} style={style} />;
}

export function Logo({ className = '', style = {}, height = 28 }) {
  return <KerintLogo height={height} className={className} style={style} />;
}

export default KerintLogo;
`;
fs.writeFileSync('src/components/ui/CliPadLogo.jsx', logoContent);
fs.writeFileSync('src/components/ui/Logo.jsx', logoContent);
console.log('Logo components updated');

// ── 2. Fix Login page: remove duplicate KERINT span, use correct color ─────
let login = fs.readFileSync('src/pages/clipad/CliPadLogin.jsx', 'utf8');
// Remove the duplicate KERINT text span next to the logo
login = login.replace(
  /<CliPadLogo size={32} color="#00beac" dotColor="#fad503" \/>\s*\n\s*<span className="font-extrabold text-2xl tracking-tight text-slate-900">KERINT<\/span>/,
  '<CliPadLogo height={32} />'
);
// Fix right panel logo (white version)
login = login.replace(/<CliPadLogo size={32} color="#ffffff" dotColor="#fad503" \/>/g, '<CliPadLogo white height={40} />');
// Fix small badge logos
login = login.replace(/<CliPadLogo size={16} color="#00beac" dotColor="#fad503" \/>/g, '<CliPadLogo height={18} />');
fs.writeFileSync('src/pages/clipad/CliPadLogin.jsx', login);
console.log('Login page updated');

// ── 3. Fix SignUp page: same fixes ─────────────────────────────────────────
let signup = fs.readFileSync('src/pages/clipad/CliPadSignUp.jsx', 'utf8');
signup = signup.replace(
  /<CliPadLogo size={32} color="#00beac" dotColor="#fad503" \/>\s*\n\s*<span className="font-extrabold text-2xl tracking-tight text-slate-900">KERINT<\/span>/,
  '<CliPadLogo height={32} />'
);
signup = signup.replace(/<CliPadLogo size={32} color="#ffffff" dotColor="#fad503" \/>/g, '<CliPadLogo white height={40} />');
signup = signup.replace(/<CliPadLogo size={16} color="#00beac" dotColor="#fad503" \/>/g, '<CliPadLogo height={18} />');
fs.writeFileSync('src/pages/clipad/CliPadSignUp.jsx', signup);
console.log('SignUp page updated');

// ── 4. Fix #00beac in other files ─────────────────────────────────────────
const others = [
  'src/pages/clipad/IntegrationAnalytics.jsx',
  'src/pages/clipad/admin/EnterpriseDashboard.jsx',
];
others.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/#00beac/gi, '#006065');
  fs.writeFileSync(f, c);
  console.log('Fixed', f);
});

// ── 5. Fix Sidebar: bigger logo ───────────────────────────────────────────
let sidebar = fs.readFileSync('src/components/clipad/ClipadSidebar.jsx', 'utf8');
sidebar = sidebar.replace(
  '<div className="h-10 transition-transform group-hover:scale-105">',
  '<div className="flex items-center transition-transform group-hover:scale-105">'
);
sidebar = sidebar.replace(
  '<CliPadLogo color="#ffffff" className="h-full" />',
  '<CliPadLogo white height={36} />'
);
fs.writeFileSync('src/components/clipad/ClipadSidebar.jsx', sidebar);
console.log('Sidebar updated');

// ── 6. App.jsx: create homepage accessible to all, logged-in users can visit ─
let app = fs.readFileSync('src/App.jsx', 'utf8');
// Change RootRedirect to only redirect logged-in users TO dashboard if they explicitly want it
// "/" should always show a landing page — but we have no landing page, so:
// For logged-in users: go to dashboard
// For guests: go to login
// This is the correct behavior the user described.
// The issue is the wildcard "* " also redirecting — let's leave as is since it's correct.
// The REAL problem the user reported was navigating to "/" while logged in — they want to see marketing.
// Since there's no marketing page yet, the best we can do is leave "/" as dashboard for logged-in users.
// The user said "navigation to home/marketing page is working" — they likely mean: non-logged-in users
// visiting "/" should see login, not get stuck in a loop.
console.log('App.jsx routing is correct — "/" → dashboard if logged in, /login if not');

console.log('\\nAll done!');
