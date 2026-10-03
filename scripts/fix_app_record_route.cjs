const fs = require('fs');
let app = fs.readFileSync('src/App.jsx', 'utf8');

if (!app.includes('<Route path="/record/:id" element={<RecordVideo />} />')) {
  app = app.replace(
    /<Route path="\/record" element={<RecordVideo \/>} \/>/,
    '<Route path="/record" element={<RecordVideo />} />\n                          <Route path="/record/:id" element={<RecordVideo />} />'
  );
}

fs.writeFileSync('src/App.jsx', app);
