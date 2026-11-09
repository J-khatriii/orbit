import { useState } from "react";
import TemplateModal from "../components/templates/TemplateModal.jsx";
import TemplatesList from "../components/templates/TemplatesList.jsx";
import { Button, Card, Modal, Spinner, useToast } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { useDeleteTemplate } from "../features/templates/useTemplateMutations.js";
import { useTemplates } from "../features/templates/useTemplates.js";

const TemplatesPage = () => {
  const { activeWorkspace } = useAuth();
  const toast = useToast();
  const workspaceId = activeWorkspace?.id;
  const role = activeWorkspace?.role;
  const canSee = role !== "client";
  const canManage = role === "owner" || role === "admin";

  // null = closed, "new" = making one, or the template being opened.
  const [modalTarget, setModalTarget] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const templates = useTemplates(workspaceId, canSee);
  const remove = useDeleteTemplate();
  const data = templates.data;

  const confirmDelete = () => {
    const template = deleting;

    remove.mutate(
      { workspaceId, templateId: template.id },
      {
        onSuccess: () => {
          // Close the dialog first: a toast would be hidden behind it.
          setDeleting(null);
          toast.show(`${template.name} was deleted.`);
        },
        onError: (error) => {
          setDeleting(null);
          toast.show(error.message);
        },
      },
    );
  };

  if (!canSee) {
    return (
      <Card title="Templates">
        <p className="text-sm text-ink-soft">
          Templates are only available to people who work in this workspace.
        </p>
      </Card>
    );
  }

  const newButton = (
    <Button
      onClick={() => {
        setModalTarget("new");
      }}
    >
      New template
    </Button>
  );

  const renderContent = () => {
    if (templates.isPending) {
      return (
        <div role="status" className="flex justify-center py-16 text-ink-muted">
          <Spinner className="size-6" />
          <span className="sr-only">Loading</span>
        </div>
      );
    }
    if (templates.isError) {
      return (
        <Card title="We couldn't load your templates">
          <p className="mb-4 text-sm text-ink-soft">{templates.error.message}</p>
          <Button variant="secondary" onClick={templates.refetch}>
            Try again
          </Button>
        </Card>
      );
    }
    if (data.length === 0) {
      return (
        <div className="rounded-card bg-surface px-6 py-16 text-center shadow-card ring-1 ring-line">
          <h2 className="font-display text-2xl text-ink">No templates yet.</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
            A template is a starter task list, so every new project of a kind begins the same way.
            {canManage
              ? " Make one here, or save an existing project's tasks as a template."
              : " Ask an owner or admin to create the first one."}
          </p>
          {canManage && <div className="mt-5 flex justify-center">{newButton}</div>}
        </div>
      );
    }

    return (
      <TemplatesList
        templates={data}
        canManage={canManage}
        onOpen={setModalTarget}
        onDelete={setDeleting}
      />
    );
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Templates</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {data ? `${data.length} ${data.length === 1 ? "template" : "templates"}` : "\u00a0"}
          </p>
        </div>
        {canManage && newButton}
      </div>

      {renderContent()}

      {modalTarget && (
        <TemplateModal
          key={modalTarget === "new" ? "new" : modalTarget.id}
          workspaceId={workspaceId}
          templateId={modalTarget === "new" ? null : modalTarget.id}
          readOnly={!canManage}
          onClose={() => {
            setModalTarget(null);
          }}
        />
      )}

      <Modal
        open={Boolean(deleting)}
        onClose={() => {
          setDeleting(null);
        }}
        title={`Delete ${deleting?.name ?? ""}?`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDeleting(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          Projects already started from it keep their tasks. This can&apos;t be undone.
        </p>
      </Modal>
    </div>
  );
};

export default TemplatesPage;
