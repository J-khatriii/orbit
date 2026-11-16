import { useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { ACCEPT, formatSize } from "../../features/files/files.js";
import { MAX_ATTACHMENTS } from "../../features/files/useAttachments.js";

// The paperclip button and the chips for the files chosen so far.
const AttachmentBar = ({ attachments, disabled }) => {
  const inputRef = useRef(null);
  const full = attachments.files.length >= MAX_ATTACHMENTS;

  const handlePick = (event) => {
    const picked = Array.from(event.target.files);

    // Lets the same file be chosen again later.
    event.target.value = "";
    attachments.add(picked);
  };

  return (
    <div>
      <button
        type="button"
        disabled={disabled || full}
        onClick={() => {
          inputRef.current?.click();
        }}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink disabled:opacity-50"
      >
        <Paperclip className="size-4" aria-hidden="true" />
        Attach files
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        onChange={handlePick}
        tabIndex={-1}
        aria-label="Attach files"
        className="sr-only"
      />

      {attachments.error && (
        <p role="alert" className="mt-1.5 text-sm text-clay-600">
          {attachments.error}
        </p>
      )}

      {attachments.files.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Files to send">
          {attachments.files.map((file, index) => {
            return (
              <li
                key={`${file.name}-${index}`}
                className="inline-flex max-w-full items-center gap-2 rounded-control bg-sunken px-2.5 py-1 text-xs text-ink"
              >
                <span className="max-w-48 truncate" title={file.name}>
                  {file.name}
                </span>
                <span className="text-ink-muted">{formatSize(file.size)}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    attachments.remove(index);
                  }}
                  aria-label={`Remove ${file.name}`}
                  className="text-ink-soft hover:text-ink"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AttachmentBar;
