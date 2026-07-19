import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

const mimeTypeExtensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

const getUploadRoot = () => {
  const configuredDirectory =
    process.env.PRIVATE_UPLOAD_DIR ||
    "private_uploads";

  return path.resolve(configuredDirectory);
};

export const savePrivateFile = async ({
  buffer,
  mimeType,
  category,
  ownerId,
}) => {
  const extension =
    mimeTypeExtensions[mimeType];

  if (!extension) {
    throw new Error(
      "Unsupported private file type."
    );
  }

  const directory = path.join(
    getUploadRoot(),
    category,
    String(ownerId)
  );

  await fs.mkdir(directory, {
    recursive: true,
  });

  const filename = `${randomUUID()}${extension}`;
  const absolutePath = path.join(
    directory,
    filename
  );

  await fs.writeFile(absolutePath, buffer);

  const storageKey = path.relative(
    getUploadRoot(),
    absolutePath
  );

  return {
    provider: "local_private",
    storageKey,
    filename,
  };
};

export const getPrivateFilePath = (
  storageKey
) => {
  const root = getUploadRoot();

  const resolvedPath = path.resolve(
    root,
    storageKey
  );

  const normalizedRoot =
    root.endsWith(path.sep)
      ? root
      : `${root}${path.sep}`;

  if (
    resolvedPath !== root &&
    !resolvedPath.startsWith(normalizedRoot)
  ) {
    throw new Error(
      "Invalid private file path."
    );
  }

  return resolvedPath;
};

export const deletePrivateFile = async (
  storageKey
) => {
  if (!storageKey) {
    return;
  }

  try {
    const filePath =
      getPrivateFilePath(storageKey);

    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "Private file deletion failed:",
        error.message
      );
    }
  }
};