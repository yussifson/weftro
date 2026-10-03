const fs = require('fs');
let content = fs.readFileSync('src/components/video/VideoRoom.jsx', 'utf8');

// Add useParams import
content = content.replace(/import \{ useLocation, useNavigate \} from 'react-router-dom';/, "import { useLocation, useNavigate, useParams } from 'react-router-dom';");
if (!content.includes('useParams')) {
  content = content.replace(/import \{ useNavigate \} from 'react-router-dom';/, "import { useNavigate, useParams } from 'react-router-dom';");
}

// Modify the component to accept routeId and construct finalRoomUrl
content = content.replace(
  /export default function VideoRoom\(\{ roomUrl, userName, token, initialAudio = true, initialVideo = true, initialBackground, onLeave, isPipMode, togglePipMode, spaceId \}\) \{/,
  `export default function VideoRoom({ roomUrl, userName, token, initialAudio = true, initialVideo = true, initialBackground, onLeave, isPipMode, togglePipMode, spaceId }) {
 const { id: routeId } = useParams();
 const finalRoomUrl = roomUrl || (routeId ? \`https://optavel.daily.co/\${routeId}\` : null);`
);

// Replace roomUrl with finalRoomUrl in the useEffect
content = content.replace(/if \(!roomUrl\) return;/g, 'if (!finalRoomUrl) return;');

// Wait, the VideoRoomInner takes roomUrl as well. We should pass finalRoomUrl to it.
content = content.replace(
  /<VideoRoomInner roomUrl=\{roomUrl\} onLeave=\{onLeave\} isPipMode=\{isPipMode\} togglePipMode=\{togglePipMode\} initialBackground=\{initialBackground\} spaceId=\{spaceId\} initialAudio=\{initialAudio\} initialVideo=\{initialVideo\} \/>/g,
  '<VideoRoomInner roomUrl={finalRoomUrl} onLeave={onLeave} isPipMode={isPipMode} togglePipMode={togglePipMode} initialBackground={initialBackground} spaceId={spaceId} initialAudio={initialAudio} initialVideo={initialVideo} />'
);

fs.writeFileSync('src/components/video/VideoRoom.jsx', content);
