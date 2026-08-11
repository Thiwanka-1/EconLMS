import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getMyNicImage,
  getMyNicStatus,
  uploadMyNicImage,
} from "../../api/documentApi.js";

import StatusMessage from "../../components/common/StatusMessage.jsx";

const statusDetails = {
  not_uploaded: {
    label: "Not uploaded",
    className:
      "bg-slate-100 text-slate-700",
  },

  pending: {
    label: "Pending review",
    className:
      "bg-amber-100 text-amber-800",
  },

  verified: {
    label: "Verified",
    className:
      "bg-emerald-100 text-emerald-800",
  },

  rejected: {
    label: "Rejected",
    className:
      "bg-red-100 text-red-800",
  },
};

const formatDateTime = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString();
};

export default function StudentNicPage() {
  const [document, setDocument] =
    useState(null);

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isUploading,
    setIsUploading,
  ] = useState(false);

  const fileInputRef =
    useRef(null);

  const previewUrlRef =
    useRef("");

  const replacePreviewUrl =
    useCallback((nextUrl) => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(
          previewUrlRef.current
        );
      }

      previewUrlRef.current =
        nextUrl || "";

      setPreviewUrl(
        nextUrl || ""
      );
    }, []);

  const loadDocument =
    useCallback(async () => {
      setError("");
      setIsLoading(true);

      try {
        const statusResult =
          await getMyNicStatus();

        const nextDocument =
          statusResult.nicDocument;

        setDocument(nextDocument);

        if (nextDocument.hasImage) {
          const imageResult =
            await getMyNicImage();

          const objectUrl =
            URL.createObjectURL(
              imageResult.blob
            );

          replacePreviewUrl(
            objectUrl
          );
        } else {
          replacePreviewUrl("");
        }
      } catch (requestError) {
        replacePreviewUrl("");

        setError(
          requestError.message ||
            "NIC document information could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    }, [replacePreviewUrl]);

  useEffect(() => {
    loadDocument();

    return () => {
      if (
        previewUrlRef.current
      ) {
        URL.revokeObjectURL(
          previewUrlRef.current
        );
      }
    };
  }, [loadDocument]);

  const handleFileChange = (
    event
  ) => {
    setError("");
    setSuccess("");

    if (document?.verificationStatus === "verified") {
      event.target.value = "";
      setSelectedFile(null);
      setError(
        "Your verified NIC image cannot be replaced unless an administrator rejects it."
      );
      return;
    }

    const file =
      event.target.files?.[0] ||
      null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedTypes =
      new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
      ]);

    if (
      !allowedTypes.has(
        file.type
      )
    ) {
      setSelectedFile(null);

      event.target.value = "";

      setError(
        "Select a JPG, PNG or WebP image."
      );

      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (
    event
  ) => {
    event.preventDefault();

    if (document?.verificationStatus === "verified") {
      setError(
        "Your verified NIC image cannot be replaced unless an administrator rejects it."
      );
      return;
    }

    if (!selectedFile) {
      setError(
        "Select a NIC image first."
      );

      return;
    }

    setError("");
    setSuccess("");
    setIsUploading(true);

    try {
      const result =
        await uploadMyNicImage(
          selectedFile
        );

      setSuccess(
        result.message ||
          "NIC image uploaded successfully."
      );

      setSelectedFile(null);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      await loadDocument();
    } catch (requestError) {
      setError(
        requestError.message ||
          "The NIC image could not be uploaded."
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-10 w-72 animate-pulse rounded-xl bg-slate-200" />

        <div className="mt-8 h-[32rem] animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  const currentStatus =
    statusDetails[
      document
        ?.verificationStatus
    ] ||
    statusDetails.not_uploaded;
  const nicUploadLocked = document?.verificationStatus === "verified";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.17em] text-brand-700">
          Identity document
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          NIC verification
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Upload a clear image of your
          NIC for administrator review.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {error && (
          <StatusMessage variant="error">
            {error}
          </StatusMessage>
        )}

        {success && (
          <StatusMessage variant="success">
            {success}
          </StatusMessage>
        )}

        {document
          ?.verificationStatus ===
          "rejected" &&
          document.verificationNote && (
            <StatusMessage variant="error">
              <strong>
                Rejection reason:
              </strong>{" "}
              {
                document.verificationNote
              }
            </StatusMessage>
          )}

        {document
          ?.verificationStatus ===
          "verified" && (
            <StatusMessage variant="success">
              Your NIC image has been
              verified successfully.
            </StatusMessage>
          )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-black text-slate-950">
              Current document
            </h2>

            <span
              className={[
                "rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide",
                currentStatus.className,
              ].join(" ")}
            >
              {currentStatus.label}
            </span>
          </div>

          <div className="mt-6 flex min-h-80 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Your uploaded NIC document"
                className="max-h-[32rem] w-full object-contain"
              />
            ) : (
              <div className="px-6 text-center">
                <p className="font-bold text-slate-700">
                  No NIC image uploaded
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Select an image using
                  the upload form.
                </p>
              </div>
            )}
          </div>

          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">
                File name
              </dt>

              <dd className="mt-2 break-all text-sm font-bold text-slate-900">
                {document
                  ?.originalFileName ||
                  "—"}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">
                File type
              </dt>

              <dd className="mt-2 text-sm font-bold text-slate-900">
                {document?.mimeType ||
                  "—"}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">
                Uploaded
              </dt>

              <dd className="mt-2 text-sm font-bold text-slate-900">
                {formatDateTime(
                  document?.uploadedAt
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">
                Reviewed
              </dt>

              <dd className="mt-2 text-sm font-bold text-slate-900">
                {formatDateTime(
                  document?.reviewedAt
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-black text-slate-950">
            {nicUploadLocked
              ? "NIC upload complete"
              : document?.hasImage
              ? "Replace NIC image"
              : "Upload NIC image"}
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {nicUploadLocked
              ? "Your verified NIC image is locked. Upload becomes available again only if an administrator rejects the document."
              : "Use a clear JPG, PNG or WebP image. Replacing an existing document returns its status to pending review."}
          </p>

          <form
            onSubmit={handleUpload}
            className="mt-6"
          >
            <label
              htmlFor="nicImage"
              className="block text-sm font-bold text-slate-800"
            >
              NIC image
            </label>

            <input
              ref={fileInputRef}
              id="nicImage"
              name="nicImage"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={
                handleFileChange
              }
              disabled={isUploading || nicUploadLocked}
              className="mt-3 block w-full rounded-2xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-100 file:px-4 file:py-2 file:text-sm file:font-black file:text-brand-800 hover:file:bg-brand-200 disabled:cursor-not-allowed disabled:opacity-60"
            />

            {selectedFile && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="break-all text-sm font-bold text-slate-900">
                  {selectedFile.name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {(
                    selectedFile.size /
                    1024
                  ).toFixed(1)}{" "}
                  KB
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={
                isUploading ||
                nicUploadLocked ||
                !selectedFile
              }
              className="mt-5 w-full rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading
                ? "Uploading…"
                : nicUploadLocked
                  ? "NIC verified"
                : document?.hasImage
                  ? "Replace NIC image"
                  : "Upload NIC image"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
