const fs = require('fs');
let content = fs.readFileSync('phase5_9.sql', 'utf8');

// Also include DROP TABLE IF EXISTS for the ones that might have failed midway
const dropTables = `
-- Clean up partially created tables from previous failed runs
DROP TABLE IF EXISTS clipad_v3_capture_settings CASCADE;
DROP TABLE IF EXISTS clipad_v3_connect_tokens CASCADE;
DROP TABLE IF EXISTS clipad_v3_connect_apps CASCADE;
DROP TABLE IF EXISTS clipad_v3_webhooks CASCADE;
DROP TABLE IF EXISTS clipad_v3_captures CASCADE;
DROP TABLE IF EXISTS clipad_v3_context_sessions CASCADE;
DROP TABLE IF EXISTS clipad_v3_organizational_insights CASCADE;
DROP TABLE IF EXISTS clipad_v3_automation_rules CASCADE;

`;

// Fix the uuid = text issue
content = content.replace(/company_id IN \(\s*SELECT company_id FROM/g, 'company_id::text IN (SELECT company_id FROM');

fs.writeFileSync('phase5_9_fixed.sql', dropTables + content, 'utf8');
console.log('Fixed file generated.');
