import { useState } from "react";
import SaveAsTemplateModal from "./SaveAsTemplateModal.jsx";
import { Button } from "../ui/index.js";
import { useAuth } from "../../features/auth/authContext.js";

const SaveAsTemplateButton = ({ project }) => {
  const { activeWorkspace } = useAuth();
  const [open, setOpen] = useState(false);
  const role = activeWorkspace?.role;

  if (role !== "owner" && role !== "admin") {
    return null;
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setOpen(true);
        }}
      >
        Save as template
      </Button>
      {open && (
        <SaveAsTemplateModal
          workspaceId={activeWorkspace.id}
          project={project}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
};

export default SaveAsTemplateButton;
