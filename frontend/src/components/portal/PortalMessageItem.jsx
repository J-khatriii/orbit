import { Avatar } from "../ui/index.js";
import { formatWhen } from "../../features/messages/messages.js";

const PortalMessageItem = ({ message }) => {
  const name = message.mine ? "You" : (message.authorName ?? "Your team");

  return (
    <li className={`flex gap-3 rounded-card px-3 py-3 ${message.mine ? "bg-sunken" : ""}`}>
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-ink">{name}</span>
          <time dateTime={message.createdAt} className="text-xs text-ink-muted">
            {formatWhen(message.createdAt)}
          </time>
        </div>
        <p className="mt-1 text-sm wrap-break-word whitespace-pre-wrap text-ink">{message.body}</p>
      </div>
    </li>
  );
};

export default PortalMessageItem;
