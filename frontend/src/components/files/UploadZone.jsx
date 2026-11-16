import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { ACCEPT, MAX_UPLOAD_MB } from "../../features/files/files.js";

const UploadZone = ({ onFiles }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    onFiles(Array.from(event.dataTransfer.files));
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handlePick = (event) => {
    const picked = Array.from(event.target.files);

    // Lets the same file be chosen again later.
    event.target.value = "";
    onFiles(picked);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`flex flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
        dragging ? "border-brand-700 bg-sunken" : "border-ink/15"
      }`}
    >
      <Upload className="size-6 text-ink-muted" aria-hidden="true" />
      <p className="text-sm text-ink">
        Drag files here, or{" "}
        <button
          type="button"
          onClick={() => {
            inputRef.current?.click();
          }}
          className="font-medium text-brand-700 hover:underline"
        >
          choose files
        </button>
      </p>
      <p className="text-xs text-ink-muted">
        Images, PDFs, Word, Excel, PowerPoint, text, CSV or ZIP. Up to {MAX_UPLOAD_MB} MB each.
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        onChange={handlePick}
        tabIndex={-1}
        className="sr-only"
        aria-label="Choose files to upload"
      />
    </div>
  );
};

export default UploadZone;
