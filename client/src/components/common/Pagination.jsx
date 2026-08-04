export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}) {
  const safeCurrentPage =
    Math.max(
      Number(currentPage) || 1,
      1
    );

  const safeTotalPages =
    Math.max(
      Number(totalPages) || 1,
      1
    );

  if (safeTotalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm font-semibold text-slate-500">
        Page {safeCurrentPage} of{" "}
        {safeTotalPages}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={
            disabled ||
            safeCurrentPage <= 1
          }
          onClick={() =>
            onPageChange(
              safeCurrentPage - 1
            )
          }
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <button
          type="button"
          disabled={
            disabled ||
            safeCurrentPage >=
              safeTotalPages
          }
          onClick={() =>
            onPageChange(
              safeCurrentPage + 1
            )
          }
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}