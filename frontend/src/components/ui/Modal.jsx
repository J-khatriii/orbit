import { useEffect, useRef } from "react";

const Modal = ({ open, onClose, title, children, footer }) => {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-full max-w-md rounded-card bg-surface p-0 text-ink shadow-pop backdrop:bg-ink/40"
    >
      <div className="p-7">
        <h2 className="font-display text-3xl leading-tight">{title}</h2>
        <div className="mt-3 text-sm leading-relaxed text-ink-soft">{children}</div>
      </div>

      {footer && (
        <div className="flex justify-end gap-2 border-t border-line bg-sunken/60 px-7 py-4">
          {footer}
        </div>
      )}
    </dialog>
  );
};

export default Modal;
