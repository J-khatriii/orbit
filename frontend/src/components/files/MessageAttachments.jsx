import { useState } from "react";
import { Download } from "lucide-react";
import { canPreview, formatSize, isImage } from "../../features/files/files.js";
import FilePreview from "./FilePreview.jsx";
import FileThumb from "./FileThumb.jsx";

// The files attached to one message. `urlFor(file, inline)` gives the link for the team's or
// the portal's download route.
const MessageAttachments = ({ attachments, urlFor }) => {
  const [previewing, setPreviewing] = useState(null);

  return (
    <>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label="Attachments">
        {attachments.map((file) => {
          return (
            <li
              key={file.id}
              className="flex max-w-full items-center gap-2 rounded-control border border-line bg-surface p-1.5 pr-3"
            >
              <FileThumb
                name={file.name}
                isImage={isImage(file.contentType)}
                src={urlFor(file, true)}
                onOpen={
                  canPreview(file.contentType)
                    ? () => {
                        setPreviewing(file);
                      }
                    : undefined
                }
              />
              <div className="min-w-0">
                <p className="max-w-48 truncate text-xs font-medium text-ink" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-ink-muted">{formatSize(file.size)}</p>
              </div>
              <a
                href={urlFor(file, false)}
                aria-label={`Download ${file.name}`}
                className="text-ink-soft hover:text-ink"
              >
                <Download className="size-4" aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ul>

      {previewing && (
        <FilePreview
          name={previewing.name}
          contentType={previewing.contentType}
          inlineUrl={urlFor(previewing, true)}
          downloadHref={urlFor(previewing, false)}
          onClose={() => {
            setPreviewing(null);
          }}
        />
      )}
    </>
  );
};

export default MessageAttachments;
