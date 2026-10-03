const fs = require('fs');

// 1. Fix RecordVideo.jsx syntax error (already done by fix_syntax.cjs, but ensure it's clean)

// 2. Fix ClipadSidebar.jsx — remove "My Captures" & "Context Sessions", rename "Integrations" to "Capture"
let sidebar = fs.readFileSync('src/components/clipad/ClipadSidebar.jsx', 'utf8');

// Remove the My Captures and Context Sessions lines
sidebar = sidebar.replace(/\s*\{ label: 'My Captures', path: '\/captures', icon: Inbox \},?\n/, '\n');
sidebar = sidebar.replace(/\s*\{ label: 'Context Sessions', path: '\/context-sessions', icon: Layers \},?\n/, '');

// Rename Integrations to Capture
sidebar = sidebar.replace("{ label: 'Integrations', path: '/integrations', icon: Plug }", "{ label: 'Capture', path: '/integrations', icon: Plug }");

// Remove unused Inbox and Layers imports if they exist
sidebar = sidebar.replace(/, Inbox/g, '');
sidebar = sidebar.replace(/, Layers/g, '');
sidebar = sidebar.replace(/Inbox, /g, '');
sidebar = sidebar.replace(/Layers, /g, '');

fs.writeFileSync('src/components/clipad/ClipadSidebar.jsx', sidebar);
console.log('Fixed sidebar: removed My Captures, Context Sessions; renamed Integrations → Capture');

// 3. Fix ClipadTopNav.jsx — rename "Studio" to "Capture", simplify dropdown labels
let topNav = fs.readFileSync('src/components/clipad/ClipadTopNav.jsx', 'utf8');

// Rename "Studio" → "Capture"
topNav = topNav.replace('>Studio</span>', '>Capture</span>');
topNav = topNav.replace('>STUDIO</span>', '>CAPTURE</span>');

// Simplify dropdown labels
topNav = topNav.replace('Record Async Video', 'Record');
topNav = topNav.replace('Start Live Meeting', 'Meet');
topNav = topNav.replace('Video Analytics', 'Analytics');

fs.writeFileSync('src/components/clipad/ClipadTopNav.jsx', topNav);
console.log('Fixed top nav: Studio → Capture, simplified dropdown labels');
