const fs = require('fs');
let app = fs.readFileSync('src/App.jsx', 'utf8');

const imports = `
const RecordVideo = React.lazy(() => import('@/pages/clipad/RecordVideo'));
const WatchVideo = React.lazy(() => import('@/pages/clipad/WatchVideo'));
const VideoRoom = React.lazy(() => import('@/components/video/VideoRoom'));`;

if (!app.includes('import(\'@/components/video/VideoRoom\')')) {
  app = app.replace("const WatchVideo = React.lazy(() => import('@/pages/clipad/WatchVideo'));", imports);
}

const routes = `
                          <Route path="/record" element={<RecordVideo />} />
                          <Route path="/watch/:id" element={<WatchVideo />} />
                          <Route path="/meetings/:id" element={<MeetingRecord />} />
                          <Route path="/join/:id" element={<VideoRoom />} />`;

if (!app.includes('path="/record"')) {
  app = app.replace("<Route path=\"/record-meeting\" element={<MeetingRecord />} />", `<Route path=\"/record-meeting\" element={<MeetingRecord />} />\n${routes}`);
}

fs.writeFileSync('src/App.jsx', app);
