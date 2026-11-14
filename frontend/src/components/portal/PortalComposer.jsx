import { useState } from "react";
import { Button } from "../ui/index.js";
import { fieldErrorsOf } from "../../lib/api.js";
import { useSendClientMessage } from "../../features/portal/usePortalMutations.js";

const PortalComposer = ({ workspaceId, clientId }) => {
  const send = useSendClientMessage();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const text = body.trim();

    if (!text || send.isPending) {
      return;
    }

    setError("");
    send.mutate(
      { workspaceId, clientId, input: { body: text } },
      {
        onSuccess: () => {
          setBody("");
        },
        onError: (sendError) => {
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
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">Your team will see this.</p>
        <Button loading={send.isPending} disabled={!body.trim()} onClick={submit}>
          Send
        </Button>
      </div>
    </div>
  );
};

export default PortalComposer;
