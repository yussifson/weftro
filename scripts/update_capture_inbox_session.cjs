const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'components', 'clipad', 'features', 'CaptureInbox.jsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('updateCapture')) {
  content = content.replace(
    "import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';",
    "import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';\nimport { updateCapture } from '@/lib/clipadCaptureService';"
  );
}

const handleAssociateLogic = `
  const handleAssociateSession = async (captureId, sessionId) => {
    try {
      const updated = await updateCapture(captureId, { context_session_id: sessionId || null });
      setCaptures(prev => prev.map(c => c.id === captureId ? updated : c));
      toast({ title: 'Success', description: 'Session association updated.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to associate session.', variant: 'destructive' });
    }
  };
`;

if (!content.includes('handleAssociateSession')) {
  content = content.replace(
    'const handleCreateSession =',
    handleAssociateLogic + '\n  const handleCreateSession ='
  );
}

const selectHtml = `
                  {contextSessionsEnabled && (
                    <select 
                      className="text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                      value={capture.context_session_id || ''}
                      onChange={(e) => handleAssociateSession(capture.id, e.target.value)}
                    >
                      <option value="">No Session</option>
                      {sessions.filter(s => s.status === 'ACTIVE' || s.id === capture.context_session_id).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.title} {s.status !== 'ACTIVE' ? '(Inactive)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
`;

if (!content.includes('<select')) {
  content = content.replace(
    "{['CREATED', 'FAILED'].includes(capture.status) && (",
    selectHtml + "\n                    {['CREATED', 'FAILED'].includes(capture.status) && ("
  );
}

fs.writeFileSync(file, content, 'utf8');
console.log('Updated CaptureInbox.jsx for Session Association');
