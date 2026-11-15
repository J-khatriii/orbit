import { useEffect, useRef } from "react";
import { Download, ExternalLink, X } from "lucide-react";
import { isImage } from "../../features/files/files.js";

const linkClass = "inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink";

const FilePreview = ({ name, contentType, inlineUrl, downloadHref, onClose }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog.open) {
      dialog.showModal();
    }
  }, []);

  // A click on the dark area around the box (the dialog itself, not its content) closes it.
  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={name}
      onClose={onClose}
      onClick={handleBackdropClick}
      className="m-auto w-[min(92vw,64rem)] rounded-card bg-surface p-0 text-ink shadow-card backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 truncate text-sm font-medium" title={name}>
            {name}
          </p>
          <div className="flex items-center gap-4">
            <a href={downloadHref} className={linkClass}>
              <Download className="size-4" aria-hidden="true" />
              Download
            </a>
            <a href={inlineUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
              <ExternalLink className="size-4" aria-hidden="true" />
              Open in new tab
            </a>
            <button type="button" onClick={onClose} className={linkClass}>
              <X className="size-4" aria-hidden="true" />
              Close
            </button>
          </div>
        </div>

        <div className="flex justify-center overflow-auto rounded-md bg-sunken">
          {isImage(contentType) ? (
            <img src={inlineUrl} alt={name} className="max-h-[75vh] max-w-full object-contain" />
          ) : (
            <iframe src={inlineUrl} title={name} className="h-[75vh] w-full" />
          )}
        </div>
      </div>
    </dialog>
  );
};

export default FilePreview;
