const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/CaptureInbox.jsx', 'utf8');

c = c.replace(
  /const \[selectedCapture, setSelectedCapture\] = useState\(null\);/g,
  `const [selectedCapture, setSelectedCapture] = useState(null);
  const [relatedMemories, setRelatedMemories] = useState([]);
  
  useEffect(() => {
    if (selectedCapture) {
      loadRelatedMemories(selectedCapture.id);
    } else {
      setRelatedMemories([]);
    }
  }, [selectedCapture]);

  const loadRelatedMemories = async (captureId) => {
    try {
      const { data } = await supabase
        .from('clipad_v3_memories')
        .select('id, title, memory_type')
        .eq('source_id', captureId)
        .limit(5);
      setRelatedMemories(data || []);
    } catch (e) {}
  };`
);

c = c.replace(
  /\{selectedCapture\.provenance && Object\.keys\(selectedCapture\.provenance\)\.length > 0 && \(/g,
  `{relatedMemories.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-purple-500" /> Generated Intelligence
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {relatedMemories.map(mem => (
                      <div key={mem.id} className="p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-xl">
                        <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1 block">{mem.memory_type}</span>
                        <p className="font-semibold text-purple-900 dark:text-purple-200 text-sm line-clamp-2">{mem.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCapture.provenance && Object.keys(selectedCapture.provenance).length > 0 && (`
);

fs.writeFileSync('src/pages/clipad/CaptureInbox.jsx', c);
