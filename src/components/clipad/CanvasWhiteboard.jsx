import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Sparkles, Brain, Loader2, X, MousePointer2, Pen, Eraser, Minus, ArrowRight, Square, Circle, StickyNote, Type, Image as ImageIcon, Grid, ZoomIn, Undo, Redo, ChevronDown, ChevronUp } from 'lucide-react';
import { generateText } from '@/lib/cloudflareAI';

// â”€â”€ Tool definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TOOLS = [
  { id: 'select',  label: 'Select',       icon: <MousePointer2 size={16} />, shortcut: 'V' },
  { id: 'pen',     label: 'Pen',          icon: <Pen size={16} />, shortcut: 'P' },
  { id: 'eraser',  label: 'Eraser',       icon: <Eraser size={16} />,  shortcut: 'E' },
  { id: 'line',    label: 'Line',         icon: <Minus size={16} />,  shortcut: 'L' },
  { id: 'arrow',   label: 'Arrow',        icon: <ArrowRight size={16} />,  shortcut: 'A' },
  { id: 'rect',    label: 'Rectangle',    icon: <Square size={16} />,  shortcut: 'R' },
  { id: 'circle',  label: 'Circle',       icon: <Circle size={16} />,  shortcut: 'C' },
  { id: 'sticky',  label: 'Sticky Note',  icon: <StickyNote size={16} />, shortcut: 'N' },
  { id: 'text',    label: 'Text',         icon: <Type size={16} />,  shortcut: 'T' },
  { id: 'image',   label: 'Image',        icon: <ImageIcon size={16} />, shortcut: 'I' },
];

const PALETTE = [
  '#111827','#6b7280','#ffffff',
  '#ef4444','#f97316','#eab308',
  '#22c55e','#06b6d4','#3b82f6',
  '#8b5cf6','#ec4899','#10b981',
];

const STICKY_COLORS = ['#fef08a','#bbf7d0','#bfdbfe','#fecaca','#e9d5ff','#fed7aa'];
const SIZES = [2, 4, 8, 16];

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getClientPos(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function drawArrow(ctx, x1, y1, x2, y2, size) {
  const headLen = Math.max(10, size * 5);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function drawShape(ctx, start, end, tool, color, size) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (tool === 'line') {
    ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
  } else if (tool === 'arrow') {
    drawArrow(ctx, start.x, start.y, end.x, end.y, size);
  } else if (tool === 'rect') {
    ctx.beginPath(); ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
  } else if (tool === 'circle') {
    const rx = (end.x - start.x) / 2, ry = (end.y - start.y) / 2;
    ctx.beginPath(); ctx.ellipse(start.x + rx, start.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI); ctx.stroke();
  }
}

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function CanvasWhiteboard({ onClose }) {
  const canvasRef  = useRef(null);
  const ctxRef     = useRef(null);
  const fileRef    = useRef(null);
  const textRef    = useRef(null);

  const isDrawing  = useRef(false);
  const startPos   = useRef({ x: 0, y: 0 });
  const snapshot   = useRef(null);
  const history    = useRef([]);
  const redoStack  = useRef([]);
  const isPanning  = useRef(false);
  const lastPan    = useRef({ x: 0, y: 0 });

  const [tool,         setTool]         = useState('pen');
  const [color,        setColor]        = useState('#111827');
  const [size,         setSize]         = useState(3);
  const [showGrid,     setShowGrid]     = useState(true);
  const [zoom,         setZoom]         = useState(1);
  const [pan,          setPan]          = useState({ x: 0, y: 0 });
  const [textInput,    setTextInput]    = useState(null);   // { x, y, val }
  const [stickies,     setStickies]     = useState([]);     // [{id,x,y,text,bg}]
  const [editSticky,   setEditSticky]   = useState(null);
  const [stickyColor,  setStickyColor]  = useState(STICKY_COLORS[0]);
  const [showPalette,  setShowPalette]  = useState(false);
  const [showMobileTools, setShowMobileTools] = useState(false);

  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);

  const handleAiGenerateDiagram = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    try {
      const response = await generateText([
        {
          role: 'system',
          content: `You are an expert software architect & UX designer AI. The user will ask for a diagram, flowchart, mindmap, or architectural diagram.
Return ONLY valid JSON with a "stickies" array. Each sticky object must have:
- "text": string description or step title
- "x": number coordinate (e.g. 100, 320, 540)
- "y": number coordinate (e.g. 100, 100, 300)
- "bg": hex color string from ['#bfdbfe', '#bbf7d0', '#fef08a', '#e9d5ff', '#fed7aa']
Layout the stickies in a clear grid or workflow sequence. Return ONLY raw JSON without markdown blocks.`
        },
        { role: 'user', content: aiPrompt.trim() }
      ]);

      let text = typeof response === 'string' ? response : response?.response || '';
      text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const parsed = JSON.parse(text);

      if (parsed.stickies && Array.isArray(parsed.stickies)) {
        const newNotes = parsed.stickies.map((s, idx) => ({
          id: `ai-sticky-${Date.now()}-${idx}`,
          x: s.x || (100 + (idx % 3) * 220),
          y: s.y || (100 + Math.floor(idx / 3) * 160),
          text: s.text || 'Step',
          bg: s.bg || STICKY_COLORS[idx % STICKY_COLORS.length]
        }));
        setStickies(prev => [...prev, ...newNotes]);
      }
      setShowAiModal(false);
      setAiPrompt('');
    } catch (err) {
      console.error('AI Diagram generation error:', err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAiSynthesizeBoard = async () => {
    const allText = stickies.map(s => s.text).filter(Boolean).join('\n---\n');
    if (!allText) return;
    setIsAiGenerating(true);
    try {
      const response = await generateText([
        {
          role: 'system',
          content: 'You are an executive assistant. Synthesize the contents of the whiteboard into a structured briefing with 3 sections: 1. Executive Overview, 2. Key Decisions & Nodes, 3. Proposed Action Items.'
        },
        { role: 'user', content: allText }
      ]);
      const summaryText = typeof response === 'string' ? response : response?.response || '';
      setAiSummary(summaryText);
    } catch (err) {
      console.error('AI Board synthesis error:', err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // â”€â”€ Canvas init / resize â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const old  = canvas.toDataURL();
      canvas.width  = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      ctxRef.current = ctx;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = old;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, []);

  // â”€â”€ Grid overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showGrid) return;
    // grid is purely visual via CSS background on parent â€” no canvas needed
  }, [showGrid]);

  // â”€â”€ Pointer helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toCanvas = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top  - pan.y) / zoom,
    };
  }, [zoom, pan]);

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    history.current.push(canvas.toDataURL());
    if (history.current.length > 60) history.current.shift();
    redoStack.current = [];
  }, []);

  const applyCtxStyle = useCallback((ctx) => {
    ctx.strokeStyle = color;
    ctx.fillStyle   = color;
    ctx.lineWidth   = size;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }, [color, size]);

  // â”€â”€ Undo / Redo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const undo = useCallback(() => {
    const canvas = canvasRef.current, ctx = ctxRef.current;
    if (!canvas || !ctx || !history.current.length) return;
    redoStack.current.push(canvas.toDataURL());
    const prev = history.current.pop();
    const img  = new Image();
    img.onload = () => { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0); };
    img.src = prev;
  }, []);

  const redo = useCallback(() => {
    const canvas = canvasRef.current, ctx = ctxRef.current;
    if (!canvas || !ctx || !redoStack.current.length) return;
    history.current.push(canvas.toDataURL());
    const next = redoStack.current.pop();
    const img  = new Image();
    img.onload = () => { ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(img,0,0); };
    img.src = next;
  }, []);

  const clearBoard = useCallback(() => {
    const canvas = canvasRef.current, ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    saveHistory();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    setStickies([]);
  }, [saveHistory]);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  // â”€â”€ Image import â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current, ctx = ctxRef.current;
        if (!canvas || !ctx) return;
        saveHistory();
        const maxW = canvas.width * 0.5;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const cx = (canvas.width  - img.width  * scale) / 2;
        const cy = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, cx, cy, img.width * scale, img.height * scale);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [saveHistory]);

  // â”€â”€ Pointer events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    const { x: cx, y: cy } = getClientPos(e);

    // Middle mouse or space+drag â†’ pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      lastPan.current = { x: cx, y: cy };
      return;
    }

    if (tool === 'image') { fileRef.current?.click(); return; }

    if (tool === 'sticky') {
      const pos = toCanvas(cx, cy);
      setStickies(prev => [...prev, { id: Date.now(), x: pos.x, y: pos.y, text: '', bg: stickyColor }]);
      setEditSticky(Date.now()); // will not match yet â€” set after state update
      return;
    }

    if (tool === 'text') {
      const pos = toCanvas(cx, cy);
      setTextInput({ x: pos.x, y: pos.y, val: '' });
      setTimeout(() => textRef.current?.focus(), 30);
      return;
    }

    const ctx    = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    saveHistory();
    isDrawing.current = true;
    const pos = toCanvas(cx, cy);
    startPos.current = pos;

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    applyCtxStyle(ctx);

    if (tool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = size * 5;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else {
      snapshot.current = canvas.toDataURL();
    }
    ctx.restore();
  }, [tool, toCanvas, saveHistory, applyCtxStyle, pan, zoom, size, stickyColor]);

  const onPointerMove = useCallback((e) => {
    e.preventDefault();
    const { x: cx, y: cy } = getClientPos(e);

    if (isPanning.current) {
      const dx = cx - lastPan.current.x;
      const dy = cy - lastPan.current.y;
      lastPan.current = { x: cx, y: cy };
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      return;
    }

    if (!isDrawing.current) return;
    const ctx = ctxRef.current, canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const pos = toCanvas(cx, cy);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    applyCtxStyle(ctx);

    if (tool === 'pen') {
      ctx.lineTo(pos.x, pos.y); ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = size * 5;
      ctx.lineCap     = 'round';
      ctx.lineTo(pos.x, pos.y); ctx.stroke();
    } else if (snapshot.current) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(-pan.x / zoom, -pan.y / zoom, canvas.width / zoom, canvas.height / zoom);
        ctx.drawImage(img, -pan.x / zoom, -pan.y / zoom, canvas.width / zoom, canvas.height / zoom);
        drawShape(ctx, startPos.current, pos, tool, color, size);
      };
      img.src = snapshot.current;
    }
    ctx.restore();
  }, [tool, toCanvas, applyCtxStyle, pan, zoom, color, size]);

  const onPointerUp = useCallback((e) => {
    e.preventDefault();
    if (isPanning.current) { isPanning.current = false; return; }
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const ctx = ctxRef.current, canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const { x: cx, y: cy } = getClientPos(e);
    const pos = toCanvas(cx, cy);

    if (snapshot.current && !['pen','eraser'].includes(tool)) {
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
      applyCtxStyle(ctx);
      drawShape(ctx, startPos.current, pos, tool, color, size);
      ctx.restore();
    }
    ctx.beginPath();
    snapshot.current = null;
  }, [tool, toCanvas, applyCtxStyle, pan, zoom, color, size]);

  // â”€â”€ Text submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const submitText = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !textInput?.val?.trim()) { setTextInput(null); return; }
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    ctx.font = `${Math.max(14, size * 5)}px Inter, sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(textInput.val, textInput.x, textInput.y);
    ctx.restore();
    setTextInput(null);
  }, [textInput, color, size, pan, zoom]);

  // â”€â”€ Zoom â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(z => Math.max(0.2, Math.min(5, z + delta)));
  }, []);

  // â”€â”€ Keyboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const fn = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Escape') { setTextInput(null); setEditSticky(null); }
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(5, z + 0.1));
      if (e.key === '-') setZoom(z => Math.max(0.2, z - 0.1));
      if (e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }); }
      TOOLS.forEach(t => { if (e.key.toLowerCase() === t.shortcut?.toLowerCase()) setTool(t.id); });
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [undo, redo]);

  const zoomPct = Math.round(zoom * 100);
  const cursorMap = { select: 'default', pen: 'crosshair', eraser: 'cell', text: 'text', image: 'pointer', sticky: 'copy' };
  const cursor = cursorMap[tool] || 'crosshair';

  return (
    <div className="absolute inset-0 z-[9999] flex flex-col bg-white select-none" style={{ touchAction: 'none', fontFamily: "'Inter', sans-serif" }}>
      {/* â”€â”€ Mobile Toolbar Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex md:hidden items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200 flex-shrink-0 shadow-sm relative z-[10000]">
        <button onClick={() => setShowMobileTools(!showMobileTools)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm text-slate-700">
          Tools {showMobileTools ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button onClick={onClose} className="px-4 py-1.5 rounded-xl bg-[#006065] hover:bg-[#004e52] text-white text-xs font-bold shadow-sm flex items-center gap-1.5">
          âœ• Close
        </button>
      </div>

      {/* â”€â”€ Toolbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className={`${showMobileTools ? 'flex absolute top-[53px] left-0 right-0 bg-slate-50 border-b p-3 z-[9999] shadow-xl flex-wrap' : 'hidden'} md:flex items-center gap-1.5 md:px-3 md:py-1.5 md:bg-slate-50 md:border-b border-slate-200 flex-shrink-0 flex-wrap md:shadow-sm md:static`}>

        {/* Tool group */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setTool(t.id)} title={`${t.label} (${t.shortcut})`}
              className={`w-8 h-8 rounded-lg text-sm font-medium flex items-center justify-center transition-all ${tool === t.id ? 'bg-[#006065] text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}>
              {t.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-7 bg-slate-200 mx-1" />

        {/* Color palette */}
        <div className="relative">
          <button onClick={() => setShowPalette(p => !p)}
            className="w-8 h-8 rounded-xl border-2 border-white shadow-md ring-2 ring-slate-200 transition-transform hover:scale-110"
            style={{ background: color }} title="Color" />
          {showPalette && (
            <div className="absolute top-10 left-0 z-50 bg-white border border-slate-200 rounded-2xl p-2 shadow-xl grid grid-cols-6 gap-1.5 w-44">
              {PALETTE.map(c => (
                <button key={c} onClick={() => { setColor(c); setShowPalette(false); }}
                  className="w-6 h-6 rounded-full border border-slate-200 hover:scale-125 transition-transform shadow-sm"
                  style={{ background: c, outline: color === c ? '2px solid #059669' : 'none', outlineOffset: 2 }} />
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-6 h-6 rounded-full cursor-pointer border-0 p-0 bg-transparent" title="Custom color" />
            </div>
          )}
        </div>

        {/* Size */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {SIZES.map(s => (
            <button key={s} onClick={() => setSize(s)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${size === s ? 'bg-[#006065]' : 'hover:bg-slate-100'}`}>
              <div className="rounded-full bg-current" style={{ width: Math.min(s + 2, 16), height: Math.min(s + 2, 16), color: size === s ? 'white' : '#334155' }} />
            </button>
          ))}
        </div>

        {tool === 'sticky' && (
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {STICKY_COLORS.map(c => (
              <button key={c} onClick={() => setStickyColor(c)}
                className="w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform"
                style={{ background: c, borderColor: stickyColor === c ? '#059669' : 'transparent' }} />
            ))}
          </div>
        )}

        <div className="w-px h-7 bg-slate-200 mx-1" />

        {/* Actions */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          <button onClick={undo} title="Undo (Ctrl+Z)" className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">â†©</button>
          <button onClick={redo} title="Redo (Ctrl+Y)" className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">â†ª</button>
          <button onClick={() => setShowGrid(g => !g)} title="Toggle grid"
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${showGrid ? 'bg-[#006065] text-white' : 'hover:bg-slate-100 text-slate-600'}`}>âŠž</button>
          <button onClick={download} title="Export PNG" className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 text-sm">ðŸ’¾</button>
          <button onClick={clearBoard} title="Clear" className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-500 text-sm">ðŸ—‘</button>
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-sm text-xs font-semibold text-slate-600">
          <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center font-bold">âˆ’</button>
          <span className="w-10 text-center">{zoomPct}%</span>
          <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center font-bold">+</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="ml-1 text-[#006065] hover:text-[#004e52]" title="Reset view">âŠ™</button>
        </div>

        {/* AI Diagram & Synthesize */}
        <div className="flex items-center gap-1.5 ml-2">
          <button onClick={() => setShowAiModal(true)} title="AI Generate Diagram"
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all">
            <Sparkles className="w-3.5 h-3.5" /> AI Diagram
          </button>
          {stickies.length > 0 && (
            <button onClick={handleAiSynthesizeBoard} disabled={isAiGenerating} title="AI Synthesize Canvas"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50">
              {isAiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5 text-cyan-400" />}
              Synthesize
            </button>
          )}
        </div>

        {/* Close */}
        <button onClick={onClose}
          className="ml-auto px-4 py-1.5 rounded-xl bg-[#006065] hover:bg-[#004e52] text-white text-xs font-bold shadow-sm transition-all hidden md:flex items-center gap-1.5">
          âœ• Close
        </button>
      </div>



      {/* â”€â”€ Canvas area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ background: showGrid ? 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)' : '#ffffff', backgroundSize: showGrid ? '24px 24px' : undefined }}
        onWheel={onWheel}
      >
        <canvas
          ref={canvasRef}
          style={{ cursor, display: 'block', width: '100%', height: '100%', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        />

        {/* Sticky notes overlay */}
        {stickies.map(s => (
          <div key={s.id}
            style={{ position: 'absolute', left: s.x * zoom + pan.x, top: s.y * zoom + pan.y, background: s.bg, width: 180, minHeight: 100, zIndex: 10 }}
            className="rounded-xl shadow-lg border border-black/10 p-3 flex flex-col gap-1 cursor-move group"
            onMouseDown={e => {
              e.stopPropagation();
              const startX = e.clientX, startY = e.clientY;
              const origX = s.x, origY = s.y;
              const move = (ev) => {
                const dx = (ev.clientX - startX) / zoom;
                const dy = (ev.clientY - startY) / zoom;
                setStickies(prev => prev.map(n => n.id === s.id ? { ...n, x: origX + dx, y: origY + dy } : n));
              };
              const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
              window.addEventListener('mousemove', move);
              window.addEventListener('mouseup', up);
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-black/40 uppercase tracking-wide">Note</span>
              <button onClick={() => setStickies(prev => prev.filter(n => n.id !== s.id))}
                className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded flex items-center justify-center text-black/40 hover:text-red-500 text-xs">âœ•</button>
            </div>
            <textarea
              value={s.text}
              onChange={e => setStickies(prev => prev.map(n => n.id === s.id ? { ...n, text: e.target.value } : n))}
              placeholder="Type your note..."
              className="flex-1 bg-transparent resize-none text-sm text-slate-800 placeholder-black/30 outline-none leading-relaxed"
              style={{ minHeight: 60, fontFamily: 'Inter, sans-serif' }}
              onClick={e => e.stopPropagation()}
            />
          </div>
        ))}

        {/* Floating text input */}
        {textInput && (
          <div className="absolute z-20" style={{ left: textInput.x * zoom + pan.x, top: textInput.y * zoom + pan.y - 10 }}>
            <input
              ref={textRef}
              type="text"
              value={textInput.val}
              onChange={e => setTextInput(t => ({ ...t, val: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') submitText(); if (e.key === 'Escape') setTextInput(null); }}
              onBlur={submitText}
              placeholder="Type here..."
              className="outline-none border-b-2 border-indigo-500 bg-transparent text-base min-w-[100px] placeholder-slate-300"
              style={{ color, fontSize: Math.max(14, size * 5), fontFamily: 'Inter, sans-serif' }}
            />
          </div>
        )}
      </div>

      {/* Hidden file input for image import */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      {/* AI Generate Diagram Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" /> Generate AI Diagram
              </h3>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500">Describe the architecture diagram, flowchart, sequence map, or mind map you want Orbit AI to render onto your canvas.</p>
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g., Create a 4-step user authentication & token refresh architecture diagram"
              className="w-full h-24 p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-purple-600 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAiModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={handleAiGenerateDiagram} disabled={isAiGenerating || !aiPrompt.trim()}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2">
                {isAiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Diagram'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Board Synthesis Drawer */}
      {aiSummary && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-800 space-y-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
              <Brain className="w-4 h-4" /> Board AI Briefing
            </h4>
            <button onClick={() => setAiSummary(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto pr-2">
            {aiSummary}
          </div>
        </div>
      )}
    </div>
  );
}

