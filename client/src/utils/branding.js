export const getBrandInitials = (
  platformName
) => {
  const name = String(
    platformName || "Accounting With Udara"
  ).trim();

  const capitalLetters =
    name.match(/[A-Z]/g)?.join("") || "";

  if (capitalLetters.length >= 2) {
    return capitalLetters.slice(0, 2);
  }

  const words = name
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase() || "AL";
};
