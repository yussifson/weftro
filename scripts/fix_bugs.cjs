const fs = require('fs');

// 1. Fix WatchVideo.jsx -> Use `id` from useParams instead of `videoId`
let watchPath = 'src/pages/clipad/WatchVideo.jsx';
let watchContent = fs.readFileSync(watchPath, 'utf8');
watchContent = watchContent.replace('const { videoId } = useParams();', 'const { id: videoId } = useParams();');
fs.writeFileSync(watchPath, watchContent);
console.log('Fixed WatchVideo.jsx undefined ID issue.');

// 2. Fix VideoRoom.jsx -> Use `!finalRoomUrl` instead of `!roomUrl` in the loading condition
let videoPath = 'src/components/video/VideoRoom.jsx';
let videoContent = fs.readFileSync(videoPath, 'utf8');
videoContent = videoContent.replace('if (!daily || !roomUrl) {', 'if (!daily || !finalRoomUrl) {');
fs.writeFileSync(videoPath, videoContent);
console.log('Fixed VideoRoom.jsx infinite loading bug.');
