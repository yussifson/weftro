const fs = require('fs');
let c = fs.readFileSync('src/lib/clipadV3Flags.js', 'utf8');
c = c.replace(/CONNECT_ENABLED: 'connect_enabled',/g, "CONNECT_ENABLED: 'connect_enabled',\n  API_CONNECT_ENABLED: 'api_connect_enabled',\n  WEBHOOKS_ENABLED: 'webhooks_enabled',");
c = c.replace(/\[V3_FLAGS\.CONNECT_ENABLED\]: true,/g, "[V3_FLAGS.CONNECT_ENABLED]: true,\n  [V3_FLAGS.API_CONNECT_ENABLED]: true,\n  [V3_FLAGS.WEBHOOKS_ENABLED]: true,");
fs.writeFileSync('src/lib/clipadV3Flags.js', c);
console.log("Flags updated");
