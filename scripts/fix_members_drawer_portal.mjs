import fs from 'fs';
import path from 'path';

let file = path.join(process.cwd(), 'src/pages/clipad/SpaceDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { createPortal } from \'react-dom\'') && !content.includes('import { createPortal } from "react-dom"')) {
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { createPortal } from 'react-dom';");
}

const targetStart = "{showMembers && (";
const targetEnd = "  )}"; // This is tricky, I'll use regex.

const drawerRegex = /\{showMembers && \([\s\S]*?<div className="fixed inset-0 z-\[100\] flex justify-end">[\s\S]*?<\/div>\s*<\/div>\s*\)\}/;

const match = content.match(drawerRegex);
if (match) {
    let originalDrawer = match[0];
    
    // Replace the {showMembers && (...)} with {showMembers && createPortal(..., document.body)}
    let newDrawer = originalDrawer.replace("{showMembers && (", "{showMembers && createPortal(");
    newDrawer = newDrawer.replace(/\}$/, ", document.body)}");
    
    content = content.replace(originalDrawer, newDrawer);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Portal added successfully!");
} else {
    console.error("Could not find drawer regex.");
}
