import { Avatar, Badge } from "../ui/index.js";
import MessageAttachments from "../files/MessageAttachments.jsx";
import { downloadUrl } from "../../features/files/filesApi.js";
import { formatWhen } from "../../features/messages/messages.js";

const MessageItem = ({ message, workspaceId, clientId }) => {
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
        <p className="mt-1 text-sm wrap-break-word whitespace-pre-wrap text-ink">{message.body}</p>
        {message.attachments?.length > 0 && (
          <MessageAttachments
            attachments={message.attachments}
            urlFor={(file, inline) => {
              return downloadUrl({ workspaceId, clientId, fileId: file.id, inline });
            }}
          />
        )}
      </div>
    </li>
  );
};

export default MessageItem;
