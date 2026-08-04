export const createQueryString = (
  values
) => {
  const query =
    new URLSearchParams();

  for (const [
    key,
    value,
  ] of Object.entries(
    values || {}
  )) {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      continue;
    }

    query.set(
      key,
      String(value)
    );
  }

  const queryString =
    query.toString();

  return queryString
    ? `?${queryString}`
    : "";
};