import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const getEncryptionKey = () => {
  const value =
    process.env.ZOOM_LINK_ENCRYPTION_KEY;

  if (
    !value ||
    !/^[a-fA-F0-9]{64}$/.test(value)
  ) {
    throw new Error(
      "ZOOM_LINK_ENCRYPTION_KEY must be a 64-character hexadecimal value."
    );
  }

  return Buffer.from(value, "hex");
};

export const encryptText = (plainText) => {
  if (!plainText) {
    return null;
  }

  const iv = randomBytes(12);
  const key = getEncryptionKey();

  const cipher = createCipheriv(
    "aes-256-gcm",
    key,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(
      String(plainText),
      "utf8"
    ),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
};

export const decryptText = (
  encryptedValue
) => {
  if (!encryptedValue) {
    return null;
  }

  const [
    version,
    ivValue,
    authTagValue,
    encryptedText,
  ] = String(encryptedValue).split(".");

  if (
    version !== "v1" ||
    !ivValue ||
    !authTagValue ||
    !encryptedText
  ) {
    throw new Error(
      "Invalid encrypted value."
    );
  }

  const key = getEncryptionKey();

  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivValue, "base64url")
  );

  decipher.setAuthTag(
    Buffer.from(
      authTagValue,
      "base64url"
    )
  );

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(
        encryptedText,
        "base64url"
      )
    ),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};