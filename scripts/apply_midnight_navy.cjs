const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

// We find the `.dark { ... }` block and replace it.
// Note there might be two `.dark` blocks or one large one. We'll replace the first one that has `--background:`
const midnightNavy = `  .dark {
    --bg-base-rgb-dark: 10, 15, 28;

    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

    /* Midnight Navy Theme */
    --background: 223 47% 7%; /* #0A0F1C */
    --foreground: 210 28% 93%; /* #E8EDF2 */
    
    /* Surface #131A2C */
    --card: 223 40% 12%; 
    --card-foreground: 210 28% 93%;
    --popover: 223 40% 12%;
    --popover-foreground: 210 28% 93%;
    
    /* Surface Raised #1A2238 */
    --secondary: 224 37% 16%;
    --secondary-foreground: 210 28% 93%;
    
    /* Muted Text #94A3B8 */
    --muted: 223 40% 12%; /* same as card */
    --muted-foreground: 215 20% 65%;
    
    /* Primary #006065 */
    --primary: 183 100% 20%;
    --primary-foreground: 0 0% 100%;
    
    /* Border Strong #2B3B56 */
    --accent: 218 33% 25%;
    --accent-foreground: 210 28% 93%;
    
    /* Destructive */
    --destructive: 0 62% 30%;
    --destructive-foreground: 0 0% 98%;
    
    /* Border #1F2E47 */
    --border: 218 39% 20%;
    --input: 218 39% 20%;
    --ring: 183 100% 20%;
    
    /* Charts */
    --chart-1: 183 100% 20%;
    --chart-2: 51 98% 50%; /* gold */
    --chart-3: 183 50% 60%; /* link color approx */
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
    
    /* Sidebar #0D1626 */
    --sidebar-background: 218 49% 10%;
    --sidebar-foreground: 215 20% 65%;
    --sidebar-primary: 183 100% 20%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 218 33% 25%;
    --sidebar-accent-foreground: 210 28% 93%;
    --sidebar-border: 218 39% 20%;
    --sidebar-ring: 183 100% 20%;
    
    --color-surface-2: rgba(255,255,255,0.05);
    --color-surface-3: rgba(255,255,255,0.1);
    --color-surface-4: rgba(255,255,255,0.15);
  }`;

css = css.replace(/\.dark\s*\{[^}]*--background:[^}]*\}/, midnightNavy);

fs.writeFileSync('src/index.css', css);
