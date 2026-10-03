const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/SearchHub.jsx', 'utf8');

c = c.replace(
  /const \[docs, tasks, messages, meetings, decisions, videos, blockers, standups, integrations, people\] = await Promise\.all\(\[/g,
  "const [docs, tasks, messages, meetings, decisions, videos, blockers, standups, integrations, people, memories, captures, moments] = await Promise.all(["
);

c = c.replace(
  /searchPeople\(q, cid\)\n    \]\);/g,
  `searchPeople(q, cid),
      safeQuery(supabase.from('clipad_v3_memories').select('id, name, content, updated_at').eq('company_id', cid).ilike('content', term).limit(10)),
      safeQuery(supabase.from('clipad_v3_captures').select('id, title, content, created_at').eq('user_id', user.id).ilike('content', term).limit(10)),
      safeQuery(supabase.from('clipad_v3_smart_moments').select('id, title, description, created_at').eq('company_id', cid).ilike('description', term).limit(10))
    ]);`
);

c = c.replace(
  /\.\.\.\(people \|\| \[\]\),/g,
  `...(people || []),
      ...(memories || []).map(m => ({ type: 'memory', id: m.id, label: m.name || 'Memory', snippet: m.content, created_at: m.updated_at })),
      ...(captures || []).map(c => ({ type: 'capture', id: c.id, label: c.title || 'Capture', snippet: c.content, created_at: c.created_at })),
      ...(moments || []).map(m => ({ type: 'smart_moment', id: m.id, label: m.title || 'Smart Moment', snippet: m.description, created_at: m.created_at })),`
);

// We should also add icons for these types in the getIcon function
c = c.replace(
  /if \(type === 'video'\) return <Video className="w-4 h-4 text-rose-500" \/>;/g,
  `if (type === 'video') return <Video className="w-4 h-4 text-rose-500" />;
    if (type === 'memory') return <BrainCircuit className="w-4 h-4 text-purple-500" />;
    if (type === 'capture') return <Inbox className="w-4 h-4 text-indigo-500" />;
    if (type === 'smart_moment') return <Zap className="w-4 h-4 text-amber-500" />;`
);

// Add imports for BrainCircuit, Inbox, Zap if missing
if (!c.includes('BrainCircuit')) {
  c = c.replace(/import \{([^}]+)} from "lucide-react";/g, "import {$1, BrainCircuit, Inbox, Zap} from \"lucide-react\";");
}

fs.writeFileSync('src/pages/clipad/SearchHub.jsx', c);
