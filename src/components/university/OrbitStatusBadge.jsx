import React from 'react';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function OrbitStatusBadge({ status, label, pulse = false }) {
  // Map statuses to visual treatments
  let colorClass = '';
  let dotClass = '';
  let dotPulse = pulse;

  switch (status.toLowerCase()) {
    case 'active':
    case 'enrolled':
    case 'success':
      colorClass = 'bg-[var(--color-success-subtle)] text-[var(--color-success)]';
      dotClass = 'bg-[var(--color-success)]';
      break;
    case 'pending':
    case 'warning':
    case 'at-risk':
      colorClass = 'bg-[var(--color-warning-subtle)] text-[var(--color-warning)]';
      dotClass = 'bg-[var(--color-warning)]';
      if (status.toLowerCase() === 'at-risk') dotPulse = true;
      break;
    case 'inactive':
    case 'disabled':
      colorClass = 'bg-[var(--color-surface-4)] text-[var(--color-text-tertiary)]';
      dotClass = 'bg-[var(--color-text-tertiary)]';
      break;
    case 'danger':
    case 'declined':
    case 'failed':
      colorClass = 'bg-[var(--color-danger-subtle)] text-[var(--color-danger)]';
      dotClass = 'bg-[var(--color-danger)]';
      break;
    case 'info':
    case 'new':
      colorClass = 'bg-[var(--color-info-subtle)] text-[var(--color-info)]';
      dotClass = 'bg-[var(--color-info)]';
      break;
    default:
      colorClass = 'bg-[var(--color-surface-3)] text-[var(--color-text-primary)]';
      dotClass = 'bg-[var(--color-text-secondary)]';
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-2.5 px-2 py-0.5 border-[0.5px] border-black/9 dark:border-white/8 border-transparent rounded-md-[var(--radius-full)] text-[var(--text-xs)] font-semibold tracking-[var(--tracking-wide)] uppercase",
      colorClass
    )}>
      <span className="relative flex h-[4px] w-[4px] shrink-0">
        {dotPulse && (
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", dotClass)} />
        )}
        <span className={cn("relative inline-flex rounded-full h-[4px] w-[4px]", dotClass)} />
      </span>
      {label || status}
    </div>
  );
}
