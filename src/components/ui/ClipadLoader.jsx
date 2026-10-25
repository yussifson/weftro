import React from 'react';
import { PageLoader, OrbitLoader } from '@/components/ui/orbit-loader';

export default function ClipadLoader({ 
  text = "Loading...", 
  fullScreen = false, 
  size = "md",
  className = "" 
}) {
  if (fullScreen) {
    return <PageLoader label={text || "Loading..."} />;
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 w-full h-full min-h-[160px] animate-in fade-in duration-200 ${className}`}>
      <OrbitLoader size={size} label={text || "Loading"} />
      {text && (
        <span className="mt-4 text-xs font-semibold text-muted-foreground tracking-wide animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
}
