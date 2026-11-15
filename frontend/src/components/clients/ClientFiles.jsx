import { useState } from "react";
import { Button, Card, Spinner } from "../ui/index.js";
import FileRow from "../files/FileRow.jsx";
import UploadZone from "../files/UploadZone.jsx";
import { MAX_UPLOAD_MB } from "../../features/files/files.js";
import { useUploadFile } from "../../features/files/useFileMutations.js";
import { useFiles } from "../../features/files/useFiles.js";
import { useAuth } from "../../features/auth/authContext.js";

const ClientFiles = ({ workspaceId, clientId }) => {
  const { activeWorkspace } = useAuth();
  const filesQuery = useFiles(workspaceId, clientId);
  const upload = useUploadFile();
  const [uploads, setUploads] = useState([]);
  const [shareNew, setShareNew] = useState(false);
  const canDelete = activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin";

  const changeUpload = (key, changes) => {
    setUploads((current) => {
      return current.map((item) => {
        return item.key === key ? { ...item, ...changes } : item;
      });
    });
  };

  const dismissUpload = (key) => {
    setUploads((current) => {
      return current.filter((item) => {
        return item.key !== key;
      });
    });
  };

  const uploadOne = async (file) => {
    const key = crypto.randomUUID();

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setUploads((current) => {
        return [
          ...current,
          { key, name: file.name, progress: 0, error: `Files can be at most ${MAX_UPLOAD_MB} MB` },
        ];
      });
      return;
    }

    setUploads((current) => {
      return [...current, { key, name: file.name, progress: 0, error: null }];
    });

    try {
      await upload.mutateAsync({
        workspaceId,
        clientId,
        file,
        clientVisible: shareNew,
        onProgress: (progress) => {
          changeUpload(key, { progress });
        },
      });
      dismissUpload(key);
    } catch (error) {
      changeUpload(key, { error: error.message });
    }
  };

  const handleFiles = (picked) => {
    picked.forEach((file) => {
      uploadOne(file);
    });
  };

  const files = filesQuery.data?.files ?? [];
  const total = filesQuery.data?.total ?? 0;

  return (
    <Card title="Files">
      <div className="space-y-4">
        <UploadZone onFiles={handleFiles} />

        <label className="inline-flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={shareNew}
            onChange={(event) => {
              setShareNew(event.target.checked);
            }}
            className="size-4 accent-brand-700"
          />
          Share new uploads with the client
        </label>

        {uploads.length > 0 && (
          <ul className="space-y-2" aria-label="Uploads">
            {uploads.map((item) => {
              return (
                <li key={item.key} className="rounded-md bg-sunken px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-ink">{item.name}</span>
                    {item.error ? (
                      <button
                        type="button"
                        onClick={() => {
                          dismissUpload(item.key);
                        }}
                        className="shrink-0 text-ink-soft hover:text-ink"
                      >
                        Dismiss
                      </button>
                    ) : (
                      <span className="shrink-0 text-xs text-ink-muted">{item.progress}%</span>
                    )}
                  </div>
                  {item.error ? (
                    <p role="alert" className="mt-1 text-xs text-clay-700">
                      {item.error}
                    </p>
                  ) : (
                    <div
                      role="progressbar"
                      aria-label={`Uploading ${item.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={item.progress}
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10"
                    >
                      <div
                        className="h-full bg-brand-700 transition-[width]"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {filesQuery.isPending && (
          <div role="status" className="flex justify-center py-6 text-ink-muted">
            <Spinner className="size-5" />
            <span className="sr-only">Loading files</span>
          </div>
        )}

        {filesQuery.isError && (
          <div className="space-y-2">
            <p className="text-sm text-ink-soft">{filesQuery.error.message}</p>
            <Button
              variant="secondary"
              onClick={() => {
                filesQuery.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        )}

        {filesQuery.isSuccess && files.length === 0 && uploads.length === 0 && (
          <p className="text-sm text-ink-soft">No files yet. Drop the first one above.</p>
        )}

        {files.length > 0 && (
          <ul className="divide-y divide-ink/10">
            {files.map((file) => {
              return (
                <FileRow
                  key={file.id}
                  workspaceId={workspaceId}
                  clientId={clientId}
                  file={file}
                  canDelete={canDelete}
                />
              );
            })}
          </ul>
        )}

        {total > files.length && (
          <p className="text-xs text-ink-muted">
            Showing the newest {files.length} of {total} files.
          </p>
        )}
      </div>
    </Card>
  );
};

export default ClientFiles;
