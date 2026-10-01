import React, { useState, useEffect, useCallback } from 'react';
import { useChatDock } from '@/hooks/useChatDock';

export default function DockResizer() {
  const { setDockWidth } = useChatDock();
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    // The panel is on the right, so the width is the total window width minus the mouse X position
    const newWidth = document.body.clientWidth - e.clientX;
    // Set some min and max constraints
    if (newWidth > 300 && newWidth < 800) {
      setDockWidth(newWidth);
    }
  }, [isDragging, setDockWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`absolute left-0 top-0 bottom-0 w-3 cursor-col-resize z-[100] bg-transparent`}
      style={{ transform: 'translateX(-50%)' }}
    />
  );
}
