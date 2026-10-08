const fs = require('fs');
const file = 'src/lib/clipadV3Flags.js';
let c = fs.readFileSync(file, 'utf8');

if (!c.includes('ORGANIZATIONAL_ANALYTICS_ENABLED')) {
  // Add to V3_FLAGS enum
  c = c.replace(
    "AUTOMATION_V3_ENABLED: 'automation_v3_enabled',",
    "AUTOMATION_V3_ENABLED: 'automation_v3_enabled',\n  ORGANIZATIONAL_ANALYTICS_ENABLED: 'organizational_analytics_enabled',\n  ORGANIZATIONAL_LEARNING_ENABLED: 'organizational_learning_enabled',"
  );

  // Add to DEFAULTS
  c = c.replace(
    "[V3_FLAGS.AUTOMATION_V3_ENABLED]: false, // Staged",
    "[V3_FLAGS.AUTOMATION_V3_ENABLED]: true, // Phase 9\n  [V3_FLAGS.ORGANIZATIONAL_ANALYTICS_ENABLED]: true,\n  [V3_FLAGS.ORGANIZATIONAL_LEARNING_ENABLED]: true,"
  );

  fs.writeFileSync(file, c);
  console.log('Added Phase 9 Feature Flags');
}
