import fs from 'fs';
import path from 'path';

function fixHeaderResponsive(file) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) return;
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace hard flex headers with wrapping flex headers
    content = content.replace(/className="flex items-start justify-between mb-4 gap-3"/g, 'className="flex flex-wrap items-center justify-between mb-4 gap-3"');
    content = content.replace(/className="flex items-center justify-between mb-4"/g, 'className="flex flex-wrap items-center justify-between mb-4 gap-3"');
    content = content.replace(/className="flex items-center justify-between mb-4 gap-3"/g, 'className="flex flex-wrap items-center justify-between mb-4 gap-3"');
    
    // Ensure title truncates if necessary, or let it wrap. "leading-tight" -> "leading-tight"
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Fixed headers in', file);
}

fixHeaderResponsive('src/components/clipad/features/CommitmentTracker.jsx');
fixHeaderResponsive('src/components/clipad/features/BlockerRadar.jsx');
fixHeaderResponsive('src/components/clipad/features/RedundantWorkAlert.jsx');

