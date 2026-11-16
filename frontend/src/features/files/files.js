export const MAX_UPLOAD_MB = 25;

// What the file picker offers. The server still checks the real type of every upload.
export const ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";

export const formatSize = (bytes) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const PREVIEW_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

// Must match what the server will show inline.
export const canPreview = (contentType) => {
  return PREVIEW_TYPES.has(contentType);
};

export const isImage = (contentType) => {
  return contentType.startsWith("image/");
};
