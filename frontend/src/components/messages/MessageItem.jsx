import { Avatar, Badge } from "../ui/index.js";
import { formatWhen } from "../../features/messages/messages.js";

const MessageItem = ({ message }) => {
  const name = message.author?.name ?? "Former team member";

  return (
    <li className={`flex gap-3 rounded-card px-3 py-3 ${message.internal ? "bg-sunken" : ""}`}>
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-ink">{name}</span>
          <time dateTime={message.createdAt} className="text-xs text-ink-muted">
            {formatWhen(message.createdAt)}
          </time>
          {message.internal && <Badge tone="clay">Internal note</Badge>}
          {message.projectName && <Badge tone="neutral">{message.projectName}</Badge>}
        </div>
        <p className="mt-1 text-sm break-words whitespace-pre-wrap text-ink">{message.body}</p>
      </div>
    </li>
  );
};

export default MessageItem;
