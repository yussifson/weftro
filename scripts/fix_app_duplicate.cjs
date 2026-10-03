const fs = require('fs');
let app = fs.readFileSync('src/App.jsx', 'utf8');

// Replace duplicate RecordVideo declarations with a single one
app = app.replace(
  /const RecordVideo = React\.lazy\(\(\) => import\('@\/pages\/clipad\/RecordVideo'\)\);\s*const RecordVideo = React\.lazy\(\(\) => import\('@\/pages\/clipad\/RecordVideo'\)\);/g,
  "const RecordVideo = React.lazy(() => import('@/pages/clipad/RecordVideo'));"
);

fs.writeFileSync('src/App.jsx', app);
