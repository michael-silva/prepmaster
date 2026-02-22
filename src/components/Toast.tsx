import * as ToastPrimitive from "@radix-ui/react-toast";
import { useToastStore, type ToastType } from "@/stores/toastStore";

const TYPE_CLASSES: Record<ToastType, string> = {
  success: "bg-success/95 border-success/60",
  error: "bg-error/95 border-error/60",
  info: "bg-elevated border-accent/60",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <ToastPrimitive.Provider swipeDirection="down" duration={4000}>
      {toasts.map((toast) => (
        <ToastPrimitive.Root
          key={toast.id}
          open
          onOpenChange={(open) => { if (!open) removeToast(toast.id); }}
          className={`
            border rounded-lg px-5 py-3.5 text-[0.95rem] font-medium leading-snug
            cursor-pointer pointer-events-auto shadow-lg shadow-black/40
            animate-toast-in text-white
            ${TYPE_CLASSES[toast.type]}
          `}
        >
          <ToastPrimitive.Title>{toast.message}</ToastPrimitive.Title>
        </ToastPrimitive.Root>
      ))}

      <ToastPrimitive.Viewport
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[min(90vw,400px)] pointer-events-none"
      />
    </ToastPrimitive.Provider>
  );
}
