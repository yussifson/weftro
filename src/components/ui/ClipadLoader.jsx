import React from 'react';
import { PageLoader, OrbitLoader } from '@/components/ui/orbit-loader';

export default function ClipadLoader({ text = "Loading...", fullScreen = false }) {
  if (fullScreen) {
    return <PageLoader label={text} />;
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full h-full min-h-[200px]">
      <OrbitLoader size="lg" label={text} />
      {text && <div className="mt-4 text-xs font-medium text-slate-500 dark:text-muted-foreground tracking-wide animate-pulse">{text}</div>}
    </div>
  );
}
