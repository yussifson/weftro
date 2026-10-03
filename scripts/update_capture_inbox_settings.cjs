const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/CaptureInbox.jsx', 'utf8');

const importAdd = `import { Settings2 } from 'lucide-react';\nimport ExtensionSettingsModal from '@/components/clipad/features/ExtensionSettingsModal';`;
if (!c.includes('ExtensionSettingsModal')) {
  c = c.replace(/import \{ format \} from 'date-fns';/g, "import { format } from 'date-fns';\n" + importAdd);
}

c = c.replace(/const \[selectedCapture, setSelectedCapture\] = useState\(null\);/g, `const [selectedCapture, setSelectedCapture] = useState(null);\n  const [showExtensionModal, setShowExtensionModal] = useState(false);`);

c = c.replace(
  /<button onClick=\{fetchCaptures\} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors">\s*<RefreshCw className=\{`w-5 h-5 \$\{loading \? 'animate-spin' : ''\}`\} \/>\s*<\/button>/g,
  `<div className="flex items-center gap-2">
            <button onClick={() => setShowExtensionModal(true)} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl font-semibold text-sm transition-colors shadow-sm">
              <Settings2 className="w-4 h-4" /> Extension Settings
            </button>
            <button onClick={fetchCaptures} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors">
              <RefreshCw className={\`w-5 h-5 \${loading ? 'animate-spin' : ''}\`} />
            </button>
          </div>`
);

c = c.replace(
  /<\/div>\n  \);\n\}\n/g,
  `
      {showExtensionModal && <ExtensionSettingsModal onClose={() => setShowExtensionModal(false)} />}
    </div>
  );
}
`
);

fs.writeFileSync('src/pages/clipad/CaptureInbox.jsx', c);
