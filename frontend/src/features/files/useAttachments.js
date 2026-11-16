import { useState } from "react";
import { MAX_UPLOAD_MB } from "./files.js";

export const MAX_ATTACHMENTS = 5;

// The files a person has chosen to send with a message, and why a choice was refused.
export const useAttachments = () => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");

  const add = (picked) => {
    const next = [...files, ...picked];
    const tooBig = picked.find((file) => {
      return file.size > MAX_UPLOAD_MB * 1024 * 1024;
    });

    if (next.length > MAX_ATTACHMENTS) {
      setError(`You can attach up to ${MAX_ATTACHMENTS} files.`);
      return;
    }
    if (tooBig) {
      setError(`${tooBig.name} is over ${MAX_UPLOAD_MB} MB.`);
      return;
    }

    setError("");
    setFiles(next);
  };

  const remove = (index) => {
    setError("");
    setFiles((current) => {
      return current.filter((file, position) => {
        return position !== index;
      });
    });
  };

  const clear = () => {
    setError("");
    setFiles([]);
  };

  return { files, error, add, remove, clear };
};
