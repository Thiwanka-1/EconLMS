export const formatCurrency = (
  amount,
  currency = "LKR"
) => {
  const numericAmount =
    Number(amount);

  if (
    !Number.isFinite(
      numericAmount
    )
  ) {
    return "—";
  }

  const normalizedCurrency =
    String(
      currency || "LKR"
    ).toUpperCase();

  try {
    return new Intl.NumberFormat(
      "en-LK",
      {
        style: "currency",
        currency:
          normalizedCurrency,
        maximumFractionDigits: 2,
      }
    ).format(numericAmount);
  } catch {
    return `${normalizedCurrency} ${numericAmount.toFixed(
      2
    )}`;
  }
};

export const formatDateTime = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-LK",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
};

export const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-LK",
    {
      dateStyle: "medium",
    }
  );
};

export const formatFileSize = (
  bytes
) => {
  const size =
    Number(bytes);

  if (
    !Number.isFinite(size) ||
    size < 0
  ) {
    return "—";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (
    size <
    1024 * 1024
  ) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    (1024 * 1024)
  ).toFixed(1)} MB`;
};
