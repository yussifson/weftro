const fs = require('fs');

let content = fs.readFileSync('src/components/clipad/CanvasWhiteboard.jsx', 'utf8');

content = content.replace("import { Sparkles, Brain, Loader2, X } from 'lucide-react';", "import { Sparkles, Brain, Loader2, X, MousePointer2, Pen, Eraser, Minus, ArrowRight, Square, Circle, StickyNote, Type, Image as ImageIcon, Grid, ZoomIn, Undo, Redo, ChevronDown, ChevronUp } from 'lucide-react';");

content = content.replace(/const TOOLS = \[[\s\S]*?\];/, "const TOOLS = [\n  { id: 'select',  label: 'Select',       icon: <MousePointer2 size={16} />, shortcut: 'V' },\n  { id: 'pen',     label: 'Pen',          icon: <Pen size={16} />, shortcut: 'P' },\n  { id: 'eraser',  label: 'Eraser',       icon: <Eraser size={16} />,  shortcut: 'E' },\n  { id: 'line',    label: 'Line',         icon: <Minus size={16} />,  shortcut: 'L' },\n  { id: 'arrow',   label: 'Arrow',        icon: <ArrowRight size={16} />,  shortcut: 'A' },\n  { id: 'rect',    label: 'Rectangle',    icon: <Square size={16} />,  shortcut: 'R' },\n  { id: 'circle',  label: 'Circle',       icon: <Circle size={16} />,  shortcut: 'C' },\n  { id: 'sticky',  label: 'Sticky Note',  icon: <StickyNote size={16} />, shortcut: 'N' },\n  { id: 'text',    label: 'Text',         icon: <Type size={16} />,  shortcut: 'T' },\n  { id: 'image',   label: 'Image',        icon: <ImageIcon size={16} />, shortcut: 'I' },\n];");

content = content.replace(/Tools \{showMobileTools \? '[^']+' : '[^']+'\}/, "Tools {showMobileTools ? <ChevronUp size={16} /> : <ChevronDown size={16} />}");
content = content.replace(/o\s+Close/, "Close");
content = content.replace(">Sz<", "><Grid size={16} /><");
content = content.replace(">ST<", "><ZoomIn size={16} /><");

content = content.replace('title="Undo">"<', 'title="Undo"><Undo size={14} /><');
content = content.replace('title="Redo">"<', 'title="Redo"><Redo size={14} /><');

fs.writeFileSync('src/components/clipad/CanvasWhiteboard.jsx', content, 'utf8');
