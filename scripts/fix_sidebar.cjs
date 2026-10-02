const fs = require('fs');
let sb = fs.readFileSync('src/components/clipad/ClipadSidebar.jsx', 'utf8');

sb = sb.replace(/adminItems\.push\(\{\n\s*label: 'Custom Requests',\n\s*path: '\/admin\/custom-requests',\n\s*icon: Sparkles\n\s*\}\);\n/g, '');
sb = sb.replace(/if \(user\?\.role === 'super_admin'\) \{/g, `if (user?.role === 'super_admin') {\n    adminItems.push({\n      label: 'Custom Requests',\n      path: '/admin/custom-requests',\n      icon: Sparkles\n    });`);

fs.writeFileSync('src/components/clipad/ClipadSidebar.jsx', sb);
