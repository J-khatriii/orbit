import { useState } from "react";
import { Download, FileText, Pencil, Trash2 } from "lucide-react";
import { Badge, useToast } from "../ui/index.js";
import { formatSize } from "../../features/files/files.js";
import { downloadUrl } from "../../features/files/filesApi.js";
import { useDeleteFile, useUpdateFile } from "../../features/files/useFileMutations.js";
import { timeAgo } from "../../lib/timeAgo.js";

const actionClass = "inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink";

const FileRow = ({ workspaceId, clientId, file, canDelete }) => {
  const toast = useToast();
  const update = useUpdateFile();
  const remove = useDeleteFile();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(file.name);
  const [confirming, setConfirming] = useState(false);

  const ids = { workspaceId, clientId, fileId: file.id };

  const showError = (error) => {
    toast.show(error.message);
  };

  const startEditing = () => {
    setName(file.name);
    setEditing(true);
  };

  const saveName = () => {
    const trimmed = name.trim();

    if (!trimmed || trimmed === file.name) {
      setEditing(false);
      return;
    }

    update.mutate(
      { ...ids, input: { name: trimmed } },
      {
        onSuccess: () => {
          setEditing(false);
        },
        onError: showError,
      },
    );
  };

  const handleNameKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveName();
    }
    if (event.key === "Escape") {
      setEditing(false);
    }
  };

  const toggleShared = () => {
    update.mutate(
      { ...ids, input: { clientVisible: !file.clientVisible } },
      { onError: showError },
    );
  };

  const handleDelete = () => {
    remove.mutate(ids, {
      onSuccess: () => {
        toast.show(`${file.name} was deleted.`);
      },
      onError: (error) => {
        setConfirming(false);
        showError(error);
      },
    });
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <FileText className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />

      <div className="min-w-0 flex-1 basis-56">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              onKeyDown={handleNameKeyDown}
              maxLength={200}
              autoFocus
              aria-label="File name"
              className="min-w-0 flex-1 rounded-md border border-ink/20 bg-transparent px-2 py-1 text-sm text-ink"
            />
            <button
              type="button"
              onClick={saveName}
              disabled={update.isPending}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
              }}
              className="text-sm text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p className="truncate text-sm font-medium text-ink" title={file.name}>
            {file.name}
          </p>
        )}
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
          <span>{formatSize(file.size)}</span>
          <span>
            {file.uploadedBy ? `${file.uploadedBy.name}, ` : ""}
            {timeAgo(file.createdAt)}
          </span>
          {file.projectName && <Badge tone="neutral">{file.projectName}</Badge>}
        </p>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          role="switch"
          checked={file.clientVisible}
          onChange={toggleShared}
          disabled={update.isPending}
          className="size-4 accent-brand-700"
        />
        Share with client
      </label>

      <div className="flex items-center gap-3">
        <a href={downloadUrl(ids)} className={actionClass} aria-label={`Download ${file.name}`}>
          <Download className="size-4" aria-hidden="true" />
          Download
        </a>
        <button type="button" onClick={startEditing} className={actionClass}>
          <Pencil className="size-4" aria-hidden="true" />
          Rename
        </button>
        {canDelete &&
          (confirming ? (
            <span className="inline-flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={handleDelete}
                disabled={remove.isPending}
                className="font-medium text-clay-700 hover:underline"
              >
                {remove.isPending ? "Deleting..." : "Delete for good"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                }}
                className="text-ink-soft hover:text-ink"
              >
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setConfirming(true);
              }}
              className={actionClass}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </button>
          ))}
      </div>
    </li>
  );
};

export default FileRow;
