import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getMyPayments,
} from "../../api/paymentApi.js";

import EmptyState from "../../components/common/EmptyState.jsx";
import StatusBadge from "../../components/common/StatusBadge.jsx";
import StatusMessage from "../../components/common/StatusMessage.jsx";

import {
  formatCurrency,
  formatDateTime,
  formatFileSize,
} from "../../utils/formatters.js";

const getPaymentReason = (
  payment
) => {
  return (
    payment.reviewNote ||
    payment.rejectionReason ||
    payment.reason ||
    ""
  );
};

export default function StudentPaymentsPage() {
  const [payments, setPayments] =
    useState([]);

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [error, setError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const loadPayments =
    useCallback(async () => {
      setError("");
      setIsLoading(true);

      try {
        const result =
          await getMyPayments();

        setPayments(
          result.paymentSubmissions ||
            []
        );
      } catch (requestError) {
        setError(
          requestError.message ||
            "Payment history could not be loaded."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const filteredPayments =
    useMemo(() => {
      if (
        statusFilter === "all"
      ) {
        return payments;
      }

      return payments.filter(
        (payment) =>
          payment.status ===
          statusFilter
      );
    }, [
      payments,
      statusFilter,
    ]);

  const statusCounts =
    useMemo(() => {
      return payments.reduce(
        (counts, payment) => {
          counts[payment.status] =
            (counts[
              payment.status
            ] || 0) + 1;

          return counts;
        },
        {
          pending: 0,
          approved: 0,
          rejected: 0,
        }
      );
    }, [payments]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.17em] text-brand-700">
          Student payments
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Payment history
        </h1>

        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Review submitted payment
          slips, administrator decisions
          and approved course access.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Pending",
            value:
              statusCounts.pending,
            status: "pending",
          },
          {
            label: "Approved",
            value:
              statusCounts.approved,
            status: "approved",
          },
          {
            label: "Rejected",
            value:
              statusCounts.rejected,
            status: "rejected",
          },
        ].map((item) => (
          <article
            key={item.status}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <StatusBadge
              status={item.status}
              label={item.label}
            />

            <p className="mt-4 text-3xl font-black text-slate-950">
              {item.value}
            </p>
          </article>
        ))}
      </section>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-black text-slate-950">
          Submissions
        </h2>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800"
        >
          <option value="all">
            All statuses
          </option>

          <option value="pending">
            Pending
          </option>

          <option value="approved">
            Approved
          </option>

          <option value="rejected">
            Rejected
          </option>
        </select>
      </div>

      {error && (
        <div className="mt-6">
          <StatusMessage variant="error">
            {error}
          </StatusMessage>
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 space-y-4">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-3xl bg-slate-200"
            />
          ))}
        </div>
      ) : filteredPayments.length ===
        0 ? (
        <div className="mt-6">
          <EmptyState
            title="No payment submissions"
            description={
              statusFilter === "all"
                ? "You have not submitted any payment slips yet."
                : `No ${statusFilter} payment submissions were found.`
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredPayments.map(
            (payment) => (
              <article
                key={payment._id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-700">
                      {payment.course
                        ?.code ||
                        "Course payment"}
                    </p>

                    <h3 className="mt-2 text-xl font-black text-slate-950">
                      {payment.course
                        ?.title ||
                        "Course unavailable"}
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      {payment
                        .billingPeriod
                        ?.label ||
                        "One-time payment"}{" "}
                      · Attempt{" "}
                      {payment.attemptNumber ||
                        1}
                    </p>
                  </div>

                  <StatusBadge
                    status={
                      payment.status
                    }
                  />
                </div>

                <dl className="mt-6 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Amount
                    </dt>

                    <dd className="mt-2 font-black text-slate-950">
                      {formatCurrency(
                        payment.expectedAmount ??
                          payment.amount,
                        payment.currency ||
                          payment.expectedCurrency
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Submitted
                    </dt>

                    <dd className="mt-2 text-sm font-bold text-slate-950">
                      {formatDateTime(
                        payment.createdAt
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      File
                    </dt>

                    <dd className="mt-2 break-all text-sm font-bold text-slate-950">
                      {payment.originalFileName ||
                        "Payment slip"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      File size
                    </dt>

                    <dd className="mt-2 text-sm font-bold text-slate-950">
                      {formatFileSize(
                        payment.sizeBytes
                      )}
                    </dd>
                  </div>
                </dl>

                {payment.status ===
                  "approved" && (
                  <div className="mt-5 rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-semibold leading-6 text-emerald-800">
                    Payment approved. The
                    corresponding course
                    access has been granted.
                  </div>
                )}

                {payment.status ===
                  "pending" && (
                  <div className="mt-5 rounded-2xl bg-amber-50 px-5 py-4 text-sm font-semibold leading-6 text-amber-900">
                    This payment is waiting
                    for administrator
                    review.
                  </div>
                )}

                {payment.status ===
                  "rejected" && (
                  <div className="mt-5 rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold leading-6 text-red-800">
                    <strong>
                      Reason:
                    </strong>{" "}
                    {getPaymentReason(
                      payment
                    ) ||
                      "The payment slip could not be verified."}
                  </div>
                )}
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}
