const fs = require('fs');
let c = fs.readFileSync('src/components/clipad/chat/SpaceChat.jsx', 'utf8');
c = c.replace(/import \{ Hash, Plus, Send, MessageSquare, Sparkles, Loader2, Menu, X \} from 'lucide-react';/, "import { Hash, Plus, Send, MessageSquare, Sparkles, Loader2, Menu, X, Search } from 'lucide-react';");
fs.writeFileSync('src/components/clipad/chat/SpaceChat.jsx', c);
