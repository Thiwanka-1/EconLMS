import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router";

import {
  decideAdminStudentNic,
  getAdminStudentNicFile,
  getAdminStudentNicStatus,
} from "../../api/documentAdminApi.js";

import {
  addAdminLessonViews,
  getAdminLessonViews,
  resetAdminLessonViews,
} from "../../api/playbackAdminApi.js";

import {
  deleteAdminStudent,
  getAdminUser,
  setAdminUserStatus,
} from "../../api/userAdminApi.js";

import AdminPageHeader from "../../components/common/AdminPageHeader.jsx";
import DocumentPreviewModal from "../../components/common/DocumentPreviewModal.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";

import {
  formatDateTime,
  formatFileSize,
} from "../../utils/formatters.js";

export default function AdminStudentPage() {
  const {
    studentId,
  } = useParams();

  const navigate = useNavigate();

  const [student, setStudent] =
    useState(null);

  const [nicDocument, setNicDocument] =
    useState(null);

  const [
    lessonViews,
    setLessonViews,
  ] = useState([]);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [isPreviewOpen, setIsPreviewOpen] =
    useState(false);

  const [nicNote, setNicNote] =
    useState("");

  const [
    extraViewCounts,
    setExtraViewCounts,
  ] = useState({});

  const [busyAction, setBusyAction] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const previewRef =
    useRef("");

  const replacePreview =
    useCallback((nextUrl) => {
      if (previewRef.current) {
        URL.revokeObjectURL(
          previewRef.current
        );
      }

      previewRef.current =
        nextUrl || "";

      setPreviewUrl(
        nextUrl || ""
      );
    }, []);

  const loadStudent =
    useCallback(async () => {
      setError("");
      setIsLoading(true);
      replacePreview("");

      try {
        const [
          userResult,
          nicResult,
          playbackResult,
        ] = await Promise.all([
          getAdminUser(
            studentId
          ),

          getAdminStudentNicStatus(
            studentId
          ),

          getAdminLessonViews({
            studentId,
          }),
        ]);

        setStudent(
          userResult.user
        );

        const loadedNic =
          nicResult.nicDocument;

        setNicDocument(
          loadedNic
        );

        setLessonViews(
          playbackResult.lessonViews ||
            []
        );

        if (loadedNic.hasImage) {
          const fileResult =
            await getAdminStudentNicFile(
              studentId
            );

          const objectUrl =
            URL.createObjectURL(
              fileResult.blob
            );

          replacePreview(
            objectUrl
          );
        }
      } catch (requestError) {
        setError(
          requestError.message ||
            "Student review data could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      replacePreview,
      studentId,
    ]);

  useEffect(() => {
    loadStudent();

    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(
          previewRef.current
        );
      }
    };
  }, [loadStudent]);

  const toggleAccount =
    async () => {
      setBusyAction("account");
      setError("");
      setSuccess("");

      try {
        const result =
          await setAdminUserStatus(
            studentId,
            !student.isActive
          );

        setSuccess(
          result.message ||
            "Student status updated."
        );

        await loadStudent();
      } catch (requestError) {
        setError(
          requestError.message ||
            "Student status could not be updated."
        );
      } finally {
        setBusyAction("");
      }
    };

  const deleteStudent = async () => {
    const confirmation = window.prompt(
      `Permanently delete this student and all related enrolments, payments, files, notifications, playback records and Zoom registrations?\n\nEnter ${student.email} to confirm.`
    );

    if (confirmation === null) {
      return;
    }

    setBusyAction("delete-account");
    setError("");
    setSuccess("");

    try {
      await deleteAdminStudent(studentId, confirmation);
      navigate("/admin/students", {
        replace: true,
        state: { message: "Student account and related data were permanently deleted." },
      });
    } catch (requestError) {
      setError(requestError.message || "Student account could not be deleted.");
      setBusyAction("");
    }
  };

  const decideNic =
    async (status) => {
      if (
        status === "rejected" &&
        !nicNote.trim()
      ) {
        setError(
          "A rejection reason is required."
        );

        return;
      }

      if (
        !nicDocument?.uploadedAt
      ) {
        setError(
          "The current upload timestamp is unavailable."
        );

        return;
      }

      setBusyAction(
        `nic-${status}`
      );

      setError("");
      setSuccess("");

      try {
        const result =
          await decideAdminStudentNic({
            studentId,
            status,

            note:
              status ===
              "rejected"
                ? nicNote.trim()
                : "",

            expectedUploadedAt:
              nicDocument.uploadedAt,
          });

        setSuccess(
          result.message ||
            "NIC decision saved."
        );

        setNicNote("");

        await loadStudent();
      } catch (requestError) {
        setError(
          requestError.message ||
            "The NIC decision could not be saved."
        );
      } finally {
        setBusyAction("");
      }
    };

  const addViews =
    async (lessonView) => {
      const count =
        Number(
          extraViewCounts[
            lessonView._id
          ] || 1
        );

      setBusyAction(
        `add-${lessonView._id}`
      );

      setError("");
      setSuccess("");

      try {
        const result =
          await addAdminLessonViews({
            studentId,

            lessonId:
              lessonView.lesson
                ?._id ||
              lessonView.lesson,

            count,
          });

        setSuccess(
          result.message ||
            "Additional views granted."
        );

        await loadStudent();
      } catch (requestError) {
        setError(
          requestError.message ||
            "Additional views could not be granted."
        );
      } finally {
        setBusyAction("");
      }
    };

  const resetViews =
    async (lessonView) => {
      if (
        !window.confirm(
          `Reset views for ${lessonView.lesson?.title || "this lesson"}?`
        )
      ) {
        return;
      }

      setBusyAction(
        `reset-${lessonView._id}`
      );

      setError("");
      setSuccess("");

      try {
        const result =
          await resetAdminLessonViews({
            studentId,

            lessonId:
              lessonView.lesson
                ?._id ||
              lessonView.lesson,
          });

        setSuccess(
          result.message ||
            "Lesson views reset."
        );

        await loadStudent();
      } catch (requestError) {
        setError(
          requestError.message ||
            "Lesson views could not be reset."
        );
      } finally {
        setBusyAction("");
      }
    };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-10 w-72 animate-pulse rounded-xl bg-slate-200" />

        <div className="mt-8 h-[42rem] animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <StatusMessage variant="error">
          {error ||
            "Student not found."}
        </StatusMessage>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/admin/students"
        className="text-sm font-black text-brand-700 hover:text-brand-900"
      >
        ← Return to students
      </Link>

      <div className="mt-6">
        <AdminPageHeader
          eyebrow="Student review"
          title={`${student.firstName} ${student.lastName}`}
          description={student.email}
          action={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() => {
                  const action = student.isActive ? "disable" : "enable";

                  if (window.confirm(`${action} this student account?`)) {
                    void toggleAccount();
                  }
                }}
                className={[
                  "rounded-2xl px-6 py-3 text-sm font-black disabled:opacity-50",
                  student.isActive
                    ? "bg-amber-600 text-white"
                    : "bg-emerald-600 text-white",
                ].join(" ")}
              >
                {student.isActive ? "Disable account" : "Enable account"}
              </button>

              {!student.isActive && (
                <button
                  type="button"
                  disabled={Boolean(busyAction)}
                  onClick={() => void deleteStudent()}
                  className="rounded-2xl bg-red-700 px-6 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {busyAction === "delete-account" ? "Deleting…" : "Delete permanently"}
                </button>
              )}
            </div>
          }
        />
      </div>

      <div className="mt-7 space-y-4">
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
      </div>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black text-slate-950">
          Account information
        </h2>

        <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
              Status
            </dt>

            <dd className="mt-2">
              <StatusBadge
                status={
                  student.isActive
                    ? "active"
                    : "closed"
                }
                label={
                  student.isActive
                    ? "Active"
                    : "Disabled"
                }
              />
            </dd>
          </div>

          <div>
            <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
              Email verified
            </dt>

            <dd className="mt-2 font-bold text-slate-950">
              {student.isEmailVerified
                ? "Yes"
                : "No"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
              NIC number
            </dt>

            <dd className="mt-2 font-bold text-slate-950">
              {student.nicNumber ||
                "—"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
              Mobile
            </dt>

            <dd className="mt-2 font-bold text-slate-950">
              {student.mobileNumber ||
                "—"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
              School
            </dt>

            <dd className="mt-2 font-bold text-slate-950">
              {student.school ||
                "—"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
              City
            </dt>

            <dd className="mt-2 font-bold text-slate-950">
              {student.city ||
                "—"}
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
              Zoom email
            </dt>

            <dd className="mt-2 break-all font-bold text-slate-950">
              {student.zoomEmail ||
                "—"}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-7 grid gap-7 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-black text-slate-950">
              NIC document
            </h2>

            <StatusBadge
              status={
                nicDocument
                  ?.verificationStatus ||
                "not_uploaded"
              }
            />
          </div>

          <div className="mt-6 flex min-h-80 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            {previewUrl ? (
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="flex h-full min-h-80 w-full cursor-zoom-in items-center justify-center"
                aria-label="Open full NIC image"
              >
                <img
                  src={previewUrl}
                  alt="Private student NIC"
                  className="max-h-[34rem] max-w-full object-contain"
                />
              </button>
            ) : (
              <p className="text-sm font-semibold text-slate-500">
                No NIC image uploaded
              </p>
            )}
          </div>

          {previewUrl && (
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="mt-3 w-full rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm font-black text-brand-700"
            >
              Open full NIC image
            </button>
          )}

          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                File
              </dt>

              <dd className="mt-2 break-all font-bold text-slate-950">
                {nicDocument
                  ?.originalFileName ||
                  "—"}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                Size
              </dt>

              <dd className="mt-2 font-bold text-slate-950">
                {formatFileSize(
                  nicDocument?.sizeBytes
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                Uploaded
              </dt>

              <dd className="mt-2 font-bold text-slate-950">
                {formatDateTime(
                  nicDocument?.uploadedAt
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                Reviewed
              </dt>

              <dd className="mt-2 font-bold text-slate-950">
                {formatDateTime(
                  nicDocument?.reviewedAt
                )}
              </dd>
            </div>
          </dl>

          {nicDocument
            ?.verificationNote && (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {
                nicDocument.verificationNote
              }
            </div>
          )}
        </section>

        <section className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-black text-slate-950">
            NIC decision
          </h2>

          {!nicDocument?.hasImage ? (
            <p className="mt-4 text-sm text-slate-500">
              This student has not
              uploaded a NIC image.
            </p>
          ) : (
            <>
              <label className="mt-6 block text-sm font-bold text-slate-800">
                Rejection reason
              </label>

              <textarea
                value={nicNote}
                onChange={(event) =>
                  setNicNote(
                    event.target.value
                  )
                }
                rows={5}
                placeholder="Required when rejecting."
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3.5"
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={
                    Boolean(busyAction)
                  }
                  onClick={() =>
                    decideNic(
                      "verified"
                    )
                  }
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {busyAction ===
                  "nic-verified"
                    ? "Verifying…"
                    : "Verify NIC"}
                </button>

                <button
                  type="button"
                  disabled={
                    Boolean(busyAction)
                  }
                  onClick={() =>
                    decideNic(
                      "rejected"
                    )
                  }
                  className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {busyAction ===
                  "nic-rejected"
                    ? "Rejecting…"
                    : "Reject NIC"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black text-slate-950">
          Lesson playback usage
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Grant additional viewing
          opportunities or reset a
          student’s lesson usage.
        </p>

        {lessonViews.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No playback records"
              description="This student has not started a controlled lesson session."
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {lessonViews.map(
              (lessonView) => {
                const totalAllowed =
                  Number(
                    lessonView.lesson
                      ?.maxViews || 0
                  ) +
                  Number(
                    lessonView.extraViews ||
                      0
                  );

                return (
                  <article
                    key={
                      lessonView._id
                    }
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          {lessonView.activeSession && (
                            <StatusBadge
                              status="pending"
                              label="Active session"
                            />
                          )}

                          <StatusBadge
                            status={
                              lessonView.viewsUsed >=
                              totalAllowed
                                ? "closed"
                                : "active"
                            }
                            label={`${lessonView.viewsUsed || 0}/${totalAllowed} used`}
                          />
                        </div>

                        <h3 className="mt-3 font-black text-slate-950">
                          {lessonView.lesson
                            ?.title ||
                            "Lesson unavailable"}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {lessonView.course
                            ?.code ||
                            "Course"}{" "}
                          · Extra views:{" "}
                          {lessonView.extraViews ||
                            0}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-end gap-2">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wide text-slate-500">
                            Extra views
                          </label>

                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={
                              extraViewCounts[
                                lessonView._id
                              ] || "1"
                            }
                            onChange={(event) =>
                              setExtraViewCounts(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  [lessonView._id]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            className="mt-1 w-24 rounded-xl border border-slate-300 px-3 py-2"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={
                            Boolean(
                              busyAction
                            )
                          }
                          onClick={() =>
                            addViews(
                              lessonView
                            )
                          }
                          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                        >
                          Add views
                        </button>

                        <button
                          type="button"
                          disabled={
                            Boolean(
                              busyAction
                            )
                          }
                          onClick={() =>
                            resetViews(
                              lessonView
                            )
                          }
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 disabled:opacity-50"
                        >
                          Reset usage
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        url={previewUrl}
        contentType={nicDocument?.mimeType || "image/*"}
        title="Private student NIC"
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}
