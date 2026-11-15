import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { Card, Spinner } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { formatSize } from "../features/files/files.js";
import { portalFileUrl } from "../features/portal/portalApi.js";
import { usePortalClients } from "../features/portal/usePortal.js";
import { usePortalFiles } from "../features/portal/usePortalFiles.js";
import { timeAgo } from "../lib/timeAgo.js";

const PortalFilesPage = () => {
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.id;
  const isClient = activeWorkspace?.role === "client";
  const clients = usePortalClients(workspaceId, isClient);
  const [chosenId, setChosenId] = useState("");
  const files = usePortalFiles(workspaceId, chosenId, isClient);

  if (!isClient) {
    return (
      <Card title="Client portal">
        <p className="text-sm text-ink-soft">
          This page is what your clients see. People who work in this workspace use the Files tab on
          each client instead.
        </p>
      </Card>
    );
  }

  if (files.isPending || clients.isPending) {
    return (
      <div role="status" className="flex justify-center py-24 text-ink-muted">
        <Spinner className="size-6" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (files.isError) {
    return (
      <Card title="We couldn't load your files">
        <p className="text-sm text-ink-soft">{files.error.message}</p>
      </Card>
    );
  }

  const clientList = clients.data ?? [];
  const list = files.data.files;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Files</h1>
        <p className="mt-1 text-sm text-ink-soft">Documents your team has shared with you.</p>

        {clientList.length > 1 && (
          <div className="mt-3 max-w-xs">
            <label
              htmlFor="portal-files-client"
              className="mb-1.5 block text-sm font-medium text-ink"
            >
              Show files from
            </label>
            <select
              id="portal-files-client"
              value={chosenId}
              onChange={(event) => {
                setChosenId(event.target.value);
              }}
              className="w-full rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <option value="">Everyone</option>
              {clientList.map((candidate) => {
                return (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="rounded-card bg-surface px-6 py-16 text-center shadow-card ring-1 ring-line">
          <h2 className="font-display text-2xl text-ink">No files yet.</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            When your team shares a file with you, it will show up here.
          </p>
        </div>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {list.map((file) => {
              return (
                <li key={file.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <FileText className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate text-sm font-medium text-ink" title={file.name}>
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {formatSize(file.size)}, {timeAgo(file.createdAt)}
                      {clientList.length > 1 ? `, ${file.clientName}` : ""}
                    </p>
                  </div>
                  <a
                    href={portalFileUrl(workspaceId, file.id)}
                    aria-label={`Download ${file.name}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                  >
                    <Download className="size-4" aria-hidden="true" />
                    Download
                  </a>
                </li>
              );
            })}
          </ul>
          {files.data.total > list.length && (
            <p className="mt-3 text-xs text-ink-muted">
              Showing the newest {list.length} of {files.data.total} files.
            </p>
          )}
        </Card>
      )}
    </div>
  );
};

export default PortalFilesPage;
