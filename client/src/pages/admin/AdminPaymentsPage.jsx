import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router";

import {
  approveAdminPayment,
  deleteAdminRejectedPayment,
  getAdminPayment,
  getAdminPaymentFile,
  getAdminPayments,
  rejectAdminPayment,
} from "../../api/paymentAdminApi.js";

import AdminPageHeader from "../../components/common/AdminPageHeader.jsx";
import DocumentPreviewModal from "../../components/common/DocumentPreviewModal.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";

import {
  formatCurrency,
  formatDateTime,
  formatFileSize,
} from "../../utils/formatters.js";

export default function AdminPaymentsPage() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const [payments, setPayments] =
    useState([]);

  const [pagination, setPagination] =
    useState({
      currentPage: 1,
      totalPages: 1,
    });

  const [statusFilter, setStatusFilter] =
    useState("pending");

  const [
    selectedPayment,
    setSelectedPayment,
  ] = useState(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [
    previewType,
    setPreviewType,
  ] = useState("");

  const [reviewNote, setReviewNote] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    isLoadingDetail,
    setIsLoadingDetail,
  ] = useState(false);

  const [busyAction, setBusyAction] =
    useState("");

  const [isPreviewOpen, setIsPreviewOpen] =
    useState(false);

  const previewRef =
    useRef("");

  const requestedPaymentHandledRef =
    useRef("");

  const replacePreview =
    useCallback(
      (
        nextUrl,
        nextType = ""
      ) => {
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

        setPreviewType(
          nextType || ""
        );
      },
      []
    );

  const loadPayments =
    useCallback(
      async (page = 1) => {
        setError("");
        setIsLoading(true);

        try {
          const result =
            await getAdminPayments({
              page,
              limit: 20,

              status:
                statusFilter === "all"
                  ? ""
                  : statusFilter,
            });

          setPayments(
            result.paymentSubmissions ||
              []
          );

          setPagination(
            result.pagination || {
              currentPage: page,
              totalPages: 1,
            }
          );
        } catch (requestError) {
          setError(
            requestError.message ||
              "Payments could not be loaded."
          );
        } finally {
          setIsLoading(false);
        }
      },
      [statusFilter]
    );

  useEffect(() => {
    loadPayments(1);
  }, [loadPayments]);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(
          previewRef.current
        );
      }
    };
  }, []);

  const openPayment =
    useCallback(async (paymentId) => {
      setError("");
      setSuccess("");
      setReviewNote("");
      setIsLoadingDetail(true);
      replacePreview("");

      try {
        const detailResult =
          await getAdminPayment(
            paymentId
          );

        setSelectedPayment(
          detailResult.paymentSubmission
        );

        const fileResult =
          await getAdminPaymentFile(
            paymentId
          );

        const objectUrl =
          URL.createObjectURL(
            fileResult.blob
          );

        replacePreview(
          objectUrl,
          fileResult.contentType
        );
      } catch (requestError) {
        setError(
          requestError.message ||
            "Payment details could not be loaded."
        );
      } finally {
        setIsLoadingDetail(false);
      }
    }, [replacePreview]);

  const requestedPaymentId =
    searchParams.get("paymentId") || "";

  useEffect(() => {
    if (
      requestedPaymentId &&
      requestedPaymentHandledRef.current !== requestedPaymentId
    ) {
      requestedPaymentHandledRef.current = requestedPaymentId;
      void openPayment(requestedPaymentId);
    }
  }, [
    openPayment,
    requestedPaymentId,
  ]);

  const closePayment = () => {
    setIsPreviewOpen(false);
    setSelectedPayment(null);
    setReviewNote("");
    replacePreview("");
    requestedPaymentHandledRef.current = "";
    setSearchParams({}, { replace: true });
  };

  const decidePayment =
    async (decision) => {
      if (!selectedPayment) {
        return;
      }

      if (
        decision === "reject" &&
        !reviewNote.trim()
      ) {
        setError(
          "A rejection reason is required."
        );

        return;
      }

      setError("");
      setSuccess("");
      setBusyAction(decision);

      try {
        const result =
          decision === "approve"
            ? await approveAdminPayment({
                paymentId:
                  selectedPayment._id,

                reviewNote:
                  reviewNote.trim(),
              })
            : await rejectAdminPayment({
                paymentId:
                  selectedPayment._id,

                reviewNote:
                  reviewNote.trim(),
              });

        setSuccess(
          result.message ||
            "Payment updated."
        );

        closePayment();

        await loadPayments(
          pagination.currentPage
        );
      } catch (requestError) {
        setError(
          requestError.message ||
            "The payment decision failed."
        );
      } finally {
        setBusyAction("");
      }
    };

  const deleteRejectedPayment = async () => {
    if (!selectedPayment || selectedPayment.status !== "rejected") {
      return;
    }

    const confirmation = window.prompt(
      "Permanently delete this rejected payment and its uploaded Google Drive slip? Enter DELETE to confirm."
    );

    if (confirmation === null) {
      return;
    }

    setError("");
    setSuccess("");
    setBusyAction("delete");

    try {
      const result = await deleteAdminRejectedPayment(
        selectedPayment._id,
        confirmation
      );

      closePayment();
      setSuccess(result.message || "Rejected payment permanently deleted.");
      await loadPayments(pagination.currentPage);
    } catch (requestError) {
      setError(
        requestError.message || "The rejected payment could not be deleted."
      );
    } finally {
      setBusyAction("");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Payment administration"
        title="Payment submissions"
        description="Inspect private payment slips and approve or reject pending submissions."
      />

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

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="font-black text-slate-950">
          Payment queue
        </p>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
        >
          <option value="pending">
            Pending
          </option>

          <option value="approved">
            Approved
          </option>

          <option value="rejected">
            Rejected
          </option>

          <option value="all">
            All payments
          </option>
        </select>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({
                length: 5,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-3xl bg-slate-200"
                />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <EmptyState
              title="No payment submissions"
              description="No payments match the selected status."
            />
          ) : (
            <div className="space-y-4">
              {payments.map(
                (payment) => (
                  <button
                    key={payment._id}
                    type="button"
                    onClick={() =>
                      openPayment(
                        payment._id
                      )
                    }
                    className={[
                      "w-full rounded-3xl border bg-white p-5 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md",
                      selectedPayment
                        ?._id ===
                      payment._id
                        ? "border-brand-400 ring-4 ring-brand-100"
                        : "border-slate-200",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.13em] text-brand-700">
                          {payment.course
                            ?.code ||
                            "Payment"}
                        </p>

                        <p className="mt-2 font-black text-slate-950">
                          {payment.student
                            ?.firstName}{" "}
                          {payment.student
                            ?.lastName}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {payment.course
                            ?.title ||
                            "Course unavailable"}
                        </p>
                      </div>

                      <StatusBadge
                        status={
                          payment.status
                        }
                      />
                    </div>

                    <p className="mt-4 text-sm font-bold text-slate-700">
                      {formatCurrency(
                        payment.expectedAmount,
                        payment.currency
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(
                        payment.createdAt
                      )}
                    </p>
                  </button>
                )
              )}
            </div>
          )}

          <Pagination
            currentPage={
              pagination.currentPage
            }
            totalPages={
              pagination.totalPages
            }
            disabled={isLoading}
            onPageChange={
              loadPayments
            }
          />
        </section>

        <section className="min-h-[32rem] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {isLoadingDetail ? (
            <div className="h-[30rem] animate-pulse rounded-2xl bg-slate-200" />
          ) : !selectedPayment ? (
            <EmptyState
              title="Select a payment"
              description="Choose a payment submission to inspect its details and private file."
            />
          ) : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-700">
                    Payment review
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {
                      selectedPayment
                        .student
                        ?.firstName
                    }{" "}
                    {
                      selectedPayment
                        .student
                        ?.lastName
                    }
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {
                      selectedPayment
                        .course?.title
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePayment}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-600"
                >
                  Close
                </button>
              </div>

              <dl className="mt-7 grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Student email
                  </dt>

                  <dd className="mt-2 break-all font-bold text-slate-950">
                    {
                      selectedPayment
                        .student?.email
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                    NIC number
                  </dt>

                  <dd className="mt-2 font-bold text-slate-950">
                    {
                      selectedPayment
                        .student
                        ?.nicNumber
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Billing period
                  </dt>

                  <dd className="mt-2 font-bold text-slate-950">
                    {selectedPayment
                      .billingPeriod
                      ?.label ||
                      "One-time payment"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Amount
                  </dt>

                  <dd className="mt-2 font-bold text-slate-950">
                    {formatCurrency(
                      selectedPayment.expectedAmount,
                      selectedPayment.currency
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                    File name
                  </dt>

                  <dd className="mt-2 break-all font-bold text-slate-950">
                    {
                      selectedPayment.originalFileName
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                    File size
                  </dt>

                  <dd className="mt-2 font-bold text-slate-950">
                    {formatFileSize(
                      selectedPayment.sizeBytes
                    )}
                  </dd>
                </div>
              </dl>

              <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                {previewUrl &&
                previewType.includes(
                  "pdf"
                ) ? (
                  <iframe
                    src={previewUrl}
                    title="Private payment slip"
                    className="h-[32rem] w-full"
                  />
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Private payment slip"
                    className="max-h-[32rem] w-full object-contain"
                  />
                ) : (
                  <div className="flex h-80 items-center justify-center text-sm font-semibold text-slate-500">
                    File preview unavailable
                  </div>
                )}
              </div>

              {previewUrl && (
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="mt-3 w-full rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm font-black text-brand-700"
                >
                  Open full payment slip
                </button>
              )}

              {selectedPayment.status ===
                "pending" && (
                <div className="mt-7">
                  <label className="mb-2 block text-sm font-bold text-slate-800">
                    Review note
                  </label>

                  <textarea
                    value={reviewNote}
                    onChange={(event) =>
                      setReviewNote(
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="Required when rejecting; optional when approving."
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3.5"
                  />

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={
                        Boolean(
                          busyAction
                        )
                      }
                      onClick={() =>
                        decidePayment(
                          "approve"
                        )
                      }
                      className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                      {busyAction ===
                      "approve"
                        ? "Approving…"
                        : "Approve payment"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        Boolean(
                          busyAction
                        )
                      }
                      onClick={() =>
                        decidePayment(
                          "reject"
                        )
                      }
                      className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                      {busyAction ===
                      "reject"
                        ? "Rejecting…"
                        : "Reject payment"}
                    </button>
                  </div>
                </div>
              )}

              {selectedPayment.reviewNote && (
                <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Existing review note
                  </p>

                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                    {
                      selectedPayment.reviewNote
                    }
                  </p>
                </div>
              )}

              {selectedPayment.status === "rejected" && (
                <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-5">
                  <p className="text-sm leading-6 text-red-800">
                    Deleting removes both this rejected record and its uploaded
                    payment slip. Approved and pending payments cannot be
                    individually deleted.
                  </p>

                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={() => void deleteRejectedPayment()}
                    className="mt-4 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    {busyAction === "delete"
                      ? "Deleting…"
                      : "Delete rejected payment"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        url={previewUrl}
        contentType={previewType}
        title="Private payment slip"
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
}
