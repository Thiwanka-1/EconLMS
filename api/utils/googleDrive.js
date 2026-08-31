import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { google } from "googleapis";

let driveClient;

const requiredEnvironmentVariables = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
];

const validateDriveConfiguration = () => {
  const missingVariables =
    requiredEnvironmentVariables.filter(
      (variableName) =>
        !process.env[variableName]
    );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing Google Drive variables: ${missingVariables.join(
        ", "
      )}`
    );
  }
};

export const getDriveClient = () => {
  if (driveClient) {
    return driveClient;
  }

  validateDriveConfiguration();

  const oauthClient =
    new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

  oauthClient.setCredentials({
    refresh_token:
      process.env.GOOGLE_REFRESH_TOKEN,
  });

  driveClient = google.drive({
    version: "v3",
    auth: oauthClient,
  });

  return driveClient;
};

const escapeDriveQueryValue = (value) => {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
};

const sanitizeFolderName = (value) => {
  return String(value || "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
};

export const getOrCreateDriveFolder =
  async ({
    name,
    parentId = null,
  }) => {
    const drive = getDriveClient();
    const safeName = sanitizeFolderName(name);

    if (!safeName) {
      throw new Error(
        "Google Drive folder name is invalid."
      );
    }

    const escapedName =
      escapeDriveQueryValue(safeName);

    const parentQuery = parentId
      ? `'${escapeDriveQueryValue(
          parentId
        )}' in parents`
      : "'root' in parents";

    const searchResponse =
      await drive.files.list({
        q: [
          parentQuery,
          `name = '${escapedName}'`,
          "mimeType = 'application/vnd.google-apps.folder'",
          "trashed = false",
        ].join(" and "),

        fields: "files(id,name)",
        spaces: "drive",
        pageSize: 1,
      });

    const existingFolder =
      searchResponse.data.files?.[0];

    if (existingFolder) {
      return existingFolder;
    }

    const createResponse =
      await drive.files.create({
        requestBody: {
          name: safeName,
          mimeType:
            "application/vnd.google-apps.folder",

          ...(parentId && {
            parents: [parentId],
          }),
        },

        fields: "id,name",
      });

    return createResponse.data;
  };

const getExtensionForFile = (file) => {
  const mimeExtensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

  return (
    mimeExtensions[file.mimetype] ||
    path
      .extname(file.originalname)
      .toLowerCase()
  );
};

const sanitizeFileName = (value) => {
  return String(value || "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 120);
};

export const uploadPaymentSlipToDrive =
  async ({
    file,
    student,
    course,
    billingPeriod = null,
  }) => {
    const rootFolderId =
      process.env
        .GDRIVE_PAYMENT_SLIPS_FOLDER_ID;

    if (!rootFolderId) {
      throw new Error(
        "GDRIVE_PAYMENT_SLIPS_FOLDER_ID is missing."
      );
    }

    const courseFolder =
      await getOrCreateDriveFolder({
        name: `${course.code}-${course.slug}`,
        parentId: rootFolderId,
      });

    const paymentTargetName =
      billingPeriod
        ? `${billingPeriod.year}-${String(
            billingPeriod.month
          ).padStart(2, "0")}`
        : "ONE-TIME";

    const periodFolder =
      await getOrCreateDriveFolder({
        name: paymentTargetName,
        parentId: courseFolder.id,
      });

    const studentFolder =
      await getOrCreateDriveFolder({
        name: `student-${student._id}`,
        parentId: periodFolder.id,
      });

    const extension =
      getExtensionForFile(file);

    const fileName = sanitizeFileName(
      `${Date.now()}-${randomUUID()}${extension}`
    );

    const drive = getDriveClient();

    const uploadResponse =
      await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [studentFolder.id],
          description: [
            `Student: ${student._id}`,
            `Course: ${course._id}`,
            billingPeriod
              ? `Billing period: ${billingPeriod._id}`
              : "Payment type: one-time",
          ].join("\n"),
        },

        media: {
          mimeType: file.mimetype,
          body: Readable.from(file.buffer),
        },

        fields:
          "id,name,mimeType,size,createdTime",
      });

    return {
      ...uploadResponse.data,
      parentFolderId: studentFolder.id,
    };
  };

export const uploadNicImageToDrive =
  async ({
    file,
    student,
  }) => {
    const rootFolderId =
      process.env
        .GDRIVE_NIC_DOCUMENTS_FOLDER_ID;

    if (!rootFolderId) {
      throw new Error(
        "GDRIVE_NIC_DOCUMENTS_FOLDER_ID is missing."
      );
    }

    const studentFolder =
      await getOrCreateDriveFolder({
        name: `student-${student._id}`,
        parentId: rootFolderId,
      });

    const extension =
      getExtensionForFile(file);

    const fileName = sanitizeFileName(
      [
        "nic",
        student._id,
        Date.now(),
        randomUUID(),
      ].join("-") + extension
    );

    const drive = getDriveClient();

    const uploadResponse =
      await drive.files.create({
        requestBody: {
          name: fileName,

          parents: [
            studentFolder.id,
          ],

          description: [
            "Accounting With Udara NIC document",
            `Student ID: ${student._id}`,
            `Student email: ${student.email}`,
            `Uploaded: ${new Date().toISOString()}`,
          ].join("\n"),
        },

        media: {
          mimeType: file.mimetype,
          body: Readable.from(
            file.buffer
          ),
        },

        fields: [
          "id",
          "name",
          "mimeType",
          "size",
          "createdTime",
        ].join(","),
      });

    return {
      ...uploadResponse.data,
      parentFolderId:
        studentFolder.id,
    };
  };  

export const getDriveFileStream =
  async (fileId) => {
    const drive = getDriveClient();

    const metadataResponse =
      await drive.files.get({
        fileId,
        fields: "id,name,mimeType,size",
      });

    const mediaResponse =
      await drive.files.get(
        {
          fileId,
          alt: "media",
        },
        {
          responseType: "stream",
        }
      );

    return {
      metadata: metadataResponse.data,
      stream: mediaResponse.data,
    };
  };

export const deleteDriveFile =
  async (fileId) => {
    if (!fileId) {
      return;
    }

    const drive = getDriveClient();

    try {
      await drive.files.delete({
        fileId,
      });
    } catch (error) {
      if (error?.code === 404 || error?.response?.status === 404) {
        return;
      }

      throw error;
    }
  };
