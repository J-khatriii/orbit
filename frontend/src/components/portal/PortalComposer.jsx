import { useState } from "react";
import { Button } from "../ui/index.js";
import AttachmentBar from "../../features/files/AttachmentBar.jsx";
import { fieldErrorsOf } from "../../lib/api.js";
import { useAttachments } from "../../features/files/useAttachments.js";
import { useSendClientMessage } from "../../features/portal/usePortalMutations.js";

const PortalComposer = ({ workspaceId, clientId }) => {
  const send = useSendClientMessage();
  const attachments = useAttachments();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null);

  const submit = () => {
    const text = body.trim();

    if (!text || send.isPending) {
      return;
    }

    setError("");
    setProgress(0);
    send.mutate(
      {
        workspaceId,
        clientId,
        input: { body: text },
        files: attachments.files,
        onProgress: setProgress,
      },
      {
        onSuccess: () => {
          setBody("");
          setProgress(null);
          attachments.clear();
        },
        onError: (sendError) => {
          setProgress(null);
          setError(fieldErrorsOf(sendError).body ?? sendError.message);
        },
      },
    );
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  };

  const hasFiles = attachments.files.length > 0;

  return (
    <div className="mt-4 border-t border-line pt-4">
      <label htmlFor="portal-message-body" className="sr-only">
        Write a message
      </label>
      <textarea
        id="portal-message-body"
        rows={3}
        maxLength={5000}
        placeholder="Write a message to your team…"
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        className="w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      />
      {error && <p className="mt-1.5 text-sm text-clay-600">{error}</p>}

      <div className="mt-2">
        <AttachmentBar attachments={attachments} disabled={send.isPending} />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {hasFiles ? "Your team will see this, including the files." : "Your team will see this."}
        </p>
        <div className="flex items-center gap-3">
          {send.isPending && hasFiles && progress !== null && (
            <span role="status" className="text-xs text-ink-muted">
              Uploading {progress}%
            </span>
          )}
          <Button loading={send.isPending} disabled={!body.trim()} onClick={submit}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PortalComposer;
