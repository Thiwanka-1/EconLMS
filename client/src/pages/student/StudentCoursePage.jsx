import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router";

import {
  getCurrentCourseBillingPeriod,
  getPublishedCourse,
} from "../../api/courseApi.js";

import {
  getMyCourseAccess,
  submitCoursePaymentSlip,
} from "../../api/enrollmentApi.js";

import {
  getMyPayments,
} from "../../api/paymentApi.js";

import {
  getStudentPlatformSettings,
} from "../../api/settingsApi.js";

import EmptyState from "../../components/common/EmptyState.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatFileSize,
} from "../../utils/formatters.js";

const isSameId = (
  first,
  second
) => {
  const firstId =
    first?._id ||
    first;

  const secondId =
    second?._id ||
    second;

  return (
    Boolean(
      firstId &&
        secondId
    ) &&
    String(firstId) ===
      String(secondId)
  );
};

const getPaymentReason = (
  payment
) => {
  return (
    payment?.reviewNote ||
    payment?.rejectionReason ||
    payment?.reason ||
    ""
  );
};

export default function StudentCoursePage() {
  const {
    identifier,
  } = useParams();

  const [course, setCourse] =
    useState(null);

  const [access, setAccess] =
    useState(null);

  const [
    billingPeriod,
    setBillingPeriod,
  ] = useState(null);

  const [
    paymentDetails,
    setPaymentDetails,
  ] = useState(null);

  const [payments, setPayments] =
    useState([]);

  const [
    selectedFile,
    setSelectedFile,
  ] = useState(null);

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

  const loadCourse =
    useCallback(
      async ({
        showLoading = true,
      } = {}) => {
        setError("");

        if (showLoading) {
          setIsLoading(true);
        }

        try {
          const courseResult =
            await getPublishedCourse(
              identifier
            );

          const loadedCourse =
            courseResult.course;

          const requests = [
            getMyCourseAccess(
              loadedCourse._id
            ),

            getMyPayments({
              courseId:
                loadedCourse._id,
            }),

            getStudentPlatformSettings(),
          ];

          if (
            loadedCourse.paymentPlan ===
            "monthly"
          ) {
            requests.push(
              getCurrentCourseBillingPeriod(
                loadedCourse._id
              )
            );
          }

          const results =
            await Promise.all(
              requests
            );

          const [
            accessResult,
            paymentResult,
            settingsResult,
            billingResult,
          ] = results;

          setCourse(
            loadedCourse
          );

          setAccess(
            accessResult
          );

          setPayments(
            paymentResult
              .paymentSubmissions || []
          );

          setPaymentDetails(
            settingsResult.settings
              ?.paymentDetails || null
          );

          setBillingPeriod(
            billingResult
              ?.billingPeriod || null
          );
        } catch (requestError) {
          setError(
            requestError.message ||
              "The course could not be loaded."
          );
        } finally {
          if (showLoading) {
            setIsLoading(false);
          }
        }
      },
      [identifier]
    );

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const relevantPayments =
    useMemo(() => {
      if (!course) {
        return [];
      }

      if (
        course.paymentPlan ===
        "monthly"
      ) {
        if (!billingPeriod) {
          return [];
        }

        return payments.filter(
          (payment) =>
            isSameId(
              payment.billingPeriod,
              billingPeriod
            )
        );
      }

      return payments.filter(
        (payment) =>
          !payment.billingPeriod
      );
    }, [
      course,
      payments,
      billingPeriod,
    ]);

  const pendingPayment =
    relevantPayments.find(
      (payment) =>
        payment.status ===
        "pending"
    );

  const latestRelevantPayment =
    relevantPayments[0] ||
    null;

  const paymentDeadlinePassed =
    Boolean(
      billingPeriod
        ?.paymentDeadline &&
        new Date() >
          new Date(
            billingPeriod.paymentDeadline
          )
    );

  const monthlyPaymentOpen =
    course?.paymentPlan !==
      "monthly" ||
    Boolean(
      billingPeriod &&
        billingPeriod.isPublished &&
        billingPeriod.isPaymentOpen &&
        !billingPeriod.isArchived &&
        !paymentDeadlinePassed
    );

  const enrollmentBlocked =
    [
      "suspended",
      "cancelled",
    ].includes(
      access?.enrollmentStatus
    );

  const canUpload =
    Boolean(
      course &&
        course.isEnrollmentOpen &&
        !access?.hasAccess &&
        !pendingPayment &&
        !enrollmentBlocked &&
        monthlyPaymentOpen
    );

  const handleFileChange = (
    event
  ) => {
    setError("");
    setSuccess("");

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
        "application/pdf",
      ]);

    if (
      !allowedTypes.has(
        file.type
      )
    ) {
      event.target.value = "";

      setSelectedFile(null);

      setError(
        "Payment slips must be JPG, PNG or PDF files."
      );

      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedFile) {
      setError(
        "Select a payment slip first."
      );

      return;
    }

    if (!course?._id) {
      setError(
        "Course information is unavailable."
      );

      return;
    }

    setError("");
    setSuccess("");
    setIsUploading(true);

    try {
      const result =
        await submitCoursePaymentSlip({
          courseId: course._id,
          file: selectedFile,
        });

      setSelectedFile(null);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      setSuccess(
        result.message ||
          "Payment slip uploaded successfully."
      );

      await loadCourse({
        showLoading: false,
      });
    } catch (requestError) {
      setError(
        requestError.message ||
          "The payment slip could not be uploaded."
      );
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-10 w-80 animate-pulse rounded-xl bg-slate-200" />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="h-[38rem] animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-[38rem] animate-pulse rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <StatusMessage variant="error">
          {error ||
            "The course could not be found."}
        </StatusMessage>

        <Link
          to="/student/courses"
          className="mt-6 inline-flex rounded-2xl bg-brand-600 px-6 py-3 text-sm font-black text-white"
        >
          Return to courses
        </Link>
      </div>
    );
  }

  const requiredAmount =
    course.paymentPlan ===
    "monthly"
      ? billingPeriod?.amount
      : course.price;

  const requiredCurrency =
    course.paymentPlan ===
    "monthly"
      ? billingPeriod?.currency
      : course.currency;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/student/courses"
        className="text-sm font-black text-brand-700 transition hover:text-brand-900"
      >
        ← Back to courses
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.17em] text-brand-700">
            {course.code}
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {course.title}
          </h1>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            {course.shortDescription ||
              course.description ||
              "Course information"}
          </p>
        </div>

        <StatusBadge
          status={
            access?.hasAccess
              ? "active"
              : access
                  ?.enrollmentStatus ||
                "not_enrolled"
          }
          label={
            access?.hasAccess
              ? "Access active"
              : undefined
          }
        />
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

        <StatusMessage
          variant={
            access?.hasAccess
              ? "success"
              : "info"
          }
        >
          {access?.reason ||
            "Course access information is unavailable."}
        </StatusMessage>

        {latestRelevantPayment
          ?.status ===
          "rejected" && (
          <StatusMessage variant="error">
            <strong>
              Payment not approved:
            </strong>{" "}
            {getPaymentReason(
              latestRelevantPayment
            ) ||
              "Review the payment details and upload a clearer slip."}
          </StatusMessage>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {course.thumbnailUrl ? (
              <img
                src={
                  course.thumbnailUrl
                }
                alt=""
                className="max-h-96 w-full object-cover"
              />
            ) : (
              <div className="flex h-64 items-center justify-center bg-gradient-to-br from-brand-100 via-brand-50 to-slate-100">
                <span className="text-6xl font-black text-brand-700">
                  {String(
                    course.code ||
                      "EL"
                  )
                    .slice(0, 3)
                    .toUpperCase()}
                </span>
              </div>
            )}

            <div className="p-6 sm:p-8">
              <dl className="grid gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Subject
                  </dt>

                  <dd className="mt-2 font-bold text-slate-950">
                    {course.subject ||
                      "Economics"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Academic level
                  </dt>

                  <dd className="mt-2 font-bold text-slate-950">
                    {course.academicLevel ||
                      "—"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Category
                  </dt>

                  <dd className="mt-2 capitalize font-bold text-slate-950">
                    {course.category ||
                      "—"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Payment plan
                  </dt>

                  <dd className="mt-2 font-bold text-slate-950">
                    {course.paymentPlan ===
                    "monthly"
                      ? "Monthly"
                      : "One-time"}
                  </dd>
                </div>
              </dl>

              {course.description && (
                <div className="mt-8 border-t border-slate-100 pt-7">
                  <h2 className="text-xl font-black text-slate-950">
                    About this course
                  </h2>

                  <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">
                    {course.description}
                  </p>
                </div>
              )}

              {course.weeklySchedule
                ?.length > 0 && (
                <div className="mt-8 border-t border-slate-100 pt-7">
                  <h2 className="text-xl font-black text-slate-950">
                    Weekly schedule
                  </h2>

                  <div className="mt-4 space-y-3">
                    {course.weeklySchedule.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={
                            item._id ||
                            `${item.day}-${index}`
                          }
                          className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
                        >
                          {item.day ||
                            item.label ||
                            "Class"}{" "}
                          {item.startTime &&
                            `· ${item.startTime}`}
                          {item.endTime &&
                            ` – ${item.endTime}`}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-black text-slate-950">
                Payment history
              </h2>

              <Link
                to="/student/payments"
                className="text-sm font-black text-brand-700 hover:text-brand-900"
              >
                View all payments
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {payments.length === 0 ? (
                <EmptyState
                  title="No payment submissions"
                  description="No payment slip has been submitted for this course."
                />
              ) : (
                payments.map(
                  (payment) => (
                    <article
                      key={payment._id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-black text-slate-950">
                            {payment
                              .billingPeriod
                              ?.label ||
                              "One-time course payment"}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Attempt{" "}
                            {payment.attemptNumber ||
                              1}{" "}
                            ·{" "}
                            {formatDateTime(
                              payment.createdAt
                            )}
                          </p>
                        </div>

                        <StatusBadge
                          status={
                            payment.status
                          }
                        />
                      </div>

                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <p className="text-slate-600">
                          Amount:{" "}
                          <strong className="text-slate-950">
                            {formatCurrency(
                              payment.expectedAmount ??
                                payment.amount,
                              payment.currency ||
                                payment.expectedCurrency
                            )}
                          </strong>
                        </p>

                        <p className="text-slate-600">
                          File:{" "}
                          <strong className="break-all text-slate-950">
                            {payment.originalFileName ||
                              "Payment slip"}
                          </strong>
                        </p>
                      </div>

                      {payment.status ===
                        "rejected" && (
                        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                          {getPaymentReason(
                            payment
                          ) ||
                            "The payment could not be approved."}
                        </p>
                      )}
                    </article>
                  )
                )
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-black text-slate-950">
              Payment requirement
            </h2>

            {course.paymentPlan ===
              "monthly" && (
              <div className="mt-5 rounded-2xl bg-brand-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-700">
                  Current period
                </p>

                <p className="mt-2 text-xl font-black text-slate-950">
                  {billingPeriod
                    ?.label || "—"}
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  Deadline:{" "}
                  <strong>
                    {formatDate(
                      billingPeriod
                        ?.paymentDeadline
                    )}
                  </strong>
                </p>
              </div>
            )}

            <p className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">
              Amount due
            </p>

            <p className="mt-2 text-3xl font-black text-slate-950">
              {formatCurrency(
                requiredAmount,
                requiredCurrency
              )}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge
                status={
                  course
                    .isEnrollmentOpen
                    ? "open"
                    : "closed"
                }
                label={
                  course
                    .isEnrollmentOpen
                    ? "Enrolment open"
                    : "Enrolment closed"
                }
              />

              {course.paymentPlan ===
                "monthly" && (
                <StatusBadge
                  status={
                    monthlyPaymentOpen
                      ? "open"
                      : "closed"
                  }
                  label={
                    monthlyPaymentOpen
                      ? "Payment open"
                      : "Payment closed"
                  }
                />
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-black text-slate-950">
              Bank-transfer details
            </h2>

            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">
                  Bank
                </dt>

                <dd className="mt-1 font-bold text-slate-950">
                  {paymentDetails
                    ?.bankName || "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">
                  Account name
                </dt>

                <dd className="mt-1 font-bold text-slate-950">
                  {paymentDetails
                    ?.accountName ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">
                  Account number
                </dt>

                <dd className="mt-1 break-all font-bold text-slate-950">
                  {paymentDetails
                    ?.accountNumber ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">
                  Branch
                </dt>

                <dd className="mt-1 font-bold text-slate-950">
                  {paymentDetails
                    ?.branchName || "—"}
                </dd>
              </div>
            </dl>

            {paymentDetails
              ?.instructions && (
              <p className="mt-5 whitespace-pre-line rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {
                  paymentDetails.instructions
                }
              </p>
            )}

            {paymentDetails
              ?.paymentReferenceNote && (
              <p className="mt-4 text-sm font-semibold leading-6 text-brand-800">
                {
                  paymentDetails.paymentReferenceNote
                }
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-black text-slate-950">
              Upload payment slip
            </h2>

            {access?.hasAccess ? (
              <StatusMessage variant="success">
                Payment approval is
                complete for the current
                access requirement.
              </StatusMessage>
            ) : pendingPayment ? (
              <div className="mt-5">
                <StatusMessage variant="warning">
                  A payment slip is already
                  pending administrator
                  review.
                </StatusMessage>
              </div>
            ) : enrollmentBlocked ? (
              <div className="mt-5">
                <StatusMessage variant="error">
                  This enrolment cannot
                  currently accept payments.
                </StatusMessage>
              </div>
            ) : !course
                .isEnrollmentOpen ? (
              <div className="mt-5">
                <StatusMessage variant="warning">
                  Course enrolment is
                  currently closed.
                </StatusMessage>
              </div>
            ) : !monthlyPaymentOpen ? (
              <div className="mt-5">
                <StatusMessage variant="warning">
                  Payments are currently
                  closed for this billing
                  period.
                </StatusMessage>
              </div>
            ) : null}

            <form
              onSubmit={handleUpload}
              className="mt-5"
            >
              <label
                htmlFor="paymentSlip"
                className="block text-sm font-bold text-slate-800"
              >
                Payment slip
              </label>

              <input
                ref={fileInputRef}
                id="paymentSlip"
                name="paymentSlip"
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={
                  handleFileChange
                }
                disabled={
                  isUploading ||
                  !canUpload
                }
                className="mt-3 block w-full rounded-2xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-100 file:px-4 file:py-2 file:text-sm file:font-black file:text-brand-800 hover:file:bg-brand-200 disabled:cursor-not-allowed disabled:opacity-50"
              />

              {selectedFile && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="break-all text-sm font-bold text-slate-950">
                    {selectedFile.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatFileSize(
                      selectedFile.size
                    )}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isUploading ||
                  !canUpload ||
                  !selectedFile
                }
                className="mt-5 w-full rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading
                  ? "Uploading payment…"
                  : "Submit payment slip"}
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
