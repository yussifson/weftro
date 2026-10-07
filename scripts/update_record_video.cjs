const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'pages', 'clipad', 'RecordVideo.jsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { createCapture }')) {
  content = content.replace(
    "import { supabase } from '@/api/supabaseClient';",
    "import { supabase } from '@/api/supabaseClient';\nimport { createCapture } from '@/lib/clipadCaptureService';\nimport { contextualizeCapture } from '@/lib/clipadContextualizationService';"
  );
}

// In saveRecording function, where we insert into clipad_videos
// Let's find: const { data: videoRecord, error: dbError } = await supabase.from('clipad_videos').insert({
// Wait, it is called twice (draft logic and upload logic).

const captureInsertLogic = `
            try {
              const capture = await createCapture({
                companyId: user.user_metadata?.company_id || user.company_id,
                userId: user.id,
                sourceType: 'clipad_videos',
                sourceId: videoRecord.id,
                captureType: 'VIDEO',
                title: videoRecord.title || 'Video Recording',
                content: parsed.summary || 'Video Recording',
                visibility: 'PERSONAL'
              });
              
              // Non-blocking contextualization
              contextualizeCapture(capture.id).catch(console.error);
            } catch (captureErr) {
              console.error('Failed to create v3 capture:', captureErr);
            }
`;

// It's after: await supabase.from('clipad_videos').update({ ai_summary: parsed.summary }).eq('id', videoRecord.id);
// Let's replace the action items block to insert it right before.

content = content.replace(
  /if \(parsed\.action_items && Array\.isArray\(parsed\.action_items\) && parsed\.action_items\.length > 0\)/g,
  captureInsertLogic + '\n              if (parsed.action_items && Array.isArray(parsed.action_items) && parsed.action_items.length > 0)'
);

// Note: parsed.summary exists in both places. In draft save it's:
// await supabase.from('clipad_videos').update({ ai_summary: parsed.summary }).eq('id', activeVideoId);
// We might need to ensure `videoRecord` is available. Let's just use `videoRecord.id || activeVideoId` instead.
content = content.replace(
  'sourceId: videoRecord.id',
  'sourceId: videoRecord?.id || activeVideoId'
);
content = content.replace(
  "title: videoRecord.title || 'Video Recording'",
  "title: title.trim() || 'Video Recording'"
);


fs.writeFileSync(file, content, 'utf8');
console.log('Updated RecordVideo.jsx with Capture integration');
