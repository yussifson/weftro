const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/pages/clipad/KnowledgeGraph.jsx');
let code = fs.readFileSync(file, 'utf8');

// Neutralize PROVIDER_COLORS
const providerColorsRegex = /slack:\s*'#4A154B'[\s\S]*?default:\s*'#6366F1',/m;
const newProviderColors = `slack: '#fad503',
  github: '#fad503',
  notion: '#fad503',
  jira: '#fad503',
  google_drive: '#fad503',
  google_meet: '#fad503',
  zoom: '#fad503',
  confluence: '#fad503',
  linear: '#fad503',
  asana: '#fad503',
  clickup: '#fad503',
  trello: '#fad503',
  figma: '#fad503',
  miro: '#fad503',
  hubspot: '#fad503',
  salesforce: '#fad503',
  microsoft_teams: '#fad503',
  outlook: '#fad503',
  gmail: '#fad503',
  gitlab: '#fad503',
  bitbucket: '#fad503',
  default: '#fad503',`;

code = code.replace(providerColorsRegex, newProviderColors);

// Neutralize RELATIONSHIP_COLORS
const relationColorsRegex = /mentions:\s*'#F59E0B'[\s\S]*?related:\s*'#8B5CF6',/m;
const newRelationColors = `mentions: '#006065',
  continues: '#006065',
  implements: '#006065',
  blocks: '#fad503',
  references: '#006065',
  related: '#006065',`;

code = code.replace(relationColorsRegex, newRelationColors);

fs.writeFileSync(file, code);
console.log('Graph node and relation colors neutralized.');
