import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pen, Eraser, Download, Check } from "lucide-react";

export default function SignatureCanvas({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000000"; // Black ink
      
      // Setup High-DPI Canvas
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
    }
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    const coords = getCoordinates(e);
    if (!ctx || !coords) return;
    
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    const coords = getCoordinates(e);
    if (!ctx || !coords) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handleSave = () => {
    if (!hasSignature) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Pen className="w-5 h-5 text-primary" />
          Draw Signature
        </h3>
        <Button variant="ghost" size="sm" onClick={clearCanvas} className="text-muted-foreground hover:text-foreground gap-2">
          <Eraser className="w-4 h-4" />
          Clear
        </Button>
      </div>
      
      <div className="relative w-full h-64 bg-white dark:bg-slate-50 border-2 border-dashed border-border rounded-xl overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair touch-none"
        />
        {!hasSignature && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
            <p className="text-2xl font-caveat text-slate-400 select-none">Sign Here</p>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-end gap-3 mt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!hasSignature} className="gap-2">
          <Check className="w-4 h-4" />
          Save Signature
        </Button>
      </div>
    </div>
  );
}
