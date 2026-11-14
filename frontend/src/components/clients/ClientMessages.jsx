import { useEffect, useRef } from "react";
import MessageComposer from "../messages/MessageComposer.jsx";
import MessageItem from "../messages/MessageItem.jsx";
import { Button, Card, Spinner } from "../ui/index.js";
import { useMessages } from "../../features/messages/useMessages.js";

const ClientMessages = ({ workspaceId, clientId, clientName }) => {
  const messages = useMessages(workspaceId, clientId);
  const listRef = useRef(null);
  const list = messages.data ?? [];
  const newestId = list.at(-1)?.id;

  // Keep the newest message in view, on load and after sending.
  useEffect(() => {
    const element = listRef.current;

    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [newestId]);

  const renderList = () => {
    if (messages.isPending) {
      return (
        <div role="status" className="flex justify-center py-10 text-ink-muted">
          <Spinner className="size-5" />
          <span className="sr-only">Loading</span>
        </div>
      );
    }
    if (messages.isError) {
      return (
        <div className="py-4">
          <p className="mb-3 text-sm text-clay-700">{messages.error.message}</p>
          <Button
            variant="secondary"
            onClick={() => {
              messages.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <p className="rounded-control bg-sunken px-3 py-4 text-sm text-ink-soft">
          No messages yet. Start the conversation below.
        </p>
      );
    }

    return (
      <>
        {messages.hasNextPage && (
          <div className="mb-2 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              loading={messages.isFetchingNextPage}
              onClick={() => {
                messages.fetchNextPage();
              }}
            >
              Load earlier messages
            </Button>
          </div>
        )}
        <ul ref={listRef} className="max-h-128 space-y-1 overflow-y-auto">
          {list.map((message) => {
            return <MessageItem key={message.id} message={message} />;
          })}
        </ul>
      </>
    );
  };

  return (
    <Card title="Conversation">
      {renderList()}
      <MessageComposer workspaceId={workspaceId} clientId={clientId} clientName={clientName} />
    </Card>
  );
};

export default ClientMessages;
