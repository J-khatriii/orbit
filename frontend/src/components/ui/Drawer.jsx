import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// A panel that slides over the page from the left, on small screens only.
// While it's open: the page behind can't scroll, Tab stays inside the panel, Escape closes it,
// and focus goes back to the button that opened it.
const Drawer = ({ open, onClose, label, children }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      onClose();

      return;
    }
    if (event.key !== "Tab") {
      return;
    }

    // Keep keyboard focus inside the panel: wrap from the last item to the first and back.
    const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];

    if (items.length === 0) {
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-ink/40" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-line bg-canvas px-4 py-6 shadow-pop outline-none"
      >
        {children}
      </div>
    </div>
  );
};

export default Drawer;
