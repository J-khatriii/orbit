import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn.js";

const ToastContext = createContext(null);

const styles = {
  success: "bg-sage-50 text-sage-700 ring-sage-200",
  error: "bg-clay-50 text-clay-700 ring-clay-100",
  info: "bg-surface text-ink ring-line",
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => {
      return current.filter((toast) => {
        return toast.id !== id;
      });
    });
  }, []);

  const show = useCallback(
    (message, { type = "info", duration = 4000 } = {}) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => {
        return [...current, { id, message, type }];
      });
      setTimeout(() => {
        return dismiss(id);
      }, duration);
    },
    [dismiss],
  );

  const value = useMemo(() => {
    return {
      show,
      success: (message, options) => {
        return show(message, { ...options, type: "success" });
      },
      error: (message, options) => {
        return show(message, { ...options, type: "error" });
      },
      dismiss,
    };
  }, [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2"
      >
        {toasts.map((toast) => {
          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start justify-between gap-3 rounded-control px-4 py-3 text-sm shadow-pop ring-1",
                styles[toast.type],
              )}
            >
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={() => {
                  return dismiss(toast.id);
                }}
                aria-label="Dismiss"
                className="opacity-50 transition-opacity hover:opacity-100"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
};
