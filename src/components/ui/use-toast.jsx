import { toast as hotToast } from "react-hot-toast";
import { useState, useEffect } from "react";

function toast({ title, description, variant, ...props }) {
  const message = description ? (title ? `${title}: ${description}` : description) : (title || "Notification");
  
  const options = {
    className: "dark:bg-secondary dark:text-white border dark:border-border shadow-lg font-medium",
    duration: props.duration || 3000
  };

  if (variant === "destructive") {
    hotToast.error(message, options);
  } else {
    hotToast.success(message, options);
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
