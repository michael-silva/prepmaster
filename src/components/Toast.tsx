import { useToastStore, type ToastType } from "@/stores/toastStore";

const typeColors: Record<ToastType, { bg: string; border: string }> = {
  success: { bg: "rgba(76, 175, 80, 0.95)", border: "rgba(129, 199, 132, 0.6)" },
  error: { bg: "rgba(211, 47, 47, 0.95)", border: "rgba(239, 83, 80, 0.6)" },
  info: { bg: "rgba(30, 90, 50, 0.95)", border: "rgba(124, 184, 130, 0.6)" },
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div style={containerStyle}>
      {toasts.map((toast) => {
        const colors = typeColors[toast.type];
        return (
          <div
            key={toast.id}
            role="alert"
            style={{
              ...toastStyle,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
            }}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: "1.5rem",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  width: "min(90vw, 400px)",
  pointerEvents: "none",
};

const toastStyle: React.CSSProperties = {
  padding: "0.875rem 1.25rem",
  borderRadius: "10px",
  color: "#fff",
  fontSize: "0.95rem",
  fontWeight: 500,
  lineHeight: 1.4,
  cursor: "pointer",
  pointerEvents: "auto",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
  animation: "toastSlideIn 0.3s ease-out",
};
