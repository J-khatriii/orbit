import { useState } from "react";
import { FileText } from "lucide-react";

// A small picture for images, an icon for everything else. If given `onOpen`, it's a button.
const FileThumb = ({ name, isImage, src, onOpen }) => {
  const [broken, setBroken] = useState(false);

  const content =
    isImage && !broken ? (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => {
          setBroken(true);
        }}
        className="size-10 rounded-md object-cover"
      />
    ) : (
      <span className="flex size-10 items-center justify-center rounded-md bg-sunken text-ink-muted">
        <FileText className="size-5" aria-hidden="true" />
      </span>
    );

  if (!onOpen) {
    return <span className="shrink-0">{content}</span>;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Preview ${name}`}
      className="shrink-0 rounded-md focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
    >
      {content}
    </button>
  );
};

export default FileThumb;
