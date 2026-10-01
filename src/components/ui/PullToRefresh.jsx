import React, { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { queryClientInstance } from '@/lib/query-client';

export default function PullToRefresh({ onRefresh, children, className = "" }) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef(null);

  const pullDistance = currentY - startY;
  const threshold = 80; 
  // Only allow pull if we are at the very top of the scroll container
  const isEligible = pullDistance > 0 && scrollRef.current?.scrollTop <= 0;

  const handleTouchStart = (e) => {
    if (scrollRef.current?.scrollTop <= 0) {
      setStartY(e.touches[0].clientY);
      setCurrentY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing) return;
    const y = e.touches[0].clientY;
    
    if (y > startY && scrollRef.current?.scrollTop <= 0) {
      setCurrentY(y);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    setIsPulling(false);
    
    if (isEligible && pullDistance > threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          // Invalidate all React Query caches to seamlessly fetch new data
          if (queryClientInstance) {
            await queryClientInstance.invalidateQueries();
          }
          // Also trigger a global event in case other listeners need to sync
          window.dispatchEvent(new CustomEvent('app:refresh'));
          
          // Wait briefly to show the spinner spinning, giving satisfying feedback
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } finally {
        setIsRefreshing(false);
      }
    }
    setStartY(0);
    setCurrentY(0);
  };

  return (
    <div 
      className={`flex flex-col h-full w-full overflow-hidden relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex justify-center items-center overflow-hidden transition-all duration-200 z-10"
        style={{ 
          height: isRefreshing ? '60px' : (isEligible ? Math.min(pullDistance, 100) + 'px' : '0px'),
          opacity: (isEligible || isRefreshing) ? 1 : 0
        }}
      >
        <div className={`p-2 bg-white dark:bg-card rounded-full shadow-md transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
             style={{ transform: `rotate(${Math.min(pullDistance * 3, 360)}deg)` }}>
          <Loader2 className="w-5 h-5 text-primary" />
        </div>
      </div>
      
      {/* Scrollable Content Container */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto relative z-20 w-full"
        style={{ 
          transform: isEligible && !isRefreshing ? `translateY(${Math.min(pullDistance * 0.4, 60)}px)` : 
                     isRefreshing ? 'translateY(60px)' : 'translateY(0)',
          transition: isPulling ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
}
