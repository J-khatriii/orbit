import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn.js";

const ALIGN_CLASSES = { left: "left-0 min-w-64", right: "right-0 min-w-48" };

// A button that opens a floating panel.
//   renderTrigger({ open, toggle, ref })  draws the button. Put `ref` on it.
//   children                              the panel's content. It can be a function that
//                                         receives { close }, handy for "pick, then close".
//   placement                             "bottom" opens below the button, "top" above it
//   fullWidth                             make the panel as wide as the button
// Closes on outside click and on Escape (and Escape returns focus to the button).
const Dropdown = ({
  renderTrigger,
  placement = "bottom",
  align = "left",
  fullWidth = false,
  className,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setOpen((current) => {
      return !current;
    });
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  const handleKeyDown = (event) => {
    if (open && event.key === "Escape") {
      // Stop here, so a surrounding panel (like the mobile menu) doesn't close as well.
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)} onKeyDown={handleKeyDown}>
      {renderTrigger({ open, toggle, ref: triggerRef })}
      {open && (
        <div
          className={cn(
            "absolute z-30 rounded-card bg-surface p-1.5 shadow-pop ring-1 ring-line",
            fullWidth ? "inset-x-0" : ALIGN_CLASSES[align],
            placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {typeof children === "function" ? children({ close }) : children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
