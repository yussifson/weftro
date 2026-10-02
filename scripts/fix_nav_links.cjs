const fs = require('fs');

// 1. Fix ClipadSidebar path
let sb = fs.readFileSync('src/components/clipad/ClipadSidebar.jsx', 'utf8');
sb = sb.replace(/{ label: 'Analytics', path: '\/analytics', icon: BarChart2 }/g, "{ label: 'Analytics', path: '/integration-analytics', icon: BarChart2 }");
fs.writeFileSync('src/components/clipad/ClipadSidebar.jsx', sb);

// 2. Add Video Analytics to Studio dropdown in ClipadTopNav
let tn = fs.readFileSync('src/components/clipad/ClipadTopNav.jsx', 'utf8');

// Also make sure BarChart3 is imported in ClipadTopNav if it isn't
if (!tn.includes('BarChart3')) {
  tn = tn.replace(/import \{([^}]+)\} from 'lucide-react';/g, "import { $1, BarChart3 } from 'lucide-react';");
}

const newDropdownItem = `              <DropdownMenuItem onClick={() => navigate('/analytics')} className="cursor-pointer font-bold py-2.5 rounded-xl text-white hover:bg-white/10 focus:bg-white/10 transition-colors">
                <BarChart3 className="w-4 h-4 mr-2.5 text-[#fad503]" /> Video Analytics
              </DropdownMenuItem>
            </DropdownMenuContent>`;
tn = tn.replace(/<\/DropdownMenuContent>/, newDropdownItem);
fs.writeFileSync('src/components/clipad/ClipadTopNav.jsx', tn);
