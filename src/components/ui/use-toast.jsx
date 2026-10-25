import { toast as hotToast } from "react-hot-toast";
import { useState, useEffect } from "react";

function toast({ title, description, variant, duration, ...props }) {
  const message = description ? (title ? `${title}: ${description}` : description) : (title || "Notification");
  
  // Executive corporate glassmorphic pill - bottom-left positioned, completely out of way of participant tiles
  const options = {
    className: "text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl border border-white/10 backdrop-blur-xl transition-all",
    duration: duration || (variant === "destructive" ? 3000 : 2500),
    style: {
      background: 'rgba(15, 23, 42, 0.92)',
      color: '#f8fafc',
      boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.4)',
      maxWidth: '360px',
      fontSize: '12px',
      lineHeight: '1.4',
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
