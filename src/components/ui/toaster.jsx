import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport} from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, onOpenChange, ...props }) {
        // If open is false, the toast is dismissing. We can hide it by checking props.open.
        // Shadcn UI uses Radix UI which manages open state internally, but since this is a custom implementation,
        // we should just hide it if !props.open.
        if (props.open === false) return null;

        return (
          <Toast key={id} {...props}>
            <div className="grid gap-2">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose onClick={() => dismiss(id)} />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
} 
