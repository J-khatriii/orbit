import { useState } from "react";
import { Button } from "../ui/index.js";
import { fieldErrorsOf } from "../../lib/api.js";
import { useSendMessage } from "../../features/messages/useSendMessage.js";

const MessageComposer = ({ workspaceId, clientId, clientName }) => {
  const send = useSendMessage();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState("");

  const submit = () => {
    const text = body.trim();

    if (!text || send.isPending) {
      return;
    }

    setError("");
    send.mutate(
      { workspaceId, clientId, input: { body: text, internal } },
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
      <label htmlFor="message-body" className="sr-only">
        {internal ? "Internal note" : `Message to ${clientName}`}
      </label>
      <textarea
        id="message-body"
        rows={3}
        maxLength={5000}
        placeholder={internal ? "Write a note for your team…" : `Write to ${clientName}…`}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-control border border-line px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${internal ? "bg-sunken" : "bg-surface"}`}
      />
      {error && <p className="mt-1.5 text-sm text-clay-600">{error}</p>}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={internal}
              onChange={(event) => {
                setInternal(event.target.checked);
              }}
              className="size-4"
            />
            Internal note
          </label>
          <p className="mt-0.5 text-xs text-ink-muted">
            {internal
              ? "Only your team can see this."
              : `Visible to ${clientName} in their portal.`}
          </p>
        </div>
        <Button loading={send.isPending} disabled={!body.trim()} onClick={submit}>
          {internal ? "Add note" : "Send"}
        </Button>
      </div>
    </div>
  );
};

export default MessageComposer;
