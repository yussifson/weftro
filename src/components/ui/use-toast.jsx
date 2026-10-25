import { toast as hotToast } from "react-hot-toast";
import { useState, useEffect } from "react";

function toast({ title, description, variant, duration, ...props }) {
  const message = description ? (title ? `${title}: ${description}` : description) : (title || "Notification");
  
  // Custom styling: Sleek, subtle, unobtrusive pill with gentle glassmorphism
  const options = {
    className: "text-xs font-medium px-3.5 py-2 rounded-xl shadow-lg border border-black/10 dark:border-white/10 backdrop-blur-md transition-all",
    duration: duration || (variant === "destructive" ? 3000 : 2500),
    style: {
      background: 'rgba(15, 23, 42, 0.90)',
      color: '#f8fafc',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
      maxWidth: '340px',
      fontSize: '12px',
      lineHeight: '1.35',
      letterSpacing: '0.01em',
    }
  };

  if (variant === "destructive") {
    hotToast.error(message, {
      ...options,
      style: {
        ...options.style,
        background: 'rgba(220, 38, 38, 0.92)',
        color: '#ffffff',
      }
    });
  } else {
    hotToast.success(message, {
      ...options,
      style: {
        ...options.style,
        background: 'rgba(15, 23, 42, 0.92)',
        color: '#f8fafc',
      }
    });
  }

  return {
    id: "dummy",
    dismiss: () => {},
    update: () => {}
  };
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: () => {}
  };
}

export { useToast, toast };
